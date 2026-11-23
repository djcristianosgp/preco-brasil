import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';
import { ScopeKpiStrip } from '@/components/details/ScopeKpiStrip';
import { FIXTURE_CATALOG } from '@/test/fixtures';

const startMock = vi.fn();
const stopMock = vi.fn().mockResolvedValue(undefined);
const clearMock = vi.fn();

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: startMock,
    stop: stopMock,
    clear: clearMock,
  })),
}));

describe('BarcodeScannerModal & ScopeKpiStrip edge states', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts html5-qrcode when opened and reports detected barcode', async () => {
    startMock.mockImplementation(async (_cfg, _opts, onSuccess: (code: string) => void) => {
      onSuccess('7891000100103');
    });

    const onDetected = vi.fn();
    const onClose = vi.fn();

    render(<BarcodeScannerModal open={true} onClose={onClose} onDetected={onDetected} />);

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith('7891000100103'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows friendly fallback message when camera access fails', async () => {
    startMock.mockRejectedValue(new Error('Permission denied'));
    const onClose = vi.fn();

    render(<BarcodeScannerModal open={true} onClose={onClose} onDetected={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/Não foi possível acessar a câmera/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Fechar$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders empty state on ScopeKpiStrip when metric is missing', () => {
    render(<ScopeKpiStrip item={FIXTURE_CATALOG[0]} metric={null} scopeLabel="Acre" />);
    expect(screen.getByText(/Sem dados disponíveis/i)).toBeInTheDocument();
  });
});
