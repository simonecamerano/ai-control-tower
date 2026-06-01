# AI Control Tower

A unified dashboard and REST API for monitoring quota usage across multiple AI providers in one place. The server exposes a thin JSON API backed by a dynamic connector layer; a single-page Glassmorphism dashboard polls the API every 10 seconds and renders live health badges, quota progress bars, and a best-model recommendation engine.

---

## Table of Contents

- [Architecture](#architecture)
  - [Fastify API server](#fastify-api-server)
  - [Connector layer](#connector-layer)
  - [Unified metrics schema](#unified-metrics-schema)
  - [Single-page dashboard](#single-page-dashboard)
- [Registered connectors](#registered-connectors)
- [API reference](#api-reference)
- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment configuration](#environment-configuration)
- [Running the project](#running-the-project)
- [Testing](#testing)
- [Adding a new connector](#adding-a-new-connector)

---

## Architecture

### Fastify API server

`src/index.ts` bootstraps a [Fastify](https://fastify.dev/) server that:

1. Calls `initializeConnectors()` to register all provider connectors with the factory.
2. Serves the static single-page dashboard from `public/` via `@fastify/static`.
3. Registers the provider routes under `/v1/`.
4. Exposes a lightweight `/health` liveness check.

### Connector layer

The connector layer is built around two classes:

**`BaseConnector`** (`src/connectors/base.ts`)

Abstract base class that every connector extends. It owns a 15-second in-memory TTL cache so that rapid calls to `fetchMetrics()` do not hammer upstream APIs. Subclasses implement a single method:

```ts
protected abstract fetchMetricsRaw(): Promise<ProviderMetrics>;
```

`BaseConnector` handles caching transparently; connectors never interact with the cache directly. The `clearCache()` method invalidates the cache on demand.

**`ConnectorFactory`** (`src/connectors/factory.ts`)

A static registry that maps provider names to connector instances (or lazy factory functions). Connectors are registered once at startup via `ConnectorFactory.register(name, connector)` and resolved by name via `ConnectorFactory.getConnector(name)`. The factory is the single source of truth for which providers are active.

**Initialization** (`src/connectors/index.ts`)

`initializeConnectors()` wires all built-in connectors into the factory. To add a provider, register it here.

### Unified metrics schema

All connectors return a `ProviderMetrics` object defined in `src/types/index.ts`:

```ts
interface ProviderMetrics {
  provider: string;
  status: 'active' | 'inactive' | 'error';
  health: 'OK' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
  globalQuota?: MetricQuota;
  models: ModelMetrics[];
  resetAt: string | null;       // ISO 8601
  lastUpdatedAt: string;        // ISO 8601
}

interface ModelMetrics {
  modelId: string;
  modelName: string;
  quota: MetricQuota;
  resetAt: string | null;
}

interface MetricQuota {
  type: 'tokens' | 'requests' | 'credits' | 'percent';
  total: number;
  used: number;
  remaining: number;
}
```

Health thresholds are determined per-connector based on the quota type (e.g. percentage consumed, remaining fraction, or remaining token count).

### Single-page dashboard

`public/index.html` + `public/app.js` + `public/style.css` form a dependency-free SPA with a Glassmorphism visual theme. On load, `app.js`:

1. Fetches `/v1/providers` and `/v1/models/best-match` in parallel.
2. Enriches summary-only provider entries with a second call to `/v1/providers/:name`.
3. Renders provider cards with health badges and per-model quota progress bars.
4. Displays the recommended and fallback models (best-match engine output).
5. Repeats every **10 seconds** via `setInterval`, with a manual Refresh button.

All user-visible strings produced from API data are HTML-escaped before insertion into the DOM.

---

## Registered connectors

| Provider | Connector class | Authentication method |
|---|---|---|
| `claude` | `ClaudeConnector` | Anthropic console session cookie + org ID |
| `copilot` | `CopilotConnector` | GitHub Copilot API key |
| `deepseek` | `DeepSeekConnector` | DeepSeek API key |
| `tavily` | `TavilyConnector` | Tavily API key |
| `codex` | `CodexConnector` | OpenAI / Codex API key |
| `antigravity` | `AntigravityConnector` | None — introspects the local Codeium language server process via `ps` and `lsof` |

The `antigravity` connector is special: it discovers the running `language_server` binary in the process list, extracts its CSRF token and PID from the command-line arguments, uses `lsof` to find the listening port, and queries the local gRPC-Web endpoint directly. No API key or network credential is required.

---

## API reference

All endpoints return JSON.

### `GET /health`

Liveness check. Returns `{ "status": "ok" }`.

---

### `GET /v1/providers`

Returns a health summary map for every registered provider.

**Response**

```json
{
  "claude":       "OK",
  "copilot":      "WARNING",
  "deepseek":     "OK",
  "tavily":       "OK",
  "codex":        "CRITICAL",
  "antigravity":  "BLOCKED"
}
```

Health values: `OK` · `WARNING` · `CRITICAL` · `BLOCKED`

---

### `GET /v1/status`

Alias for `GET /v1/providers`. Useful as a generic poll target.

---

### `GET /v1/providers/:name`

Returns the full `ProviderMetrics` object for a single provider.

**Path parameter:** `name` — registered provider name (e.g. `claude`).

**Response** (example)

```json
{
  "provider": "claude",
  "status": "active",
  "health": "OK",
  "models": [
    {
      "modelId": "claude-3-5-sonnet",
      "modelName": "Claude 3.5 Sonnet",
      "quota": { "type": "percent", "total": 100, "used": 12, "remaining": 88 },
      "resetAt": "2026-06-01T18:00:00.000Z"
    }
  ],
  "resetAt": "2026-06-01T18:00:00.000Z",
  "lastUpdatedAt": "2026-06-01T09:41:00.000Z"
}
```

Returns `404` if the provider name is not registered.

---

### `GET /v1/models/best-match`

Finds the single best available model across all active providers and returns a recommended + fallback pair.

**Selection strategy**

1. Exclude providers with `CRITICAL` or `BLOCKED` health.
2. Rank `OK` above `WARNING`.
3. Within the same health tier, rank by remaining-quota fraction (descending).

**Response**

```json
{
  "recommended": {
    "provider": "deepseek",
    "modelId": "deepseek-chat",
    "modelName": "DeepSeek Chat",
    "remaining": 940000,
    "total": 1000000,
    "type": "tokens",
    "health": "OK"
  },
  "fallback": {
    "provider": "claude",
    "modelId": "claude-3-5-sonnet",
    "modelName": "Claude 3.5 Sonnet",
    "remaining": 88,
    "total": 100,
    "type": "percent",
    "health": "OK"
  }
}
```

Either field may be `null` if no suitable candidates exist.

---

## Setup

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later

### Installation

```bash
git clone <repo-url>
cd ai-control-tower
npm install
```

### Environment configuration

Copy the example below into a `.env` file in the project root and fill in the values for the providers you want to monitor. Variables for providers you leave blank will cause those connectors to return `inactive` status rather than failing.

```dotenv
# Server
PORT=3000

# Anthropic Claude (console session — not an official API key)
CLAUDE_ORG_ID=your_anthropic_org_id
CLAUDE_SESSION_COOKIE=your_session_cookie_string

# GitHub Copilot
COPILOT_API_KEY=your_copilot_api_key

# DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key

# Tavily
TAVILY_API_KEY=your_tavily_api_key

# OpenAI / Codex
CODEX_API_KEY=your_openai_api_key
```

> **Note — `CLAUDE_SESSION_COOKIE`**: Anthropic does not expose an official quota API. The Claude connector scrapes the Anthropic console's internal endpoint using your browser session cookie. Log in to [console.anthropic.com](https://console.anthropic.com), open DevTools → Network, and copy the `Cookie` request header from any authenticated request.

> **Note — Antigravity**: The Antigravity (Codeium) connector requires no configuration. It works automatically when the Codeium language server is running locally.

---

## Running the project

| Command | Description |
|---|---|
| `npm run dev` | Start the server in watch mode (restarts on file changes via `tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` via `tsc` |
| `node dist/index.js` | Run the compiled production build |

The server listens on `http://0.0.0.0:3000` by default (override with `PORT` in `.env`).

Open `http://localhost:3000` in a browser to view the live dashboard.

---

## Testing

Tests are written with [Vitest](https://vitest.dev/) and live alongside their source files (`*.test.ts`).

```bash
# Run the full test suite once
npm test

# Run in watch mode (re-runs on file save)
npm run test:watch
```

The test environment is `node`; no browser or DOM is required.

---

## Adding a new connector

1. Create `src/connectors/myprovider.ts` extending `BaseConnector`:

```ts
import { BaseConnector } from './base';
import { ProviderMetrics } from '../types';

export class MyProviderConnector extends BaseConnector {
  constructor() {
    super('myprovider');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    // Fetch quota data from the upstream API.
    // Return a ProviderMetrics object.
  }
}
```

2. Register it in `src/connectors/index.ts`:

```ts
import { MyProviderConnector } from './myprovider';

export function initializeConnectors(): void {
  // ...existing connectors...
  ConnectorFactory.register('myprovider', new MyProviderConnector());
}
```

3. Add any required API keys to `src/config.ts` and `.env`.

4. Write a `src/connectors/myprovider.test.ts` covering the happy path and error cases.

The dashboard and API will automatically pick up the new provider on next startup — no other changes are needed.
