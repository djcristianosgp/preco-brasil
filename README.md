# PreçoBrasil — Observatório Nacional de Preços

Plataforma corporativa **mobile-first** para monitoramento da **evolução diária de preços no Brasil**, com mapa coroplético interativo por **Estado (27 UFs)** e **zoom por Município (IBGE)**, histórico diário real da **ANP** e busca/leitura de **código de barras (GTIN / EAN-13 / ANP / NCM)**.

## Principais Funcionalidades

- **Mapa Coroplético em 2 Níveis**: Visão nacional (27 UFs) com clique para zoom e desmembramento completo nos municípios do estado (geometrias oficiais IBGE Malhas v3).
- **Preços Reais e Histórico Diário**: Combustíveis oficiais da ANP (*Gasolina Comum, Etanol Hidratado, Diesel S10, Diesel Comum, Gasolina Aditivada, GLP 13 kg e GNV*) com atualização automatizada via JSON versionado.
- **Busca & Leitor de Código de Barras**:
  - Busca instantânea por código ANP (`320102001`), NCM (`27101259`), EAN/GTIN ou nome.
  - Validação de dígito verificador GS1 (`EAN-8`, `EAN-13`, `GTIN-14`).
  - Consulta ao vivo na base **Open Food Facts Brasil** para produtos de varejo fora da cesta inicial.
  - Scanner por câmera mobile (`html5-qrcode`) sob demanda.
- **Atualização Diária Matinal & Deploy Vercel**: Workflow GitHub Actions diário às `06:00 BRT` (`09:00 UTC`) que atualiza `public/data/` e dispara nova versão na Vercel.

## Scripts Disponíveis

```bash
npm install
npm run data:geo       # Baixa e otimiza malhas IBGE em public/geo/
npm run data:backfill  # Baixa histórico real de 2026 da ANP e gera JSONs
npm run data:update    # Atualização diária matinal incremental (últimas 4 semanas ANP)
npm run dev            # Sobe ambiente local em http://localhost:5173
npm run typecheck      # Verifica tipos TypeScript
npm run lint           # ESLint com teto de 350 linhas e no-console
npm run test:coverage  # Suíte Vitest com threshold >= 80%
npm run build          # Build de produção em dist/
```

Consulte [docs/DATA-SOURCES-ARCHITECTURE.md](docs/DATA-SOURCES-ARCHITECTURE.md) para detalhes da análise de fontes reais.
