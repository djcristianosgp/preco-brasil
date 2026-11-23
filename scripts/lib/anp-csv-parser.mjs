export function decodeAnpBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let offset = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3;
  }
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(offset));
  const sample = utf8Text.slice(0, 65536);
  if (sample.includes('\uFFFD')) {
    return new TextDecoder('latin1').decode(bytes.subarray(offset));
  }
  return utf8Text;
}

export function parseCsvRecords(text, delimiter = ';') {
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') {
        i += 1;
      }
      row.push(field.trim());
      if (row.length > 1 || row[0] !== '') {
        records.push(row);
      }
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field.trim());
      if (row.length > 1 || row[0] !== '') {
        records.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.length > 1 || row[0] !== '') {
      records.push(row);
    }
  }

  return records;
}

export function normalizeMunicipalityName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['`’´]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseBrDateToIso(raw) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(raw || '').trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

export function parseBrPrice(raw) {
  const normalized = String(raw || '').trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 500) {
    return null;
  }
  return value;
}

export const ANP_PRODUCT_MAP = {
  GASOLINA: 'gasolina-comum',
  ETANOL: 'etanol',
  'DIESEL S10': 'diesel-s10',
  DIESEL: 'diesel-comum',
  'GASOLINA ADITIVADA': 'gasolina-aditivada',
  GLP: 'glp-13kg',
  GNV: 'gnv',
};
