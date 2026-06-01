# AI Brief

This document contains an optimized summary of the project context for LLMs.

## Project Overview
- **Project:** ai-control-tower
- **Languages:** Markdown, JSON, TypeScript
- **Branch:** main

### Key Dependencies
- `dotenv`: `^16.4.5`
- `fastify`: `^4.28.1`

### Module Structure
#### TypeScript/JavaScript Modules
- `src/config.ts`:
  - **Exports:** `config`
- `src/connectors/antigravity.test.ts`:
- `src/connectors/antigravity.ts`:
  - **Exports:** `AntigravityConnector`
  - **Classes:** `AntigravityConnector`
- `src/connectors/base.ts`:
  - **Exports:** `BaseConnector`
  - **Classes:** `BaseConnector`
- `src/connectors/cache.test.ts`:
  - **Classes:** `TestCacheConnector`
- `src/connectors/factory.test.ts`:
  - **Classes:** `TestConnector`
- `src/connectors/factory.ts`:
  - **Exports:** `ConnectorFactory`
  - **Classes:** `ConnectorFactory`
- `src/connectors/index.ts`:
  - **Exports:** `initializeConnectors`
- `src/connectors/mock.test.ts`:
- `src/connectors/mock.ts`:
  - **Exports:** `MockConnector`
  - **Classes:** `MockConnector`
- `src/index.test.ts`:
- `src/index.ts`:
- `src/routes/providers.test.ts`:
- `src/routes/providers.ts`:
  - **Exports:** `providersRoutes`
- `src/types/index.ts`:
- `vitest.config.ts`:

### Open Tasks
- [ ] Replace mock connectors with real integrations using respective dashboard/public APIs *(Phase 2 — Connector Layer Implementation)*
- [ ] Initialize a modern single-page dashboard UI (Tailwind or custom CSS with glassmorphism design) *(Phase 4 — Visual Dashboard (Frontend))*
- [ ] Connect dashboard to backend API endpoints *(Phase 4 — Visual Dashboard (Frontend))*
- [ ] Implement visual graphs/charts for consumption timeline and reset alerts *(Phase 4 — Visual Dashboard (Frontend))*
- [ ] Ensure responsive design, dark mode, and high visual excellence *(Phase 4 — Visual Dashboard (Frontend))*
- [ ] Perform integration testing for the local daemon and external APIs *(Phase 5 — Quality Assurance & Refactoring)*
- [ ] Execute lighthouse/performance checks and accessibility audit (A11y) *(Phase 5 — Quality Assurance & Refactoring)*
- [ ] Refactor and optimize local daemon startup time and memory footprint *(Phase 5 — Quality Assurance & Refactoring)*

