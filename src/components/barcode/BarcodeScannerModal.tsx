import { useEffect, useId, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { logger } from '@/utils/logger';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const scannerElementId = useId().replace(/:/g, '_');
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    let scannerInstance: { stop: () => Promise<void>; clear: () => void } | null = null;

    async function startScanner() {
      setCameraError(null);
      try {
        const mod = await import('html5-qrcode');
        if (!active) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const instance = new Html5Qrcode(scannerElementId);
        scannerInstance = instance;
        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 140 },
          },
          (decodedText: string) => {
            if (!active) return;
            onDetected(decodedText);
            onClose();
          },
          () => {
            // Ignore frame decode misses during active scan
          },
        );
      } catch (err) {
        if (!active) return;
        logger.warn('Câmera indisponível para leitura de código de barras', err);
        setCameraError(
          'Não foi possível acessar a câmera neste dispositivo ou navegador. Digite o código EAN/ANP manualmente no campo de busca.',
        );
      }
    }

    void startScanner();

    return () => {
      active = false;
      if (scannerInstance) {
        scannerInstance
          .stop()
          .then(() => scannerInstance?.clear())
          .catch((err) => logger.warn('Erro ao encerrar scanner de câmera', err));
      }
    };
  }, [open, scannerElementId, onDetected, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Leitor de código de barras pela câmera"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-4 shadow-drawer sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">
              Leitor de Código de Barras
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar leitor"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          Aponte a câmera para o código de barras EAN-13, EAN-8 ou QR/Code-128 do produto.
        </p>

        <div
          id={scannerElementId}
          className="min-h-[240px] w-full overflow-hidden rounded-xl border border-border bg-slate-950"
        />

        {cameraError && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            {cameraError}
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-xl border border-border px-4 text-xs font-medium text-foreground hover:bg-surface-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
