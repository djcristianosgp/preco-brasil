export function formatBRL(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatVariation(changePct: number | null | undefined): string {
  if (changePct === null || changePct === undefined || !Number.isFinite(changePct)) {
    return '0,00%';
  }
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${changePct.toFixed(2).replace('.', ',')}%`;
}

export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatShortDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}`;
}

export function formatIntegerBR(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0';
  }
  return Math.round(value).toLocaleString('pt-BR');
}

export function calculateEthanolParity(
  ethanolPrice: number | null | undefined,
  gasolinePrice: number | null | undefined,
): { ratioPct: number; favorable: boolean } | null {
  if (
    !ethanolPrice ||
    !gasolinePrice ||
    !Number.isFinite(ethanolPrice) ||
    !Number.isFinite(gasolinePrice) ||
    gasolinePrice <= 0
  ) {
    return null;
  }
  const ratioPct = Math.round((ethanolPrice / gasolinePrice) * 1000) / 10;
  return {
    ratioPct,
    favorable: ratioPct <= 70,
  };
}

export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
