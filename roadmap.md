# Roadmap

> Fill in your planned tasks below using `- [ ] task` for open and `- [x] task` for completed.
> Group tasks under `##` phase headings. ContextForge tracks progress automatically in active-context.md.

## Phase 1 — Project setup & Architecture Definition
- [x] Initialize TypeScript, Fastify/Express backend project setup
- [x] Set up testing framework (Vitest) and basic configuration
- [x] Define shared TypeScript interfaces for normalized provider metrics
- [x] Implement configuration manager to load API keys and endpoints securely (e.g., dotenv)

## Phase 2 — Connector Layer Implementation
- [x] Create base Connector class/interface and factory pattern
- [ ] Implement Antigravity IDE Connector (process lookup, CSRF token & port extraction, gRPC-Gateway client)
- [x] Implement Mock Connectors for external providers (Claude, DeepSeek, Copilot, Tavily, Codex) for development and testing
- [ ] Replace mock connectors with real integrations using respective dashboard/public APIs

## Phase 3 — API Development for AI Orchestrators
- [ ] Implement `GET /v1/status` endpoint for overall health metrics
- [ ] Implement `GET /v1/models/best-match` endpoint for dynamic routing based on quota/costs
- [ ] Implement caching mechanism for provider status to prevent self-rate-limiting

## Phase 4 — Visual Dashboard (Frontend)
- [ ] Initialize a modern single-page dashboard UI (Tailwind or custom CSS with glassmorphism design)
- [ ] Connect dashboard to backend API endpoints
- [ ] Implement visual graphs/charts for consumption timeline and reset alerts
- [ ] Ensure responsive design, dark mode, and high visual excellence

## Phase 5 — Quality Assurance & Refactoring
- [ ] Perform integration testing for the local daemon and external APIs
- [ ] Execute lighthouse/performance checks and accessibility audit (A11y)
- [ ] Refactor and optimize local daemon startup time and memory footprint
