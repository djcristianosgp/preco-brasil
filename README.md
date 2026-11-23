# PreçoBrasil — Observatório Nacional de Preços (35 Itens Oficiais + CMED + NFC-e)

[![Licença: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-blue.svg)](./LICENSE)
[![React 18](https://img.shields.io/badge/React-18.3-1D4ED8.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vite.dev/)
[![Deploy Vercel](https://img.shields.io/badge/Deploy-Vercel-000000.svg)](https://vercel.com/)
[![Fontes Oficiais](https://img.shields.io/badge/Dados-ANP%20%7C%20ANEEL%20%7C%20ANVISA%20%7C%20CONAB%20%7C%20IBGE%20%7C%20DIEESE%20%7C%20BCB-059669.svg)](./docs/DATA-SOURCES-ARCHITECTURE.md)

Plataforma web **mobile-first** com padrão corporativo para monitorar a **evolução diária dos preços reais no Brasil**, com mapa coroplético interativo por **Estado (27 UFs)** e **zoom desmembrando todos os Municípios (5.512 localidades ativas / 5.571 malhas IBGE)**, **35 indicadores econômicos em 6 categorias**, consulta instantânea a **10.831 medicamentos ANVISA/CMED por código de barras**, eixo comparativo com o **Dólar PTAX (Banco Central)**, **Auditor de QR Code de Cupom Fiscal NFC-e** e atualização automática diária às **06:00 BRT** na **Vercel**.

---

## Principais Recursos

- **Mapa Coroplético Brasil → Município (`d3-geo` + IBGE Malhas v3)**:
  - Visão nacional das **27 UFs**, com clique/toque para desmembrar os **municípios** do estado selecionado.
  - Em **Energia Elétrica B1 (ANEEL)**, o mapa municipal ilumina **5.510 municípios brasileiros** (~99% do país) conforme a distribuidora local e a bandeira tarifária vigente.
  - Carregamento estadual fatiado sob demanda (`latest/by-state/{UF}.json`) mantendo o payload inicial leve (`~125 KB`).
- **6 Categorias Econômicas (35 Itens Oficiais)**:
  1. **Combustíveis Automotivos (ANP)**: Gasolina Comum (padrão inicial), Etanol Hidratado, Diesel S10, Diesel Comum, Gasolina Aditivada, GNV.
  2. **Energia & Gás (ANEEL + ANP)**: Energia Elétrica Residencial B1 (`R$/kWh` + Bandeira Tarifária) e GLP 13 kg.
  3. **Cesta Básica Nacional (DIEESE)**: Custo Total Mensal + Arroz, Feijão, Carne Bovina, Leite, Café, Óleo de Soja e Açúcar nas **27 capitais**.
  4. **Hortifrúti Atacado (CONAB / PROHORT)**: Cotações diárias nas CEASAs para Tomate, Batata, Cebola, Banana Prata, Laranja Pera, Cenoura, Maçã e Alho.
  5. **Medicamentos Regulados (ANVISA / CMED)**: 8 fármacos populares por estado + lookup local completo de **10.831 medicamentos EAN-13** com Preço Máximo ao Consumidor (PMC) pelas alíquotas de ICMS de 2026 (17% a 23%).
  6. **Construção Civil (IBGE / SINAPI)**: Custo médio por m² (Total, Materiais e Mão de Obra) nas **27 UFs**.
- **Série Histórica + Dólar PTAX (`Recharts`)**:
  - Alternância entre **Média Móvel de 7 dias** (`avg7d`) e **Valor Exato do Dia**, filtros `7D / 30D / 90D / Tudo` e toggle de **segundo eixo comparativo com o Dólar Comercial PTAX (BCB)**.
- **Busca por Código de Barras & Auditor de Cupom NFC-e (Câmera + ENCAT v2)**:
  - Busca instantânea por **ANP**, **NCM**, **EAN-13 Farmacêutico (CMED offline sharded)** e **Open Food Facts Brasil v2**.
  - Aba dedicada **Cupom NFC-e**: valida QR Codes ENCAT v2 e chaves de 44 dígitos (dígito verificador Módulo 11 + CNPJ + UF IBGE), abre a consulta pública oficial da SEFAZ estadual e prepara contribuição aberta via GitHub Issue auditável (`public/data/community-nfce.json`).

---

## Como Rodar Localmente

### Pré-requisitos
- **Node.js `>= 20`** e **npm**

```bash
git clone https://github.com/djcristianosgp/preco-brasil.git
cd preco-brasil
npm install
npm run dev
```

Acesse `http://localhost:5173` (use `npm run dev -- --host` para testar diretamente no celular pela rede local).

### Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local de desenvolvimento (`Vite`). |
| `npm run data:update` | Atualiza incrementalmente os 8 conectores oficiais (ANP, ANEEL, CMED, CONAB, SINAPI, DIEESE, BCB, NFC-e). |
| `npm run data:backfill` | Reconstrói as séries de 2026 (use `-- --full-year` para incluir histórico desde Jan/2026 em ANP/PROHORT). |
| `npm run data:aneel-map` | Regenera `public/geo/aneel-municipality-distributors.json` (~5.568 municípios IBGE <-> distribuidoras). |
| `npm run data:geo` | Baixa/regenera malhas territoriais IBGE com correção de *winding order*. |
| `npm run typecheck` | Executa `tsc --noEmit`. |
| `npm run lint` | Executa ESLint (`max-lines <= 350`, `no-console`). |
| `npm run test` / `npm run test:coverage` | Executa os testes unitários e de integração (`Vitest`) com meta `>= 80%`. |
| `npm run build` | Gera o bundle de produção em `dist/`. |

---

## Estrutura & Automação Contínua (GitHub Actions → Vercel)

Consulte [`docs/DATA-SOURCES-ARCHITECTURE.md`](./docs/DATA-SOURCES-ARCHITECTURE.md) para os contratos completos e [`.agents/skills/atualizar-precos-diarios/SKILL.md`](./.agents/skills/atualizar-precos-diarios/SKILL.md) para o manual operacional automatizado.

Todo dia às **06:00 BRT (`0 9 * * *` UTC)**, o workflow [`.github/workflows/daily-price-update.yml`](./.github/workflows/daily-price-update.yml) executa `npm run data:update`, valida `typecheck + lint + test + build` e publica o novo snapshot versionado (`vYYYY.MM.DD.N`) na `main` para deploy automático na **Vercel**.

---

## Licença

Distribuído sob a licença **[MIT](./LICENSE)**.
