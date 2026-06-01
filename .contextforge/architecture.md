# Architecture

This document provides a structured overview of the project's source modules.

## TypeScript / JavaScript Modules

### [public/app.js](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/public/app.js)
- **Exports:** *none*
- **Functions:** `escapeHtml`, `titleCase`, `clamp`, `getQuotaPercent`, `formatNumber`, `formatFriendlyDuration`, `normalizeProviderEntry`, `normalizeProviders`, `fetchJson`, `loadProviderDetails`, `renderStats`, `renderRecommendations`, `renderRecommendationSlot`, `renderProviders`, `renderProviderCard`, `renderModel`, `setLoading`, `setConnectionState`, `showError`, `refreshDashboard`

### [scratch/test-antigravity.js](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/scratch/test-antigravity.js)
- **Exports:** *none*
- **Functions:** `findLanguageServerProcess`, `findProcessPorts`, `testPort`, `main`

### [src/config.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/config.ts)
- **Exports:** `config`
- **Imports from:** `dotenv`

### [src/connectors/antigravity.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/antigravity.test.ts)
- **Exports:** *none*
- **Functions:** `isValidISODate`
- **Imports from:** `vitest`, `./antigravity`

### [src/connectors/antigravity.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/antigravity.ts)
- **Exports:** `AntigravityConnector`
- **Classes:**
  - `AntigravityConnector` (Methods: `fetchMetricsRaw`)
- **Functions:** `normalizeModelId`, `toIsoString`, `findLanguageServerProcess`, `findProcessPorts`
- **Imports from:** `child_process`, `./base`, `../types`

### [src/connectors/base.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/base.ts)
- **Exports:** `BaseConnector`
- **Classes:**
  - `BaseConnector` (Methods: `getProviderName`, `fetchMetrics`, `clearCache`, `fetchMetricsRaw`)
- **Imports from:** `../types`

### [src/connectors/cache.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/cache.test.ts)
- **Exports:** *none*
- **Classes:**
  - `TestCacheConnector` (Methods: `fetchMetricsRaw`)
- **Imports from:** `vitest`, `./base`, `../types`

### [src/connectors/claude.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/claude.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./claude`, `../config`

### [src/connectors/claude.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/claude.ts)
- **Exports:** `ClaudeConnector`
- **Classes:**
  - `ClaudeConnector` (Methods: `fetchMetricsRaw`)
- **Imports from:** `./base`, `../types`, `../config`

### [src/connectors/codex.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/codex.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `fs`, `./codex`

### [src/connectors/codex.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/codex.ts)
- **Exports:** `CodexConnector`
- **Classes:**
  - `CodexConnector` (Methods: `fetchMetricsRaw`)
- **Imports from:** `fs`, `path`, `./base`, `../types`

### [src/connectors/copilot.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/copilot.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./copilot`, `../config`

### [src/connectors/copilot.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/copilot.ts)
- **Exports:** `CopilotConnector`
- **Classes:**
  - `CopilotConnector` (Methods: `fetchMetricsRaw`)
- **Imports from:** `../config`, `./base`, `../types`

### [src/connectors/deepseek.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/deepseek.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./deepseek`, `../config`

### [src/connectors/deepseek.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/deepseek.ts)
- **Exports:** `DeepSeekConnector`
- **Classes:**
  - `DeepSeekConnector` (Methods: `fetchMetricsRaw`)
- **Imports from:** `../config`, `./base`, `../types`

### [src/connectors/factory.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/factory.test.ts)
- **Exports:** *none*
- **Classes:**
  - `TestConnector` (Methods: `fetchMetricsRaw`)
- **Imports from:** `vitest`, `./factory`, `./base`, `../types`

### [src/connectors/factory.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/factory.ts)
- **Exports:** `ConnectorFactory`
- **Classes:**
  - `ConnectorFactory` (Methods: `register`, `getConnector`, `getRegisteredProviders`)
- **Imports from:** `./base`

### [src/connectors/index.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/index.ts)
- **Exports:** `initializeConnectors`
- **Functions:** `initializeConnectors`
- **Imports from:** `./factory`, `./mock`, `./antigravity`, `./deepseek`, `./tavily`, `./claude`, `./copilot`, `./codex`

### [src/connectors/mock.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/mock.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./mock`

### [src/connectors/mock.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/mock.ts)
- **Exports:** `MockConnector`
- **Classes:**
  - `MockConnector` (Methods: `fetchMetricsRaw`)
- **Imports from:** `./base`, `../types`

### [src/connectors/tavily.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/tavily.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./tavily`, `../config`

### [src/connectors/tavily.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/tavily.ts)
- **Exports:** `TavilyConnector`
- **Classes:**
  - `TavilyConnector` (Methods: `fetchMetricsRaw`)
- **Imports from:** `../config`, `./base`, `../types`

### [src/index.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/index.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`

### [src/index.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/index.ts)
- **Exports:** *none*
- **Imports from:** `fastify`, `@fastify/static`, `path`, `./config`, `./connectors`, `./routes/providers`

### [src/routes/providers.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/routes/providers.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `fastify`, `../connectors`, `../connectors/factory`, `./providers`, `../config`

### [src/routes/providers.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/routes/providers.ts)
- **Exports:** `providersRoutes`
- **Functions:** `providersRoutes`
- **Imports from:** `fastify`, `../connectors/factory`, `../types`

### [src/types/index.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/types/index.ts)
- **Exports:** *none*

### [vitest.config.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/vitest.config.ts)
- **Exports:** *none*
- **Imports from:** `vitest/config`

