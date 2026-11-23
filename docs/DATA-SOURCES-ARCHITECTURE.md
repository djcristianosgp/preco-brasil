# Arquitetura de Fontes Reais de Preços no Brasil — PreçoBrasil

Este documento registra a análise técnica comparativa das fontes oficiais e abertas de preços no Brasil e justifica a arquitetura adotada no **PreçoBrasil** para garantir **dados reais diários**, **cobertura nacional por Estado e Município**, **busca por código de barras (GTIN/EAN/ANP)**, **zero custos de infraestrutura** e **deploy contínuo na Vercel via JSON versionado**.

---

## 1. Matriz Comparativa das Fontes Pesquisadas

| Tier | Fonte | Itens Cobertos | Granularidade | Frequência Real | Acesso / Licenciamento | Decisão |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Ativo)** | **ANP — Dados Abertos (LPC)** | Gasolina Comum, Etanol Hidratado, Diesel S10, Diesel Comum, Gasolina Aditivada, GLP 13kg, GNV | Nacional, 27 UFs, 417+ Municípios e Postos (CNPJ/CEP) | Coleta diária (seg–sáb); consolidação semanal + CSVs mensais (`dsan/2026/`) e `ultimas-4-semanas-*.csv` | Aberto, gratuito, sem API key (HTTP GET em `gov.br/anp`) | **Adotado como motor primário** |
| **Tier 1 (Ativo)** | **IBGE Malhas v3 & Localidades v1** | Geometria oficial de 27 UFs e 5.571 municípios | Polígonos GeoJSON simplificados + códigos IBGE de 7 dígitos | Estável (atualização anual de malhas) | Aberto, gratuito (`servicodados.ibge.gov.br`) | **Adotado e pré-cacheado em `public/geo/`** |
| **Tier 2 (Expansão)** | **Portais SEFAZ NFC-e Estaduais** (*Nota Paraná / Menor Preço*, *Economiza Alagoas*, *Preço da Hora BA*, *Menor Preço RS*) | Varejo geral, supermercados, farmácias, combustíveis com GTIN real da nota | Posto/Loja por município | Tempo real / diário | Fragmentado por UF; várias UFs exigem credenciamento, token de app móvel ou possuem bloqueio anti-bot | **Preparado no catálogo e lookup GTIN para expansão por conector estadual** |
| **Tier 3 (Macro)** | **IBGE IPCA/SNIPC, CONAB PROHORT, DIEESE** | Índices de inflação, atacado hortifrúti (CEASAs), cesta básica | Regiões metropolitanas / capitais | Mensal ou semanal | Aberto (`apisidra.ibge.gov.br`, CONAB) | **Adequado para fase futura de varejo/hortifrúti sem GTIN** |
| **Tier 4 (GTIN)** | **Open Food Facts Brasil (`br.openfoodfacts.org`)** | Produtos embalados com código de barras EAN-8 / EAN-13 / GTIN-14 | Catálogo nacional/global de varejo | Contínuo (API REST v2) | Aberto, gratuito, CORS habilitado | **Ativo na busca ao vivo por código de barras quando GTIN não está na cesta monitorada** |
| **Tier 4 (Fiscal)** | **SEFAZ CCG / GS1 Brasil / Cosmos Bluesoft** | Descrição fiscal oficial, NCM, CEST, imagem de GTIN | Nacional | Tempo real | Requer certificado digital e-CNPJ ou assinatura comercial | **Documentado para integração backend futura caso o produto escaneado exija NCM oficial** |

---

## 2. Estratégia de Atualização Diária em JSON Versionado (Vercel)

Em vez de manter banco de dados gerenciado pago ou fazer scraping pesado no runtime do usuário:

1. **Snapshot Estático Versionado**:
   - Todo dia às **06:00 BRT (`09:00 UTC`)**, o GitHub Actions executa `npm run data:update`.
   - O script baixa os 3 CSVs oficiais `ultimas-4-semanas-*.csv` da ANP, mescla novos registros diários ao histórico existente em `public/data/history/`, recalcula médias nacionais, estaduais e municipais e gera um novo `dataVersion` (`YYYY.MM.DD.N`) em `public/data/manifest.json` além de um registro imutável em `public/data/snapshots/YYYY-MM-DD.json`.
2. **Deploy Automático na Vercel**:
   - Quando há novas coletas, o workflow realiza commit em `public/data/` e `git push` para a branch `main`.
   - A Vercel detecta o push e publica automaticamente uma nova versão estática com **CDN global**, rollback instantâneo por commit e zero cold-start.
3. **Janela Ativa vs Série Diária**:
   - A ANP coleta postos em municípios diferentes de segunda a sábado. Portanto, um único dia isolado não cobre todos os 417+ municípios simultaneamente.
   - Para garantir estabilidade estatística no mapa (27 UFs e ~417 municípios sempre preenchidos), `latest.json` calcula as médias sobre a **janela ativa dos últimos 7 dias disponíveis** e compara com os **7 dias imediatamente anteriores** (`previousAvg` e `changePct`).
   - Simultaneamente, `history/by-item/{itemId}.json` e `history/by-state/{UF}.json` preservam **cada data diária real** (`avg` do dia + `avg7d` média móvel de 7 dias), permitindo acompanhar a evolução diária completa no gráfico.

---

## 3. Pegadinhas Conhecidas da ANP e IBGE Tratadas no Parser

1. **Bloqueio de `HTTP HEAD`**: O WAF do `gov.br` retorna `403 Forbidden` em requisições `HEAD` e o IBGE retorna `405`. Todas as chamadas usam `GET` com `User-Agent` explícito.
2. **CSV com `;` dentro de campos entre aspas**: Os CSVs da ANP possuem endereços e complementos com `;` entre aspas. O parser implementa leitura RFC-4180 caractere a caractere.
3. **Nomenclatura inconsistente dos CSVs mensais da ANP**: O script `--backfill` lê o HTML oficial da página de Dados Abertos da ANP e descobre dinamicamente as URLs reais de `dsan/2026/`.
4. **Match 100% ANP -> IBGE**: Remoção de apóstrofos (`'`, `` ` ``, `’`) antes da tokenização garante o casamento exato de casos como *Sant'Ana do Livramento (RS)*.
5. **Deduplicação por `(data, cnpj, produto)`**: Evita contagem duplicada na sobreposição entre arquivos mensais e o arquivo móvel das últimas 4 semanas.
