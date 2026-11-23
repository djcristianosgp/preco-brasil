import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Send,
  ShieldAlert,
} from 'lucide-react';
import type { NfceParsedResult } from '@/types/pricing';
import { formatBRL } from '@/utils/formatters';
import {
  buildNfceContributionIssueUrl,
  createSampleNfceQrUrl,
  parseNfceInput,
} from '@/utils/nfceParser';

interface NfceAuditPanelProps {
  initialInput?: string;
  onOpenCamera: () => void;
}

export function NfceAuditPanel({ initialInput, onOpenCamera }: NfceAuditPanelProps) {
  const [rawInput, setRawInput] = useState(initialInput || '');
  const [ean, setEan] = useState('');
  const [productName, setProductName] = useState('');
  const [pricePaid, setPricePaid] = useState('');
  const [cityName, setCityName] = useState('');

  useEffect(() => {
    if (initialInput) {
      setRawInput(initialInput);
    }
  }, [initialInput]);

  const parsed: NfceParsedResult | null = useMemo(() => {
    if (!rawInput.trim()) return null;
    return parseNfceInput(rawInput);
  }, [rawInput]);

  const canBuildContribution = Boolean(parsed?.isValidAccessKey && Number(pricePaid.replace(',', '.')) > 0);

  const contributionUrl =
    parsed && canBuildContribution
      ? buildNfceContributionIssueUrl({
          parsed,
          ean,
          productName,
          price: pricePaid,
          unit: 'R$/un',
          cityName,
        })
      : '';

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Escaneie ou cole o QR Code do cupom fiscal (NFC-e ENCAT v2) ou a chave de 44 dígitos para
        validar o dígito verificador (Módulo 11), consultar o portal SEFAZ estadual e registrar
        preços de supermercado de forma auditável.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Cole a URL do QR Code NFC-e ou os 44 dígitos da chave..."
          aria-label="URL do QR Code ou chave de acesso NFC-e"
          className="h-11 flex-1 rounded-xl border border-input bg-surface-elevated px-3 font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenCamera}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F2942] px-3 text-xs font-medium text-white transition hover:bg-[#173A5C] dark:bg-primary dark:text-slate-950 sm:flex-none"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span>Ler QR</span>
          </button>
          <button
            type="button"
            onClick={() => setRawInput(createSampleNfceQrUrl())}
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-border bg-surface-elevated px-3 text-xs font-medium text-foreground transition hover:bg-accent"
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Exemplo</span>
          </button>
        </div>
      </div>

      {parsed && (
        <div className="space-y-2.5 rounded-xl border border-border bg-surface-elevated/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              {parsed.isValidAccessKey && parsed.errors.length === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>Chave NFC-e Íntegra (Módulo 11 válido)</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>{parsed.errors[0] || 'Chave com inconsistência estrutural'}</span>
                </>
              )}
            </span>
            {parsed.uf && (
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                SEFAZ {parsed.uf} · {parsed.modelLabel}
              </span>
            )}
          </div>

          {parsed.accessKey && (
            <>
              <p className="break-all rounded-lg bg-surface p-2 font-mono text-[10px] text-muted-foreground">
                {parsed.accessKey}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">CNPJ Emitente</p>
                  <p className="font-mono font-semibold text-foreground">
                    {parsed.cnpjFormatted}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Emissão · Série/Nº</p>
                  <p className="font-mono font-semibold text-foreground">
                    {parsed.emissionYearMonth} · {parsed.series}/{parsed.number}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Ambiente · QR</p>
                  <p className="font-semibold text-foreground">
                    {parsed.environment} ({parsed.qrVersion})
                    {parsed.totalValue ? ` · ${formatBRL(parsed.totalValue)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <a
                  href={parsed.sefazUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Abrir Consulta Pública SEFAZ {parsed.uf}</span>
                </a>
              </div>

              <div className="space-y-2 border-t border-border pt-2.5">
                <p className="text-[11px] font-semibold text-foreground">
                  Contribuir Preço Auditado para a Base Aberta (Sem LocalStorage Falso)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    placeholder="EAN-13 do item (opcional)"
                    aria-label="EAN-13 do item no cupom"
                    className="h-9 rounded-lg border border-input bg-surface px-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={pricePaid}
                    onChange={(e) => setPricePaid(e.target.value)}
                    placeholder="Preço pago (ex: 24,90)"
                    aria-label="Preço pago no cupom"
                    className="h-9 rounded-lg border border-input bg-surface px-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Produto (ex: Arroz 5kg)"
                    aria-label="Nome do produto"
                    className="h-9 rounded-lg border border-input bg-surface px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="Município / UF"
                    aria-label="Município do estabelecimento"
                    className="h-9 rounded-lg border border-input bg-surface px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                {canBuildContribution ? (
                  <a
                    href={contributionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Submeter Preço Auditado (GitHub Open Data)</span>
                  </a>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Informe o preço pago com uma chave Módulo 11 válida para gerar a submissão
                    auditável em <code>public/data/community-nfce.json</code>.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
