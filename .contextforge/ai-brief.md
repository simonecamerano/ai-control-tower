# AI Brief

This document contains an optimized summary of the project context for LLMs.

## Project Overview
- **Project:** ai-control-tower
- **Languages:** Markdown, JSON, JavaScript, HTML, CSS, TypeScript
- **Branch:** main

### Key Dependencies
- `@fastify/static`: `^7.0.4`
- `dotenv`: `^16.4.5`
- `fastify`: `^4.28.1`

### Module Structure
#### TypeScript/JavaScript Modules
- `public/app.js`:
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
- `src/connectors/claude.test.ts`:
- `src/connectors/claude.ts`:
  - **Exports:** `ClaudeConnector`
  - **Classes:** `ClaudeConnector`
- `src/connectors/codex.test.ts`:
- `src/connectors/codex.ts`:
  - **Exports:** `CodexConnector`
  - **Classes:** `CodexConnector`
- `src/connectors/copilot.test.ts`:
- `src/connectors/copilot.ts`:
  - **Exports:** `CopilotConnector`
  - **Classes:** `CopilotConnector`
- `src/connectors/deepseek.test.ts`:
- `src/connectors/deepseek.ts`:
  - **Exports:** `DeepSeekConnector`
  - **Classes:** `DeepSeekConnector`
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
- `src/connectors/tavily.test.ts`:
- `src/connectors/tavily.ts`:
  - **Exports:** `TavilyConnector`
  - **Classes:** `TavilyConnector`
- `src/index.test.ts`:
- `src/index.ts`:
- `src/routes/providers.test.ts`:
- `src/routes/providers.ts`:
  - **Exports:** `providersRoutes`
- `src/types/index.ts`:
- `vitest.config.ts`:

