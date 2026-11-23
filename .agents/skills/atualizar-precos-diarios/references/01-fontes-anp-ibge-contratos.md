# Fontes Oficiais e Contratos JSON (`public/data/` e `public/geo/`)

## 1. Endpoints Oficiais Consumidos

### ANP — Levantamento de Preços de Combustíveis (LPC)
- **CSVs móveis das últimas 4 semanas (atualização diária incremental)**:
  - `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-gasolina-etanol.csv`
  - `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-diesel-gnv.csv`
  - `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-glp.csv`
- **Página índice de históricos mensais (descoberta dinâmica no `--backfill`)**:
  - `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis`

### IBGE — Localidades v1 & Malhas Geográficas v3
- Estados: `https://servicodados.ibge.gov.br/api/v1/localidades/estados`
- Municípios: `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`
- Malha Nacional por UF: `https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima&formato=application/vnd.geo+json`
- Malha Municipal por Estado: `https://servicodados.ibge.gov.br/api/v3/malhas/estados/{UF_CODE}?intrarregiao=municipio&qualidade=minima&formato=application/vnd.geo+json`

### Open Food Facts Brasil (Lookup GTIN/EAN sob demanda)
- `https://br.openfoodfacts.org/api/v2/product/{GTIN}.json?fields=code,product_name,product_name_pt,brands,quantity,categories,image_front_small_url`

---

## 2. Estrutura dos Arquivos em `public/data/`

| Arquivo | Função | Regra de Atualização |
| :--- | :--- | :--- |
| `public/data/manifest.json` | Metadados globais (`dataVersion`, `firstCollectionDate`, `latestCollectionDate`, `totalDays`, `totalSamplesProcessed`, `statesCovered`, `citiesCovered`, `sources`). | Recalculado a cada execução; incrementa sufixo `.N` se rodar mais de uma vez no mesmo dia. |
| `public/data/catalog.json` | Lista ordenada de itens (`id`, `name`, `shortName`, `unit`, `anpCode`, `ncm`, `barcodes[]`, `aliases[]`, `priority`). | Gerado a partir de `CATALOG_ITEMS` em `scripts/update-prices.mjs`. |
| `public/data/latest.json` | Médias da janela ativa mais recente (7 dias com fallback até 30 dias em cidades quinzenais) + `previousAvg`, `changePct`, `min`, `max`, `samples`, `lastDate` para `national`, `states[UF]` e `states[UF].cities[ibgeCode]`. | Sobrescrito com base nos buckets consolidados. |
| `public/data/history/by-item/{itemId}.json` | Série diária completa (`date`, `avg`, `avg7d`, `min`, `max`, `samples`) para `national` e cada `UF`. | Mesclado preservando todas as datas anteriores. |
| `public/data/history/by-state/{UF}.json` | Série diária por município da UF (carregamento sob demanda quando o usuário clica no estado). | Mesclado preservando todas as datas anteriores. |
| `public/data/snapshots/YYYY-MM-DD.json` e `snapshots/index.json` | Registro histórico das versões publicadas (últimos 90 snapshots listados no índice). | Gravado um arquivo por data de publicação. |

---

## 3. Como Adicionar Novos Produtos ou Fontes

1. **Novo produto nos CSVs da ANP**: adicione o mapeamento `PRODUTO_RAW -> itemId` em `ANP_PRODUCT_MAP` (`scripts/lib/anp-csv-parser.mjs`) e inclua o descritor completo em `CATALOG_ITEMS` (`scripts/update-prices.mjs`) informando `anpCode`, `ncm`, `barcodes` e `aliases`.
2. **Novas fontes (SEFAZ NFC-e / CONAB / DIEESE)**: crie um módulo isolado em `scripts/lib/` que converta a coleta para o mesmo formato de bucket `(itemId, uf, ibgeCityCode, isoDate, price, dedupKey)` e conecte-o em `scripts/update-prices.mjs` antes da etapa de serialização de `latest.json` e `history/`.
3. Após adicionar itens, execute `npm run data:backfill` (ou o novo conector), verifique a cobertura no frontend e rode `npm run typecheck && npm run lint && npm run test:coverage && npm run build`.
