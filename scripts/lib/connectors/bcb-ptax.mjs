import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchBufferWithRetry, parseBrNumber, round4 } from '../common.mjs';

function formatBrDate(date) {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

export async function runBcbPtaxConnector({ dataDir }) {
  const today = new Date();
  const dataFinal = formatBrDate(today);
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial=01/01/2026&dataFinal=${dataFinal}`;

  console.log('[BCB/PTAX] Baixando série diária do Dólar PTAX 2026 (SGS série 1)...');
  const buf = await fetchBufferWithRetry(url, { timeoutMs: 30000 });
  const raw = JSON.parse(new TextDecoder('utf-8').decode(buf));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Resposta vazia da API BCB PTAX');
  }

  const byDate = new Map();
  for (const row of raw) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(row.data || '').trim());
    const value = parseBrNumber(row.valor, { min: 1, max: 30 });
    if (!m || value === null) continue;
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    byDate.set(iso, round4(value));
  }

  const points = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rate]) => ({ date, rate }));

  const latestPoint = points[points.length - 1] || null;
  const prevPoint = points.length >= 2 ? points[points.length - 2] : null;
  const changePct =
    latestPoint && prevPoint && prevPoint.rate > 0
      ? Math.round(((latestPoint.rate - prevPoint.rate) / prevPoint.rate) * 10000) / 100
      : 0;

  const macroDir = path.join(dataDir, 'macro');
  await fs.mkdir(macroDir, { recursive: true });
  await fs.writeFile(
    path.join(macroDir, 'dolar-ptax.json'),
    JSON.stringify({
      seriesId: 1,
      name: 'Dólar Comercial PTAX (Venda)',
      sourceName: 'Banco Central do Brasil (SGS Série 1)',
      unit: 'R$/USD',
      latestDate: latestPoint?.date || '',
      latestRate: latestPoint?.rate || 0,
      changePct,
      points,
    }),
  );

  console.log(
    `  ✓ [BCB/PTAX] ${points.length} cotações diárias 2026 gravadas (última: ${latestPoint?.date} = R$ ${latestPoint?.rate}).`,
  );

  return {
    name: 'bcb-ptax',
    itemIds: [],
    accepted: points.length,
    latestRate: latestPoint?.rate,
    latestDate: latestPoint?.date,
  };
}
