---
name: atualizar-precos-diarios
description: >-
  Executa e audita o pipeline multi-fonte de atualização diária dos preços do PreçoBrasil
  (ANP, ANEEL, ANVISA/CMED, CONAB/PROHORT, IBGE/SINAPI, DIEESE, BCB PTAX e NFC-e),
  backfill histórico de 2026, malhas IBGE/ANEEL e publicação versionada em public/data/
  para deploy contínuo na Vercel. Use quando for atualizar os JSONs diários, rodar backfill,
  investigar divergências ou expandir itens/conectores. Não use para ajustes puros de CSS/UI.
version: 2.0.0
---

# Skill: Atualização Diária e Auditoria Multi-Fonte (PreçoBrasil)

Esta skill padroniza a operação determinística de ingestão de preços reais das **3 Ondas** no repositório **PreçoBrasil** (**35 itens oficiais em 6 categorias + 10.831 medicamentos EAN-13 ANVISA/CMED + Dólar PTAX + Auditor NFC-e**), garantindo integridade histórica, correspondência oficial com códigos IBGE (`5.512` municípios / `27` UFs), versionamento semântico diário (`YYYY.MM.DD.N`) e publicação segura na Vercel.

---

## 1. Quando Utilizar Esta Skill

- Executar a atualização diária matinal multi-fonte (`npm run data:update`).
- Reconstruir ou expandir o histórico de coletas de 2026 (`npm run data:backfill`).
- Regenerar o mapeamento estático de municípios IBGE <-> distribuidoras de energia da ANEEL (`npm run data:aneel-map`).
- Regenerar malhas territoriais oficiais do IBGE (`npm run data:geo`).
- Incluir novos itens oficiais em `scripts/lib/catalog.mjs` ou novos conectores em `scripts/lib/connectors/*.mjs`.
- Diagnosticar falhas ou avisos no workflow automatizado (`.github/workflows/daily-price-update.yml`).

## 2. Quando NÃO Utilizar

- ❌ Ajustes exclusivamente visuais, de layout Tailwind, temas ou componentes React sem alteração de dados.
- ❌ Inventar, interpolar artificialmente ou simular preços (`Zero Fake Data`): toda métrica em `public/data/` deve vir de fonte oficial pública ou cupom NFC-e validado por Módulo 11.

---

## 3. Pré-requisitos de Ambiente

- Node.js `>= 20` e `npm`.
- Dependências instaladas (`npm ci` ou `npm install`).
- Acesso HTTPS `GET`/`POST` para `www.gov.br/anp`, `dadosabertos.aneel.gov.br`, `dados.anvisa.gov.br`, `portaldeinformacoes.conab.gov.br`, `servicodados.ibge.gov.br`, `www.dieese.org.br` e `api.bcb.gov.br`.
- Malhas pré-cacheadas presentes em `public/geo/brazil-states.json`, `public/geo/states/*.json`, `public/geo/ibge-municipalities-index.json` e `public/geo/aneel-municipality-distributors.json`.

---

## 4. Procedimento Operacional Passo a Passo

### Passo 1 — Sincronizar Branch Antes de Qualquer Escrita
```bash
git fetch origin
git status --short
```
Se houver commits novos em `origin/main`, atualize (`git pull --rebase origin main`) antes de rodar a ingestão.

### Passo 2 — Escolher o Modo de Ingestão Adequado

| Cenário | Comando | Comportamento |
| :--- | :--- | :--- |
| **Rotina diária matinal (padrão)** | `npm run data:update` | Carrega histórico salvo em `public/data/history/`, executa os 8 conectores em blocos isolados (`try/catch`), substitui datas por `itemId` apenas nas fontes que tiveram sucesso e preserva o histórico anterior. |
| **Backfill recente (2026 completo multi-fonte)** | `npm run data:backfill` | Descobre os CSVs mensais de `dsan/2026/` na ANP + últimas 4 semanas e reprocessa ANEEL, CMED (100 shards), PROHORT, SINAPI, DIEESE e BCB PTAX. |
| **Backfill do ano completo (ANP + PROHORT desde Jan/2026)** | `npm run data:backfill -- --full-year` | Baixa todos os CSVs mensais de 2026 da ANP e lê `ProhortDiario.txt` desde `2026/01/01`. |
| **Atualizar mapa de distribuidoras ANEEL** | `npm run data:aneel-map` | Reconstrói `public/geo/aneel-municipality-distributors.json` (~5.568 municípios IBGE) via streaming do CSV de conjuntos elétricos. |
| **Regenerar malhas IBGE** | `npm run data:geo` | Atualiza `public/geo/` (27 UFs e 5.571 municípios) com correção de *winding order* para `d3-geo`. |

### Passo 3 — Auditar o Resultado Gerado

Após executar o pipeline, confira na saída do terminal e em `public/data/manifest.json`:

1. **Correspondência IBGE**: `[ANP] 100% dos municípios da ANP mapeados com código IBGE oficial!` e `citiesCovered >= 5000` (via ANEEL B1).
2. **Conectores (`connectorStatus`)**: verificar se os 8 conectores encerraram com `status: "ok"`. Caso um conector secundário registre `"warning"` por indisponibilidade temporária do órgão, o histórico antigo é preservado automaticamente.
3. **Orçamento de Payload**:
   - `public/data/latest.json` deve permanecer `< 150 KB` (dados municipais ficam fatiados em `public/data/latest/by-state/{UF}.json`).
   - Total de `public/data/` sob controle (`< 25 MB`).
4. **Cobertura Farmacêutica & Energia**: `cmedProductsIndexed >= 10000` (100 shards `public/data/cmed/{00..99}.json`) e `energyFlag` preenchido com a competência vigente da ANEEL.
5. **Versão Diária Incrementada**: `dataVersion` no formato `YYYY.MM.DD.N` e nova entrada no topo de `public/data/snapshots/index.json`.

### Passo 4 — Portão Obrigatório de Qualidade Antes do Commit

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run build
```

Todos os 4 comandos devem encerrar com **código de saída `0`** (ESLint com `max-lines <= 350` e `no-console`; cobertura Vitest `>= 80%`).

### Passo 5 — Commit Semântico e Publicação (Deploy Vercel)

```bash
git add public/data/
git commit -m "chore(data): atualizar precos diarios $(date +%Y-%m-%d)"
git push origin main
```

O push na `main` dispara automaticamente o build estático e a publicação versionada na **Vercel**.

---

## 5. Invariantes Não Negociáveis

1. **Nunca usar `HTTP HEAD` em portais governamentais (`gov.br`, `ibge.gov.br`, `dados.anvisa.gov.br`)**: usar exclusivamente `GET` ou `POST` com `User-Agent`.
2. **Nunca usar `line.split(';')` em CSVs ANP ou ANVISA CMED**: campos de endereço e `SUBSTÂNCIA` contêm `;` entre aspas; usar `parseCsvRecords()` RFC-4180 (`scripts/lib/anp-csv-parser.mjs`).
3. **Limpeza de datas sempre isolada por `itemId`**: cadências distintas (`daily` vs `monthly` vs `regulated`) não podem apagar datas de outros conectores em `mergeFreshBucketsIntoHistory()`.
4. **Streaming obrigatório em arquivos gigantes (`ProhortDiario.txt` 189 MB e `indicadores-continuidade` 52 MB)**: processar via `response.body.getReader()` linha a linha.
5. **Sharding CMED pelo sufixo de 2 dígitos (`ean.slice(-2)`)**: nunca shardar por prefixo `789` (pois >96% dos fármacos brasileiros começam com `789`).

---

## 6. Referências Técnicas da Skill

- [`01-fontes-anp-ibge-contratos.md`](./references/01-fontes-anp-ibge-contratos.md) — Endpoints das 8 fontes oficiais (Ondas 1–3), alíquotas modais de ICMS CMED, contratos JSON e guia de expansão.
- [`02-troubleshooting-e-rollback.md`](./references/02-troubleshooting-e-rollback.md) — Pegadinhas conhecidas de ANP, IBGE, ANEEL (`datastore_search`), ANVISA, CONAB, DIEESE e procedimentos de rollback.
