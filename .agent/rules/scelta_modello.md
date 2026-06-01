---
trigger: always_on
---

# Rule: Optimal Model Selection — 3-Step Protocol

> ⚠️ **HARD CONSTRAINTS — leggi prima di tutto il resto:**
> 1. **Rispondi sempre a Simone in italiano.** L'inglese è riservato agli artefatti di codice (variabili, commenti, documentazione tecnica), mai alla chat.
> 2. **Non implementare mai tu stesso.** Se un task è assegnato a un altro modello, chiamalo via CLI. Nessuna eccezione salvo Simone dica esplicitamente "fallo tu".
> 3. **Includi sempre il contesto ContextForge** nei prompt passati ai modelli (vedi Section 3 per il formato esatto del comando).

For every programming task, Gemini executes the 3-step protocol described below before proposing any model. The proposal must always wait for Simone's explicit approval.

---

## 1. Model Role Table

| Model | Role | Typical tasks | Fallback | Constraint |
|---|---|---|---|---|
| **Qwen (local)** | 🐴 Workhorse | Boilerplate, CRUD, standard components, light local refactoring | DeepSeek | None (local) |
| **Claude Pro** | 🧠 Architect | Architecture, complex reasoning, multi-file debugging, code review, test design | Gemini Pro High | Rate limit |
| **Gemini Pro High** | 🔭 Wide-context analyst | Full repo analysis, planning, roadmaps, long-context tasks | Claude | Rate limit |
| **Gemini Flash** | ⚡ Sprinter | Simple tasks, quick answers, short docs, minor refactoring | Qwen local | Rate limit (higher) |
| **Codex / GPT-4o** | 🎨 Designer | CSS, Tailwind, layouts, UI, transitions, visual frontend | Gemini Flash | Rate limit |
| **DeepSeek API** | 💡 Coding specialist | Advanced algorithms, optimization — use when genuinely the best fit | Qwen local | API cost (low) |
| **Copilot CLI** | 🚜 Batch bulldozer | Full test suite, docstrings, repo docs, global refactoring — **end of project only** | Simone decides manually | Request limit |

---

## 2. Copilot Reserved Rule

The following categories are **exclusively reserved for Copilot CLI** and must not be delegated to other models during development. Duplicating this work wastes calls because Copilot will redo it in one or a few batch operations at the end of the project.

### Tasks reserved for Copilot CLI

| Category | Examples | Allowed exception |
|---|---|---|
| Comments & docstrings | Adding comments to functions, docstrings, JSDoc | Only if the comment explains critical non-obvious logic in the current task context |
| Full test suite | Unit tests, integration tests across all modules | Tests explicitly requested as the current task deliverable |
| Repo documentation | README, CHANGELOG, wiki, docs/ folder | None — always reserved for Copilot |

> **Note:** Copilot CLI (`gh copilot`) is best for suggesting shell commands and GitHub-integrated workflows. For **batch file editing** (e.g. global string replacement, multi-file translation, style uniformity across source files), use **Claude CLI** (`claude --dangerously-skip-permissions -p "..."`) — it can read and edit files directly.

### Automatic instruction to include in model prompts

Gemini includes this instruction in **every** prompt passed to other models:

> When generating code for this task: do NOT add comments, docstrings, or automatic tests.
> These will be handled by Copilot CLI at the end of the project.
> Generate only the working code required by the task.
> **Language rule: all code, comments, CLI output strings, error messages, and documentation must be written in English. No Italian.**

### Activating Copilot CLI

Copilot CLI activates **only on Simone's explicit trigger** ("project done, let's run Copilot"), in this order:
1. Full test suite generation
2. Adding docstrings and comments
3. Repo documentation generation
4. Light global refactoring

---

## 3. CLI Execution & Strict Delegation (Only after Simone's approval)

Always inject ContextForge context into the prompt using this format:

```bash
# Claude
claude -p "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"

# Claude (batch file editing — multi-file refactoring, global replacement)
claude --dangerously-skip-permissions -p "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"

# Codex
codex exec --dangerously-bypass-approvals-and-sandbox "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"

# DeepSeek
source venv/bin/activate && python3 ds.py "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"
```

- **Qwen local**: run directly from Antigravity IDE (local Ollama) — paste `ai-brief.md` content manually in the context field
- **Gemini**: run directly from Antigravity IDE
- **Copilot CLI** (`gh copilot`): best for shell command suggestions; activated manually by Simone at project completion for docstrings/tests/docs

**Strict Model Delegation Rule:**
If a microtask is assigned to a model other than Gemini (i.e., Qwen, Claude, DeepSeek, Codex, Copilot), Gemini **MUST NOT** write or modify files directly using its own generation capabilities. Gemini **MUST** execute the specified CLI command or MCP tool to invoke the assigned model, obtain the generated output from that model, and then apply that specific output. Bypassing the selected model to implement the task directly as Gemini is strictly forbidden.

---

## 4. 3-Step Protocol

Gemini executes these 3 steps in sequence for every task before proposing a model.

### Step 1 — Decompose

**First — mandatory Copilot check:** remove from the task any parts reserved for Copilot (comments, docstrings, test suite, docs, global refactoring). Proceed only with the remainder.

**Mandatory Deconstruct Rule:**
Does the remaining task have distinct components (e.g., UI/CSS styling vs. application logic vs. boilerplate)?
- **YES / MIXED → You MUST split it into microtasks.** Grouping different components (e.g., writing React hooks AND styling the CSS/layout) under a single model is strictly forbidden.
- **NO → atomic task**, proceed to Step 2 as a single task. If you decide the task is atomic but it involves multiple areas (like logic and visual design), you MUST explicitly justify why it cannot be decomposed.

Natural decomposition examples:
- Boilerplate + complex logic → Qwen + Claude
- Implementation + task-specific tests → Qwen + Claude
- Backend code + UI/CSS → Qwen/Claude + Codex
- Architecture + implementation → Claude + Qwen

### Step 2 — Assign roles

For each microtask (or the single task), apply the role table in Section 1.

**Strict specialized routing:**
- Assign **Qwen (local)** ONLY for boilerplate, simple CRUD, standard components, or light local refactoring.
- Assign **Claude Pro** or **DeepSeek** for complex logic, algorithms, state management, or multi-file debugging.
- Assign **Codex / GPT-4o** for CSS, Tailwind, layouts, transitions, or visual frontend styling.

**Ambiguity rule:** if the task falls between two categories, choose the model with the lowest rate limit cost (priority: Qwen, then Gemini Flash, then others).

### Step 3 — Load check

Has the chosen model reached or is it approaching its rate limit in the current session?

Practical signals: throttling errors, slow responses, IDE warnings.

- **NO → proceed with the chosen model**
- **YES → activate the named fallback from the Role Table (Section 1)**

Always state the reason: *"Claude seems close to its limit — using Gemini Pro High as fallback."*

If the fallback model is also rate-limited: drop to Qwen local (for coding tasks) or Gemini Flash (for anything else), then flag the situation to Simone.

---

## 5. Proposal Format & Tool Constraints

### Proposal Tool Constraints
**CRITICAL:** When presenting a proposal, you MUST NOT include any tool calls (e.g., `run_command`, `write_to_file`, `replace_file_content`) in your response. You must output only the proposal text and stop your turn to wait for Simone's explicit text confirmation in the chat. Any eager execution of tools during the proposal phase is strictly prohibited.

### Proposal Text Format
The suggestion goes at the start of the response and ends with a confirmation request:

> 💡 **Task:** [task name]
> **Decomposition:** [yes → microtask A → Qwen / microtask B → Claude | no — single task]
> **Model:** [model name]
> **Reason:** [why this model for this specific task]
> Shall I proceed?

For tasks decomposed into microtasks, use this extended format:

> 💡 **Task:** [task name]
> **Decomposition:** yes
> **Microtask A:** [description] → **Model:** [name] · **Reason:** [why]
> **Microtask B:** [description] → **Model:** [name] · **Reason:** [why]
> Shall I proceed with the first microtask (Microtask A)?

---

## 6. General Development Rules

1. **Code Comments**: Every modified or created file must include useful comments explaining the **logic** and decisions made, not the obvious syntax. *(Exception: during active development, skip routine comments — they will be added by Copilot CLI at project completion. Only include comments that explain critical non-obvious logic, as outlined in Section 2.)*
2. **Post-task QA**: At the end of every task, run a thorough check on the diff and written code. Where possible, verify the implementation actually works (e.g., starting the project, testing it in the browser, checking for console errors).
3. **Planning, Tests and Roadmap (New Projects)**:
   - Every new project must include sufficient test coverage, planned from the start.
   - When a plan for a new project is approved, generate a **Roadmap** artifact with checkable tasks (`[ ]`) and keep it updated as work progresses.
4. **Constant Best Practices**: Every project or component must be developed and optimized following best practices for **SEO**, **GEO** (localization), **Accessibility** (A11y, ARIA) and **Performance** (load optimization).
5. **English Only**: All code, comments, JSDoc, CLI output strings, error messages, template content, and documentation must be written in **English**. This applies to every model and to Copilot CLI. No Italian in any project artifact.

---

## 7. Context-Aware Agent Workflow (ContextForge Integration)

When working on a project that has a `.contextforge/` directory initialized:

> After `contextforge init`, populate `roadmap.md` in the project root with the approved plan tasks before running `contextforge scan`. ContextForge will track progress automatically in `active-context.md` and `ai-brief.md`.

1. **Auto-Update Context**: Before formulating a plan, proposing a model, or executing any implementation task, Gemini MUST execute `contextforge update` (building the project first if local changes to ContextForge itself were made, e.g., via `npm run build && contextforge update`) to ensure the project memory files are fully up-to-date.
2. **Read Memory Files**: Read the relevant files in the `.contextforge/` directory:
   - Always read `active-context.md` (to know the branch, latest commits, and active TODOs).
   - Always read `architecture.md` (to have a structural map of files, classes, and exports).
   - Read `project-overview.md` if the task involves project configuration or general overview.
   - Read `technical-decisions.md` (ADRs) if the task is an architectural refactoring or design change.
   - Read `ai-brief.md` or query ContextForge context if needing compressed context for external models.
3. **Context Injection**: Use this extracted context directly to construct high-quality, token-efficient prompts for the target implementing models (Claude, Qwen, DeepSeek, etc.). Do not pass the entire codebase if the task can be solved using the relevant modular context provided by ContextForge.
