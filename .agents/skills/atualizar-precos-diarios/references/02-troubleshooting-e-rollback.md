# Troubleshooting e Rollback — Pipeline PreçoBrasil

## 1. Pegadinhas Conhecidas das Fontes Oficiais

| Sintoma | Causa Raiz | Solução Aplicada no Código |
| :--- | :--- | :--- |
| **`HTTP 403 Forbidden` na ANP ou `405` no IBGE** | WAF do `gov.br` e API do IBGE bloqueiam requisições `HTTP HEAD`. | Usar exclusivamente `fetch(url, { headers: { 'User-Agent': '...' } })` (`GET`). |
| **Colunas deslocadas / datas inválidas em linhas do CSV ANP** | Campos de endereço e complemento possuem `;` entre aspas duplas. | `parseCsvRecords()` em `scripts/lib/anp-csv-parser.mjs` realiza leitura RFC-4180 caractere a caractere respeitando aspas e `""`. |
| **Falha 404 ao tentar baixar CSV mensal por padrão de URL fixo** | A ANP publica arquivos mensais com variações e typos no nome (ex.: `02-cados-abertos-preco-gasolina-etanol.csv` vs `10-gasolina-etanol.csv`). | `discoverBackfillUrls()` lê o HTML da página oficial de dados abertos e extrai dinamicamente os links `.csv` reais de `dsan/2026/`. |
| **Caracteres corrompidos (`\uFFFD`) em nomes de cidades/bairros** | Alguns CSVs históricos da ANP são codificados em ISO-8859-1 (Latin-1) e outros em UTF-8 com BOM. | `decodeAnpBuffer()` remove BOM UTF-8 e faz fallback automático para `latin1` se detectar `\uFFFD`. |
| **`TypeError` ao ler UF de município no IBGE** | Alguns registros da API `localidades/municipios` retornam `microrregiao: null`. | `extractMunicipalityUf()` usa `microrregiao?.mesorregiao?.UF?.sigla \|\| regiao-imediata?.regiao-intermediaria?.UF?.sigla`. |
| **Município não mapeado (`Sant'Ana do Livramento`)** | Substituir pontuações por espaço antes de remover apóstrofos transforma `Sant'Ana` em `SANT ANA`. | `normalizeMunicipalityName()` remove `['`’´]` **antes** de substituir caracteres não alfanuméricos por espaço. |
| **Mapa do Brasil renderizado como quadrado sólido no navegador** | GeoJSON RFC 7946 do IBGE usa anel externo anti-horário, enquanto `d3-geo` espera sentido horário para polígonos esféricos. | `rewindGeometry()` em `scripts/fetch-ibge-geo.mjs` e `rewindGeoCollection()` em `src/utils/geoWinding.ts` validam `geoArea(ring) > 2 * Math.PI` e invertem anéis externos anti-horários. |
| **Navegador continua exibindo malha antiga após regenerar `public/geo/`** | Cache HTTP de longa duração para `/geo/*`. | Incrementar a query de cache-busting (`?v=2`, `?v=3`...) em `loadBrazilGeo()` e `loadStateGeo()` (`src/services/priceDataService.ts`). |

---

## 2. Procedimentos de Recuperação e Rollback

### Caso 1 — Falha temporária da ANP durante atualização matinal
1. Verifique se a URL oficial da ANP alterou no portal `gov.br/anp`.
2. Não faça commit de JSON vazio; o script sai com erro `exit 1` preservando `public/data/`.
3. Restaure qualquer alteração parcial local com:
   ```bash
   git checkout -- public/data/
   ```

### Caso 2 — Perda acidental de histórico antigo após execução
1. Cheque `firstCollectionDate` e `totalDays` em `public/data/manifest.json`.
2. Se `firstCollectionDate` tiver avançado indevidamente, restaure `public/data/` pelo último commit válido e execute novamente `npm run data:backfill` (ou `npm run data:backfill -- --full-year`).

### Caso 3 — Reverter versão publicada na Vercel
```bash
git revert <commit-sha-do-update>
git push origin main
```
A Vercel gerará um novo build usando o snapshot anterior íntegro.
