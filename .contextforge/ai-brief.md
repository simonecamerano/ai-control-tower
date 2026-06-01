# AI Brief

This document contains an optimized summary of the project context for LLMs.

## Project Overview
- **Project:** ai-control-tower
- **Languages:** Markdown
- **Branch:** main

### Open Tasks
- [ ] Initialize TypeScript, Fastify/Express backend project setup *(Phase 1 — Project setup & Architecture Definition)*
- [ ] Set up testing framework (Vitest) and basic configuration *(Phase 1 — Project setup & Architecture Definition)*
- [ ] Define shared TypeScript interfaces for normalized provider metrics *(Phase 1 — Project setup & Architecture Definition)*
- [ ] Implement configuration manager to load API keys and endpoints securely (e.g., dotenv) *(Phase 1 — Project setup & Architecture Definition)*
- [ ] Create base Connector class/interface and factory pattern *(Phase 2 — Connector Layer Implementation)*
- [ ] Implement Antigravity IDE Connector (process lookup, CSRF token & port extraction, gRPC-Gateway client) *(Phase 2 — Connector Layer Implementation)*
- [ ] Implement Mock Connectors for external providers (Claude, DeepSeek, Copilot, Tavily, Codex) for development and testing *(Phase 2 — Connector Layer Implementation)*
- [ ] Replace mock connectors with real integrations using respective dashboard/public APIs *(Phase 2 — Connector Layer Implementation)*
- [ ] Implement `GET /v1/status` endpoint for overall health metrics *(Phase 3 — API Development for AI Orchestrators)*
- [ ] Implement `GET /v1/models/best-match` endpoint for dynamic routing based on quota/costs *(Phase 3 — API Development for AI Orchestrators)*
- [ ] Implement caching mechanism for provider status to prevent self-rate-limiting *(Phase 3 — API Development for AI Orchestrators)*
- [ ] Initialize a modern single-page dashboard UI (Tailwind or custom CSS with glassmorphism design) *(Phase 4 — Visual Dashboard (Frontend))*
- [ ] Connect dashboard to backend API endpoints *(Phase 4 — Visual Dashboard (Frontend))*
- [ ] Implement visual graphs/charts for consumption timeline and reset alerts *(Phase 4 — Visual Dashboard (Frontend))*
- [ ] Ensure responsive design, dark mode, and high visual excellence *(Phase 4 — Visual Dashboard (Frontend))*
- [ ] Perform integration testing for the local daemon and external APIs *(Phase 5 — Quality Assurance & Refactoring)*
- [ ] Execute lighthouse/performance checks and accessibility audit (A11y) *(Phase 5 — Quality Assurance & Refactoring)*
- [ ] Refactor and optimize local daemon startup time and memory footprint *(Phase 5 — Quality Assurance & Refactoring)*

