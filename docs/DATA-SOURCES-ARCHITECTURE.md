# Arquitetura de Fontes Reais de Preços no Brasil (3 Ondas) — PreçoBrasil

Este documento registra a arquitetura completa das **8 fontes oficiais integradas** no **PreçoBrasil**, cobrindo as **3 Ondas de Expansão** sobre uma infraestrutura estática versionada em JSON (custo zero de banco de dados, CDN global na Vercel e atualização diária automatizada às **06:00 BRT**).

---

## 1. Matriz Completa das Fontes Integradas

| Onda | Fonte Oficial | Escopo & Itens | Cobertura Territorial | Cadência & Atualização | Armazenamento no Repositório |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Base** | **ANP — Levantamento de Preços de Combustíveis (LPC)** | Gasolina Comum, Etanol, Diesel S10, Diesel Comum, Gasolina Aditivada, GLP 13kg, GNV | Brasil, **27 UFs** e **~418 municípios** | Diária (seg–sáb) via CSVs móveis + históricos mensais 2026 | `latest.json` + `latest/by-state/{UF}.json` + `history/` |
| **Onda 1** | **ANVISA / CMED — Preço Máximo ao Consumidor (PMC)** | 8 fármacos populares no catálogo + **10.831 medicamentos EAN-13 comerciais** | **27 UFs** mapeadas às alíquotas modais de ICMS (17% a 23%) | Tabela oficial CMED parseada em **100 shards** (`public/data/cmed/{00..99}.json`) | Shards `cmed/{00..99}.json` + séries estaduais dos 8 itens |
| **Onda 1** | **ANEEL — Dados Abertos (B1 + Bandeiras Tarifárias)** | Tarifa Residencial B1 (`R$/kWh`) + adicional mensal de Bandeira Tarifária | Brasil, **27 UFs** e **5.510 municípios IBGE** (~99% do território!) | Mensal por distribuidora (CKAN `datastore_search` + mapa `aneel-municipality-distributors.json`) | `latest/by-state/{UF}.json` + `history/` + `manifest.energyFlag` |
| **Onda 1** | **CONAB / PROHORT — CEASAs** | Tomate, Batata, Cebola, Banana Prata, Laranja Pera, Cenoura, Maçã, Alho (`R$/kg`) | **20 UFs / 42 municípios** com entrepostos CEASA | Diária via streaming de `ProhortDiario.txt` (`latin1`) | `latest/by-state/{UF}.json` + `history/` |
| **Onda 2** | **IBGE / SINAPI — Agregado 2296** | Custo Médio m² Total, Materiais (m²) e Mão de Obra (m²) na Construção Civil | Brasil + **27 UFs** | Mensal via API de Agregados IBGE v3 (`variaveis 48\|2119\|2120`) | `latest.json` + `history/by-item/` |
| **Onda 2** | **DIEESE — Cesta Básica Nacional** | Gasto Mensal da Cesta + Arroz, Feijão, Carne, Leite, Café, Óleo de Soja, Açúcar | **27 Capitais estaduais / UFs** | Mensal via endpoint oficial `dieese.org.br/cesta/produto` (`tipoDado=4/5`) | `latest/by-state/{UF}.json` + `history/` |
| **Onda 2** | **Banco Central — Dólar PTAX Diário (SGS 1)** | Série cambial diária `R$/USD` (2026) | Nacional (macro) | Diária (pregões úteis BCB) | `public/data/macro/dolar-ptax.json` (eixo comparativo no gráfico) |
| **Onda 3** | **Open Food Facts + Auditor NFC-e (ENCAT v2)** | Leitura/validação de QR Code NFC-e e chave de 44 dígitos (Módulo 11 + CNPJ) + lookup GTIN v2 | Nacional (consulta direta SEFAZ estadual + contribuição Open Data) | Sob demanda no navegador + ingestão auditada | `public/data/community-nfce.json` + links para Issues `price-submission` |

---

## 2. Decisões Críticas de Escalabilidade (Vercel & Mobile)

1. **Divisão Estadual do Payload Atual (`latest.json` vs `latest/by-state/{UF}.json`)**:
   - Com a ANEEL cobrindo **5.510 municípios**, incluir todos os nós municipais dentro do arquivo raiz `latest.json` inflaria o carregamento inicial mobile acima de 1 MB.
   - Mantemos `latest.json` compacto (**~125 KB**, apenas Brasil + 27 UFs + contagens por item) e carregamos `latest/by-state/{UF}.json` sob demanda junto com a malha municipal quando o usuário clica em um estado.
2. **Sharding Farmacêutico CMED pelo Sufixo de 2 Dígitos (`ean.slice(-2)`)**:
   - Como mais de 96% dos códigos de barras no Brasil compartilham o prefixo GS1 `789`, um particionamento por prefixo concentraria 10.400 medicamentos em um único JSON.
   - O particionamento por `ean.slice(-2)` distribui os **10.831 medicamentos** uniformemente em **100 arquivos** (`~27 KB` médios cada), resolvendo qualquer busca em farmácia em poucos milissegundos sem servidor backend.
3. **Preservação Histórica por Cadência (`itemId`)**:
   - Fontes diárias (`ANP`, `PROHORT`), mensais (`ANEEL`, `SINAPI`, `DIEESE`) e reguladas (`ANVISA/CMED`) convivem no mesmo orquestrador sem sobrescrever janelas umas das outras. Falhas temporárias em conectores secundários emitem `warning` no `manifest.json` e preservam o histórico existente.
4. **Contribuição Auditada Sem Persistência Falsa**:
   - Não gravamos preços submetidos pelo usuário apenas em `localStorage`. O **Auditor NFC-e** valida criptograficamente a estrutura ENCAT v2 (dígito verificador Módulo 11 + CNPJ + código IBGE da UF + portal SEFAZ estadual) e gera uma Issue estruturada auditável para o ledger `public/data/community-nfce.json`.
