import { Clock, Database, GitCommitHorizontal, X } from 'lucide-react';
import type { DataManifest, SnapshotIndexEntry } from '@/types/pricing';
import { formatBRL, formatDateBR, formatIntegerBR } from '@/utils/formatters';

interface MethodologyModalProps {
  open: boolean;
  onClose: () => void;
  manifest: DataManifest | null;
  snapshots: SnapshotIndexEntry[];
}

export function MethodologyModal({
  open,
  onClose,
  manifest,
  snapshots,
}: MethodologyModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Metodologia e histórico de versões diárias"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 shadow-drawer sm:rounded-2xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Arquitetura de Dados & Versões Diárias
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pipeline automatizado de atualização matinal (06:00 BRT) e publicação contínua na Vercel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar metodologia"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {manifest && (
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground">Versão Ativa</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-primary">
                v{manifest.dataVersion}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground">Série Histórica</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                {manifest.totalDays} dias
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground">Coletas Processadas</p>
              <p className="tabular-nums mt-0.5 font-mono text-xs font-bold text-foreground">
                {formatIntegerBR(manifest.totalSamplesProcessed)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground">Cobertura IBGE</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                {manifest.statesCovered} UFs / {manifest.citiesCovered} cid.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span>Fontes Oficiais Ativas</span>
          </h3>
          {(manifest?.sources || []).map((src) => (
            <div
              key={src.name}
              className="rounded-xl border border-border bg-surface-elevated/60 p-3 text-xs"
            >
              <p className="font-semibold text-foreground">{src.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{src.cadence}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Como Funciona a Evolução Diária</span>
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A ANP realiza coletas em postos revendedores de segunda a sábado em diferentes
            municípios. Para manter 100% das 27 UFs e ~417 municípios comparáveis no mapa sem
            lacunas, os cartões atuais consolidam a <strong>janela ativa de 7 dias</strong> (
            {manifest ? `${formatDateBR(manifest.activeWindowStart)} a ${formatDateBR(manifest.activeWindowEnd)}` : '—'}
            ) comparada aos 7 dias anteriores, enquanto o gráfico de evolução exibe tanto a{' '}
            <strong>coleta exata de cada dia</strong> quanto a <strong>média móvel de 7 dias</strong>.
          </p>
        </div>

        {snapshots.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <GitCommitHorizontal className="h-3.5 w-3.5" />
              <span>Snapshots Diários Publicados</span>
            </h3>
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {snapshots.slice(0, 10).map((snap) => (
                <div
                  key={`${snap.date}-${snap.dataVersion}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated/50 px-3 py-2 font-mono text-[11px]"
                >
                  <span className="font-semibold text-foreground">
                    v{snap.dataVersion} ({formatDateBR(snap.date)})
                  </span>
                  <span className="text-muted-foreground">
                    Gas: {formatBRL(snap.nationalAverages['gasolina-comum'])} · Et:{' '}
                    {formatBRL(snap.nationalAverages['etanol'])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
