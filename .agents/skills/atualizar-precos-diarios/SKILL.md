---
name: atualizar-precos-diarios
description: >-
  Executa e audita o pipeline real de atualização diária dos preços (ANP Dados Abertos),
  backfill histórico de 2026, atualização de malhas IBGE e publicação versionada em
  public/data/ para deploy contínuo na Vercel. Use quando for atualizar os JSONs diários,
  rodar backfill, investigar divergências de preços/municípios ou adicionar novos itens
  ao catálogo. Não use para alterações puras de layout UI ou CSS.
version: 1.0.0
---

# Skill: Atualização Diária e Auditoria de Preços (PreçoBrasil)

Esta skill padroniza a operação determinística de ingestão de preços reais no repositório **PreçoBrasil**, garantindo integridade histórica, correspondência 100% com códigos oficiais do IBGE, versionamento semântico diário (`YYYY.MM.DD.N`) e publicação segura na Vercel.

---

## 1. Quando Utilizar Esta Skill

- Executar a atualização diária matinal dos preços reais da ANP (`npm run data:update`).
- Reconstruir ou expandir o histórico de coletas de 2026 (`npm run data:backfill`).
- Regenerar malhas territoriais oficiais do IBGE (`npm run data:geo`).
- Incluir novos combustíveis ou produtos oficiais em `CATALOG_ITEMS` e `ANP_PRODUCT_MAP`.
- Diagnosticar falhas no workflow automatizado (`.github/workflows/daily-price-update.yml`).

## 2. Quando NÃO Utilizar

- ❌ Ajustes exclusivamente visuais, de layout Tailwind, temas ou componentes React sem alteração de dados.
- ❌ Inventar, interpolar artificialmente ou simular preços (`Zero Fake Data`): toda métrica em `public/data/` deve vir de fonte oficial ou API real verificável.

---

## 3. Pré-requisitos de Ambiente

- Node.js `>= 20` e `npm`.
- Dependências instaladas (`npm ci` ou `npm install`).
- Acesso de rede HTTPS de saída (`GET`) para `www.gov.br/anp` e `servicodados.ibge.gov.br`.
- Malhas IBGE presentes em `public/geo/brazil-states.json`, `public/geo/states/*.json` e `public/geo/ibge-municipalities-index.json` (caso ausentes, rodar `npm run data:geo` primeiro).

---

## 4. Procedimento Operacional Passo a Passo

### Passo 1 — Sincronizar Branch Antes de Qualquer Escrita
```bash
git fetch origin
git status --short
```
Se houver commits novos em `origin/main`, atualize (`git pull --rebase origin main`) antes de rodar a ingestão para evitar conflitos em `public/data/`.

### Passo 2 — Escolher o Modo de Ingestão Adequado

| Cenário | Comando | Comportamento |
| :--- | :--- | :--- |
| **Rotina diária matinal (padrão)** | `npm run data:update` | Carrega o histórico já salvo em `public/data/history/`, baixa os 3 CSVs móveis `ultimas-4-semanas-*.csv` da ANP, substitui apenas as datas cobertas pelo arquivo recente e preserva todos os dias anteriores. |
| **Backfill recente (4 meses + atual)** | `npm run data:backfill` | Descobre os CSVs mensais de `dsan/2026/` (`07`, `08`, `09`, `10`) na página oficial da ANP + `ultimas-4-semanas-*.csv`, deduplicando por `(itemId\|date\|cnpj)`. |
| **Backfill do ano completo** | `npm run data:backfill -- --full-year` | Baixa todos os CSVs mensais de 2026 listados no portal da ANP + últimas 4 semanas. |
| **Regenerar malhas IBGE** | `npm run data:geo` | Atualiza `public/geo/` (27 UFs e 5.571 municípios) com correção de *winding order* para `d3-geo`. |

### Passo 3 — Auditar o Resultado Gerado

Após a execução do comando de atualização, verifique obrigatoriamente na saída do terminal e em `public/data/manifest.json`:

1. **Correspondência IBGE**: `[ANP] 100% dos municípios da ANP mapeados com código IBGE oficial!` (aceitável $\ge 99\%$ caso um novo município surja na pesquisa antes de alias).
2. **Preservação Histórica**: `firstCollectionDate` NÃO pode avançar nem apagar meses antigos (ex.: deve permanecer em `2026-07-01` ou anterior).
3. **Cobertura Geográfica**: `statesCovered` deve ser `27` e `citiesCovered >= 400`.
4. **Versão Diária Incrementada**: `dataVersion` no formato `YYYY.MM.DD.N` em `public/data/manifest.json` e nova entrada no topo de `public/data/snapshots/index.json`.
5. **Sanidade dos Preços**: valores médios coerentes com a unidade de cada item (ex.: combustíveis em `R$/L`, GLP em `R$/13kg`, GNV em `R$/m³`).

### Passo 4 — Portão Obrigatório de Qualidade Antes do Commit

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run build
```

Todos os 4 comandos devem encerrar com **código de saída `0`** (e cobertura $\ge 80\%$ mantida).

### Passo 5 — Commit Semântico e Publicação (Deploy Vercel)

Confira o diff (`git status --short`) e publique apenas se houver alteração real em `public/data/` (ou nos scripts/catálogo):

```bash
git add public/data/
git commit -m "chore(data): atualizar precos diarios $(date +%Y-%m-%d)"
git push origin main
```

O push na `main` dispara automaticamente o build estático e a publicação versionada na **Vercel**.

---

## 5. Invariantes Não Negociáveis

1. **Nunca usar `HTTP HEAD` em `gov.br` ou `servicodados.ibge.gov.br`**: o WAF retorna `403`/`405`; usar exclusivamente `GET` com header `User-Agent`.
2. **Nunca usar `line.split(';')` para ler CSV da ANP**: campos de endereço/complemento possuem `;` dentro de aspas; manter o parser RFC-4180 de `scripts/lib/anp-csv-parser.mjs`.
3. **Nunca remover apóstrofos depois da tokenização**: manter a remoção de `'`, `` ` ``, `’` antes de normalizar espaços (evita quebra de nomes como *Sant'Ana do Livramento*).
4. **Preservar os dois arquivos de referência técnica** desta skill antes de alterar parsers ou contratos JSON.

---

## 6. Estratégia de Falha e Rollback

- Se a ANP estiver temporariamente indisponível (`HTTP 5xx`/timeout) ou retornar CSV vazio/truncado, o script aborta com `exit 1` **sem** gravar arquivos parciais corrompidos.
- Caso um snapshot defeituoso chegue a ser gravado antes do commit, execute:
  ```bash
  git checkout -- public/data/
  ```
- Caso um commit de dados defeituoso já tenha ido para `main`, reverta com `git revert <sha>` para manter o histórico da Vercel íntegro.

---

## 7. Referências Técnicas da Skill

- [`01-fontes-anp-ibge-contratos.md`](./references/01-fontes-anp-ibge-contratos.md) — URLs oficiais ANP/IBGE, schemas JSON de `public/data/` e guia de expansão de itens/fontes.
- [`02-troubleshooting-e-rollback.md`](./references/02-troubleshooting-e-rollback.md) — Catálogo de pegadinhas conhecidas da ANP/IBGE (`403 HEAD`, typos em CSVs mensais, `microrregiao: null`, *winding order* `d3-geo`) e procedimentos de recuperação.
