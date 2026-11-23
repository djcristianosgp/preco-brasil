# Troubleshooting e Rollback — Pipeline Multi-Fonte PreçoBrasil

## 1. Pegadinhas Conhecidas das Fontes Oficiais

| Sintoma | Causa Raiz | Solução Aplicada no Código |
| :--- | :--- | :--- |
| **`HTTP 403 Forbidden` na ANP/ANVISA ou `405` no IBGE** | WAFs governamentais bloqueiam `HTTP HEAD`. | `fetchResponseWithRetry()` em `scripts/lib/common.mjs` força `GET`/`POST` com `User-Agent`. |
| **Colunas deslocadas em CSVs ANP ou CMED (`TA_PRECO_MEDICAMENTO.csv`)** | Campos de endereço e `SUBSTÂNCIA` possuem `;` dentro de aspas duplas. | `parseCsvRecords()` realiza parse RFC-4180 caractere a caractere respeitando aspas e `""`. |
| **`HTTP 400 Bad Request` no CKAN da ANEEL** | `datastore_search_sql` falha para queries com filtros compostos/aspas no CKAN da ANEEL. | Usar `datastore_search` com parâmetro JSON `filters` (`scripts/lib/connectors/aneel.mjs`). |
| **Bandeira Verde da ANEEL ignorada (`null`)** | O campo `VlrAdicionalBandeira` retorna string `",00"` com vírgula inicial. | Passar `{ min: 0 }` para `parseBrNumber()` em `aneel.mjs`. |
| **OutOfMemory ou lentidão no CONAB `ProhortDiario.txt` (~190 MB)** | Arquivo completo possui mais de 1,1 milhão de linhas desde 2022 com ponto decimal (`.`). | Streaming linha a linha com `TextDecoder('latin1')` filtrando apenas `2026/` + parser decimal com `.`. |
| **`HTTP 500` ou colunas invertidas no DIEESE (`cesta/produto`)** | `tipoDado=1` ou `2` retornam erro 500 no endpoint legado; além disso o cabeçalho da tabela traz **capitais nas colunas** e **meses nas linhas**. | Usar `tipoDado=5` (Total da Cesta) e `tipoDado=4` (Preço Médio) e ler colunas horizontais por capital (`dieese-cesta.mjs`). |
| **Preços altos (SINAPI R$ 2.000/m² ou Cesta R$ 900) zerados ou truncados** | `parseBrPrice()` da ANP limitava valores a `<= 500` e removia pontos como milhar em strings JSON como `"1993.76"`. | `parseBrNumber()` trata corretamente formato BR (`1.993,76`) e formato JSON (`1993.76`) até `100.000`. |
| **União de 2+ fontes apagando datas de outro produto** | Limpar datas globalmente em `mergeFreshBucketsIntoHistory()` apagaria meses SINAPI/DIEESE quando ANP só envia dias recentes. | Escopo estritamente isolado por `itemId` em `freshDatesByItem` (`update-prices.mjs`). |
| **Município ANP não encontrado (`Sant'Ana do Livramento`)** | Remover pontuações antes dos apóstrofos separa `SANT` de `ANA`. | `normalizeMunicipalityName()` remove `['`’´]` **antes** de normalizar espaços. |
| **Mapa renderizado como quadrado sólido no `d3-geo`** | Polígonos IBGE seguem RFC 7946 anti-horário enquanto `d3-geo` espera orientação esférica horária. | `rewindGeometry()` + `rewindGeoCollection()` (`src/utils/geoWinding.ts`) + cache-buster `?v=2`. |

---

## 2. Procedimentos de Recuperação e Rollback

### Caso 1 — Falha de conector secundário (ANEEL, CONAB, DIEESE, CMED, SINAPI, BCB)
- Cada conector roda isolado em `runConnectorSafely()`. O pipeline grava aviso em `manifest.json -> connectorStatus` e **preserva o histórico existente** daquela fonte sem interromper a atualização diária dos demais conectores.

### Caso 2 — Falha crítica na ANP sem histórico local ou snapshot corrompido
1. Não faça commit parcial; reverta alterações locais antes do push:
   ```bash
   git checkout -- public/data/
   ```
2. Caso um commit defeituoso já tenha ido para `main`, reverta com segurança para disparar rebuild limpo na Vercel:
   ```bash
   git revert <commit-sha>
   git push origin main
   ```

### Caso 3 — Regenerar sharding CMED ou mapeamento municipal ANEEL
```bash
npm run data:aneel-map
npm run data:backfill
```
