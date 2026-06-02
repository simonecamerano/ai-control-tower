# AI Control Tower

A personal dashboard for monitoring quota usage across multiple AI providers in one place. The server exposes a thin JSON API backed by a connector layer; a single-page dashboard polls the API every 10 seconds and renders live health badges, quota progress bars, and a low-quota alert panel.

---

## Disclaimer

**This project is a personal tool built for educational and demonstration purposes only.**

It does not perform any write operations, purchases, or actions on any provider platform. It only reads quota and usage data that the authenticated user is already entitled to see through their own accounts.

Several connectors work by reading session credentials that are **already present on the user's own machine** — the same cookies and tokens the browser stores when you log in normally to a provider's website. No credential is extracted, generated, or shared in any automated way. The tool simply reuses what is already there, the same way a browser extension or DevTools session would.

The project is not intended to:
- Circumvent rate limits or paywalls
- Violate any provider's Terms of Service
- Access data belonging to other users
- Automate actions or impersonate users

If you use this project, you are responsible for ensuring your use complies with the terms of service of each provider you connect to.

---

## Table of Contents

- [Architecture](#architecture)
- [Registered connectors](#registered-connectors)
- [API reference](#api-reference)
- [Setup](#setup)
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
4. Exposes a `/health` liveness check.

### Connector layer

**`BaseConnector`** (`src/connectors/base.ts`) — abstract base class with an in-memory TTL cache. Subclasses implement one method:

```ts
protected abstract fetchMetricsRaw(): Promise<ProviderMetrics>;
```

**`ConnectorFactory`** (`src/connectors/factory.ts`) — static registry mapping provider names to connector instances. Registered once at startup, resolved by name at runtime.

### Unified metrics schema

```ts
interface ProviderMetrics {
  provider: string;
  status: 'active' | 'inactive' | 'error';
  health: 'OK' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
  models: ModelMetrics[];
  resetAt: string | null;
  lastUpdatedAt: string;
}

interface ModelMetrics {
  modelId: string;
  modelName: string;
  quota: MetricQuota;
  resetAt: string | null;
}

interface MetricQuota {
  type: 'tokens' | 'requests' | 'credits' | 'percent' | 'currency';
  total: number;
  used: number;
  remaining: number;
}
```

### Single-page dashboard

`public/index.html` + `public/app.js` + `public/style.css` — a dependency-free SPA. On load it fetches provider data and the low-quota alert panel, then re-polls every 10 seconds.

---

## Registered connectors

| Provider | Auth method |
|---|---|
| `claude` | Session cookie from `claude.ai` + org ID. Optionally, session cookie from `platform.claude.com` + org ID for API prepaid balance. |
| `copilot` | Session cookie from `github.com`. |
| `deepseek` | API key (`/user/balance`). Optionally, platform bearer token for monthly spend. |
| `tavily` | Session cookie from `app.tavily.com` (`appSession` value). Falls back to API key. |
| `codex` | Auth token read from `~/.codex/auth.json` (written by the Codex CLI). Optionally, platform session token for API balance and monthly spend. |
| `antigravity` | None — introspects the local Codeium language server process via `ps` and `lsof`. No credential needed. |

---

## API reference

### `GET /health`

Returns `{ "status": "ok" }`.

---

### `GET /v1/providers`

Returns a health summary map for every registered provider.

```json
{
  "claude": "OK",
  "copilot": "WARNING",
  "deepseek": "OK",
  "tavily": "OK",
  "codex": "CRITICAL",
  "antigravity": "BLOCKED"
}
```

`GET /v1/status` is an alias.

---

### `GET /v1/providers/:name`

Returns the full `ProviderMetrics` object for a single provider. Returns `404` if unknown.

---

### `GET /v1/models/best-match`

Returns the two coding-assistant models with the least quota remaining (most depleted first). Excludes non-coding providers (e.g. Tavily) and informational-only metrics (`currency` type).

```json
{
  "first": {
    "provider": "claude",
    "modelId": "claude-5h-window",
    "modelName": "Claude Session",
    "remaining": 44,
    "total": 100,
    "type": "percent",
    "health": "OK",
    "resetAt": "2026-06-01T13:40:00Z"
  },
  "second": { "..." }
}
```

Either field may be `null` if no suitable candidates exist.

---

## Setup

### Prerequisites

- **Node.js** 20+
- **npm** 10+

### Installation

```bash
git clone <repo-url>
cd ai-control-tower
npm install
cp .env.example .env
# fill in .env with your credentials
```

### Environment configuration

See `.env.example` for the full list of variables. Every variable is optional — leaving one blank causes that connector to report `inactive` rather than erroring.

**How to get session credentials**

Each provider's session credentials are already stored in your browser after a normal login. To retrieve them:

1. Log in to the provider's website.
2. Open DevTools → Network tab → reload the page.
3. Click any authenticated request and copy the `Cookie` request header (or the `Authorization` header for bearer tokens).

The credentials stay on your machine and are only used to read your own quota data.

---

## Running the project

| Command | Description |
|---|---|
| `./launch.sh` | Start server and open dashboard in browser |
| `npm run dev` | Start server in watch mode only |
| `npm run build` | Compile TypeScript to `dist/` |
| `node dist/index.js` | Run compiled production build |

The server listens on `http://localhost:3000` by default.

---

## Testing

```bash
npm test            # run suite once
npm run test:watch  # watch mode
```

---

## Adding a new connector

1. Create `src/connectors/myprovider.ts` extending `BaseConnector`:

```ts
export class MyProviderConnector extends BaseConnector {
  constructor() { super('myprovider'); }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    // fetch quota data, return ProviderMetrics
  }
}
```

2. Register in `src/connectors/index.ts`.
3. Add env vars to `src/config.ts` and `.env.example`.
4. Write `src/connectors/myprovider.test.ts`.

The dashboard and API pick up the new provider automatically on next restart.
