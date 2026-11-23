# Fontes Oficiais e Contratos JSON (`public/data/` e `public/geo/`)

## 1. Endpoints Oficiais Consumidos (8 Conectores)

### Onda 0 — ANP (Combustíveis & GLP)
- **CSVs móveis das últimas 4 semanas (`GET`)**:
  - `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-gasolina-etanol.csv`
  - `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-diesel-gnv.csv`
  - `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-glp.csv`
- **Página índice 2026 (`--backfill`)**:
  - `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis`

### Onda 1 — ANVISA / CMED (Medicamentos PMC Regulados + 10.831 EANs)
- **CSV oficial CMED (`GET`, UTF-8 BOM, RFC-4180)**:
  - `https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv`
- **Tabela modal de ICMS aplicada às 27 UFs (`UF_ICMS_2026`)**:
  - `17%`: ES, MT, MS, RS, SC
  - `18%`: AP, MG, SP
  - `19%`: AC, GO, PA
  - `19,5%`: PR, RO
  - `20%`: AL, AM, CE, DF, PB, RN, RR, SE, TO
  - `20,5%`: BA, PE
  - `22%`: RJ | `22,5%`: PI | `23%`: MA

### Onda 1 — ANEEL Dados Abertos (Energia Residencial B1 + Bandeiras)
- **Tarifas Homologadas (CKAN `datastore_search` com `filters` JSON)**:
  - `https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=fcf2906c-7c32-4b9b-a637-054e7a5234f4` (`DscBaseTarifaria=Tarifa de Aplicação`, `DscSubGrupo=B1`, `DscModalidadeTarifaria=Convencional`, `DscClasse=Residencial`)
- **Acionamento Mensal de Bandeiras (`datastore_search`)**:
  - `https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=0591b8f6-fe54-437b-b72b-1aa2efd46e42`
- **Mapeamento Municípios <-> Distribuidoras (`scripts/fetch-aneel-map.mjs`)**:
  - `indqual-municipio.csv` + `indicadores-continuidade-coletivos-limite.csv` (`IdeConjUnidConsumidoras` -> `CodMunicipio` + `NumCNPJ`) gravado em `public/geo/aneel-municipality-distributors.json`.

### Onda 1 — CONAB / PROHORT (Hortifrúti Diário nas CEASAs)
- **Arquivo TXT diário por streaming (`latin1`, `;`)**:
  - `https://portaldeinformacoes.conab.gov.br/downloads/arquivos/ProhortDiario.txt`

### Onda 2 — IBGE / SINAPI (Construção Civil — Agregado 2296)
- **API Agregados v3 (`N1[all]|N3[all]`, variáveis `48|2119|2120`)**:
  - `https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/-10/variaveis/48|2119|2120?localidades=N1[all]|N3[all]`

### Onda 2 — DIEESE (Cesta Básica + 7 Alimentos nas 27 Capitais)
- **POST `application/x-www-form-urlencoded`**:
  - `https://www.dieese.org.br/cesta/produto` (`produtos=1..13`, `cidades=0`, `dataInicial=012026`, `dataFinal=MMYYYY`, `tipoDado=5` para total da cesta e `tipoDado=4` para preços médios individuais).

### Onda 2 — Banco Central do Brasil (Dólar PTAX Diário)
- **API SGS Série 1**:
  - `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial=01/01/2026&dataFinal=DD/MM/YYYY`

### Onda 3 — Open Food Facts Brasil & Auditor NFC-e (ENCAT v2)
- Open Food Facts v2 (live client-side fallback): `https://br.openfoodfacts.org/api/v2/product/{GTIN}.json`
- Submissões comunitárias auditadas: `public/data/community-nfce.json` (validadas por Módulo 11 antes da ingestão).

---

## 2. Estrutura dos Arquivos em `public/data/`

| Arquivo | Função | Regra de Atualização |
| :--- | :--- | :--- |
| `public/data/manifest.json` | Metadados globais, `energyFlag`, `cmedProductsIndexed`, `connectorStatus`, `sources`. | Recalculado a cada execução; incrementa sufixo `.N` no mesmo dia. |
| `public/data/catalog.json` | Lista ordenada dos 35 itens oficiais com `category`, `cadence`, `geoLevel`, `codeLabel`. | Gerado a partir de `scripts/lib/catalog.mjs`. |
| `public/data/latest.json` | Snapshot enxuto Brasil + 27 UFs (`items`, `citiesCount`, `citiesByItem`) sem bloating municipal (`< 150 KB`). | Sobrescrito a cada execução. |
| `public/data/latest/by-state/{UF}.json` | Preços atuais de todos os municípios da UF (lazy-loaded ao clicar no estado). | Gravado para todas as 27 UFs (~5.512 municípios ativos). |
| `public/data/history/by-item/{itemId}.json` | Série histórica completa (`national` e `states[UF]`) por item. | Merge isolado por `itemId` preservando datas antigas. |
| `public/data/history/by-state/{UF}.json` | Série histórica por município da UF (lazy-loaded). | Merge isolado por `itemId`. |
| `public/data/cmed/{00..99}.json` | Índice farmacêutico sharded pelos 2 últimos dígitos do EAN-13 (~10.831 medicamentos). | Atualizado pelo conector `anvisa-cmed`. |
| `public/data/macro/dolar-ptax.json` | Série diária do Dólar PTAX 2026 para eixo secundário comparativo no gráfico. | Atualizado pelo conector `bcb-ptax`. |
| `public/data/community-nfce.json` | Ledger auditável de cupons NFC-e validados por Módulo 11. | Preservado e ingerido pelo conector `community-nfce`. |
| `public/data/snapshots/YYYY-MM-DD.json` e `index.json` | Histórico imutável de versões publicadas (últimos 90 dias no índice). | Gravado uma entrada por data de publicação. |
