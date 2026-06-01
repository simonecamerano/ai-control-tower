# Architecture

This document provides a structured overview of the project's source modules.

## TypeScript / JavaScript Modules

### [src/config.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/config.ts)
- **Exports:** `config`
- **Imports from:** `dotenv`

### [src/connectors/base.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/base.ts)
- **Exports:** `BaseConnector`
- **Classes:**
  - `BaseConnector` (Methods: `getProviderName`, `fetchMetrics`)
- **Imports from:** `../types`

### [src/connectors/factory.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/factory.test.ts)
- **Exports:** *none*
- **Classes:**
  - `TestConnector` (Methods: `fetchMetrics`)
- **Imports from:** `vitest`, `./factory`, `./base`, `../types`

### [src/connectors/factory.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/factory.ts)
- **Exports:** `ConnectorFactory`
- **Classes:**
  - `ConnectorFactory` (Methods: `register`, `getConnector`, `getRegisteredProviders`)
- **Imports from:** `./base`

### [src/connectors/index.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/index.ts)
- **Exports:** `initializeConnectors`
- **Functions:** `initializeConnectors`
- **Imports from:** `./factory`, `./mock`

### [src/connectors/mock.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/mock.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./mock`

### [src/connectors/mock.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/connectors/mock.ts)
- **Exports:** `MockConnector`
- **Classes:**
  - `MockConnector` (Methods: `fetchMetrics`)
- **Imports from:** `./base`, `../types`

### [src/index.test.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/index.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`

### [src/index.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/index.ts)
- **Exports:** *none*
- **Imports from:** `fastify`, `./config`, `./connectors`

### [src/types/index.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/src/types/index.ts)
- **Exports:** *none*

### [vitest.config.ts](file:///home/simone/Documenti/start2impact/Progetti personali/ai-control-tower/vitest.config.ts)
- **Exports:** *none*
- **Imports from:** `vitest/config`

