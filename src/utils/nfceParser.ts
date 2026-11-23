import type { NfceParsedResult } from '@/types/pricing';

const IBGE_UF_MAP: Record<string, string> = {
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF',
};

const SEFAZ_PORTALS: Record<string, string> = {
  AC: 'https://www.sefaznet.ac.gov.br/nfce/consulta',
  AL: 'https://nfce.sefaz.al.gov.br/consultaNFCe.htm',
  AM: 'https://sistemas.sefaz.am.gov.br/nfceweb/formConsulta.do',
  AP: 'https://www.sefaz.ap.gov.br/sate/seg/SEGf_AcessarFuncao.jsp?cdFuncao=FIS_1261',
  BA: 'https://nfe.sefaz.ba.gov.br/servicos/nfce/default.aspx',
  CE: 'https://nfce.sefaz.ce.gov.br/',
  DF: 'https://dec.fazenda.df.gov.br/nfce/',
  ES: 'https://app.sefaz.es.gov.br/ConsultaNFCe/',
  GO: 'https://nfeweb.sefaz.go.gov.br/nfeweb/sites/nfce/consulta-nfce',
  MA: 'https://www.nfce.sefaz.ma.gov.br/portal/consultarnfce.jsp',
  MG: 'https://portalsped.fazenda.mg.gov.br/portalnfce',
  MS: 'https://www.dfe.ms.gov.br/nfce/consulta/',
  MT: 'https://www.sefaz.mt.gov.br/nfce/consultanfce',
  PA: 'https://appnfc.sefa.pa.gov.br/portal/view/consultas/nfce/consultanfce.seam',
  PB: 'https://www.sefaz.pb.gov.br/nfce',
  PE: 'https://nfce.sefaz.pe.gov.br/nfce/consulta',
  PI: 'https://www.sefaz.pi.gov.br/nfce/',
  PR: 'https://www.fazenda.pr.gov.br/nfce/consulta',
  RJ: 'https://www.fazenda.rj.gov.br/nfce/consulta',
  RN: 'https://nfce.set.rn.gov.br/portalDFE/NFCe/ConsultaNFCe.aspx',
  RO: 'https://www.nfce.sefin.ro.gov.br/',
  RR: 'https://www.sefaz.rr.gov.br/nfce/',
  RS: 'https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx',
  SC: 'https://sat.sef.sc.gov.br/nfce/consulta',
  SE: 'https://www.nfce.se.gov.br/portal/painelMonitor.jsp',
  SP: 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica',
  TO: 'https://www.sefaz.to.gov.br/nfce/',
};

export function isNfceInput(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (/^\d{44}$/.test(s.replace(/\s+/g, ''))) return true;
  return /nfce|sefaz|sefin|[?&](p|chNFe)=/i.test(s);
}

export function validateAccessKeyMod11(key: string): boolean {
  if (!/^\d{44}$/.test(key)) return false;
  const checkDigit = Number(key[43]);
  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i -= 1) {
    sum += Number(key[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  const expected = mod === 0 || mod === 1 ? 0 : 11 - mod;
  return expected === checkDigit;
}

export function validateCnpj(rawCnpj: string): boolean {
  const digits = rawCnpj.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const calcDigit = (slice: string, weights: number[]) => {
    const sum = slice
      .split('')
      .reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const d1 = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

export function parseNfceInput(rawInput: string): NfceParsedResult {
  const trimmed = rawInput.trim();
  const errors: string[] = [];
  let accessKey = '';
  let qrVersion = '—';
  let environment: NfceParsedResult['environment'] = 'Não informado';
  let totalValue: number | null = null;
  let hostUrl = '';

  const pMatch = /[?&]p=([^&\s]+)/i.exec(trimmed);
  if (pMatch) {
    const decoded = decodeURIComponent(pMatch[1]);
    const parts = decoded.split('|');
    accessKey = (parts[0] || '').replace(/\D/g, '');
    qrVersion = parts[1] ? `v${parts[1]}` : 'ENCAT';
    environment =
      parts[2] === '1' ? 'Produção' : parts[2] === '2' ? 'Homologação' : 'Não informado';
    if (parts[4] && /^\d+(\.\d+)?$/.test(parts[4])) {
      totalValue = Number(parts[4]);
    }
    const urlHead = trimmed.split('?')[0];
    if (/^https?:\/\//i.test(urlHead)) hostUrl = trimmed;
  } else {
    const chMatch = /(?:chNFe=|[^0-9])(\d{44})(?:[^0-9]|$)/i.exec(` ${trimmed} `);
    if (chMatch) {
      accessKey = chMatch[1];
    } else {
      const digitsOnly = trimmed.replace(/\D/g, '');
      if (digitsOnly.length === 44) accessKey = digitsOnly;
    }
  }

  if (!/^\d{44}$/.test(accessKey)) {
    errors.push('Chave de acesso de 44 dígitos não localizada na URL ou texto informado.');
    return {
      rawInput: trimmed,
      accessKey: '',
      isValidAccessKey: false,
      uf: '',
      ufCode: '',
      sefazUrl: '',
      emissionYearMonth: '',
      cnpj: '',
      cnpjFormatted: '',
      isValidCnpj: false,
      model: '',
      modelLabel: 'Não identificado',
      series: '',
      number: '',
      qrVersion,
      environment,
      totalValue,
      errors,
    };
  }

  const ufCode = accessKey.slice(0, 2);
  const uf = IBGE_UF_MAP[ufCode] || '';
  if (!uf) errors.push(`Código IBGE de UF inválido (${ufCode}).`);

  const yy = accessKey.slice(2, 4);
  const mm = accessKey.slice(4, 6);
  const emissionYearMonth = `${mm}/20${yy}`;
  if (Number(mm) < 1 || Number(mm) > 12) {
    errors.push(`Mês de emissão inválido (${mm}).`);
  }

  const cnpj = accessKey.slice(6, 20);
  const isValidCnpj = validateCnpj(cnpj);
  if (!isValidCnpj) errors.push('CNPJ do emitente reprovado no dígito verificador.');

  const model = accessKey.slice(20, 22);
  const modelLabel =
    model === '65' ? 'NFC-e (Mod. 65)' : model === '55' ? 'NF-e (Mod. 55)' : `Modelo ${model}`;
  const series = String(Number(accessKey.slice(22, 25)));
  const number = String(Number(accessKey.slice(25, 34)));
  const isValidAccessKey = validateAccessKeyMod11(accessKey);
  if (!isValidAccessKey) {
    errors.push('Dígito verificador da chave (Módulo 11) inválido.');
  }

  return {
    rawInput: trimmed,
    accessKey,
    isValidAccessKey,
    uf,
    ufCode,
    sefazUrl: hostUrl || SEFAZ_PORTALS[uf] || 'https://www.nfe.fazenda.gov.br/',
    emissionYearMonth,
    cnpj,
    cnpjFormatted: formatCnpj(cnpj),
    isValidCnpj,
    model,
    modelLabel,
    series,
    number,
    qrVersion,
    environment,
    totalValue,
    errors,
  };
}

export function buildNfceContributionIssueUrl(params: {
  parsed: NfceParsedResult;
  ean: string;
  productName: string;
  price: string;
  unit: string;
  cityName: string;
}): string {
  const payload = {
    accessKey: params.parsed.accessKey,
    uf: params.parsed.uf,
    cnpjEmitente: params.parsed.cnpjFormatted,
    emissao: params.parsed.emissionYearMonth,
    ean13: params.ean.trim() || null,
    produto: params.productName.trim() || 'Item de varejo NFC-e',
    precoPago: Number(params.price.replace(',', '.')) || null,
    unidade: params.unit || 'R$/un',
    municipio: params.cityName.trim() || null,
    sefazUrl: params.parsed.sefazUrl,
  };

  const title = encodeURIComponent(
    `[NFC-e ${params.parsed.uf}] ${payload.produto} - R$ ${params.price || '0,00'}`,
  );
  const body = encodeURIComponent(
    `### Contribuição Auditada de Preço via Cupom Fiscal (NFC-e)\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n\n_Enviado pelo Auditor NFC-e do PreçoBrasil para validação antes da ingestão em \`public/data/community-nfce.json\`._`,
  );
  return `https://github.com/djcristianosgp/preco-brasil/issues/new?labels=price-submission&title=${title}&body=${body}`;
}

export function createSampleNfceQrUrl(): string {
  const base43 = '3526111122233300018165001000001234112345678';
  let sum = 0;
  let weight = 2;
  for (let i = base43.length - 1; i >= 0; i -= 1) {
    sum += Number(base43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  const dv = mod === 0 || mod === 1 ? 0 : 11 - mod;
  return `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=${base43}${dv}|2|1|1|0.00`;
}
