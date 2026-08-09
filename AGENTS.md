# Agent Guidelines & Rules

All AI agents and developers working on this codebase must adhere to the following rules:

## Code Quality & Type Safety
- **No `any` or `unknown` Types**: Always use explicit, precise TypeScript types and interfaces. Avoid using `any` or `unknown`.
- **File Length Limit**: Keep individual files concise (do not exceed 300 to 400 lines of code per file). Refactor larger files into smaller, modular sub-components or utilities.


### Clean Code Principles

#### Core Design & Philosophy
- **DRY (Don't Repeat Yourself)**: Avoid duplicate logic by extracting shared code into reusable functions, hooks, or components.
- **KISS (Keep It Simple, Stupid)**: Write straightforward solutions and avoid overcomplicating code with unneeded cleverness.
- **YAGNI (You Aren't Gonna Need It)**: Build only what is required right now rather than guessing future feature needs.
- **Boy Scout Rule**: Leave the code cleaner than you found it every time you work on it.
- **Single Source of Truth (SSOT)**: Store data in a single definitive location; reference that source rather than duplicating state.
- **Clarity Over Brevity**: Prioritize clear, understandable code over overly concise single-liners or tricky patterns.

#### Architecture & Modularization
- **Feature-Based Organization**: Organize files and folders around features/domains rather than raw file types.
- **Encapsulated Modules**: Break complex systems into smaller, focused modules that hide internal implementation details.
- **Only Consume Necessary Data**: Expose and pass only the properties needed (e.g., via object destructuring) to reduce coupling and state overhead.

#### Readability & Naming
- **Meaningful Names**: Use clear, searchable, and pronounceable names for variables, functions, and components that reveal their intent.
- **Reduce Nesting**: Flatten deep `if` statements and loops using guard clauses and early returns (`continue` or `return`).
- **Minimal Comments**: Write self-explanatory code so you rely on comments only for complex business context, not to explain messy code.

#### Functions & Structure
- **Single Responsibility**: Ensure every function, component, or class performs only one specific task and has only one reason to change.
- **Small Functions**: Keep functions concise so they fit on a single screen and read like a top-level story.
- **Clear Flow of Execution**: Prefer explicit function parameters and return values over implicit global state mutations.
- **Consistent Formatting**: Maintain uniform code style, indentation, and spacing across the entire project.

## Architecture Evaluation & AI Decision Guidelines

When designing prompts or evaluating AI-generated code/architecture, enforce these guidelines to prevent flawed assumptions and speculative leaps:

### Guideline 1: Abstraction (DRY vs. YAGNI) – The "Rule of Three"
- **DO**: Count current usages before abstracting code.
  - **< 3 usages**: Recommend duplication (YAGNI). Explicitly comment duplicate code with `// TODO: Abstract if a third instance appears`.
  - **≥ 3 usages**: Recommend a stable, closed abstraction (avoid speculative flexibility).
- **DO NOT**: Never cite spurious metrics (e.g., "40% faster cycle times"). Only cite cognitive load and change frequency.

### Guideline 2: Microservice Coupling – Prioritize Contracts over Code
- **DO**: When suggesting a shared library, instruct using Semantic Versioning (SemVer) and treat it as a remote dependency (even in a monorepo).
- **DO**: Flag database schema sharing or shared entity objects as dangerous coupling, NOT client libraries.
- **DO NOT**: Never assume startup vs. enterprise defaults. Ask: *"How often do these services deploy independently?"* If deployed together, keep them as a single service.

### Guideline 3: Resilience Patterns – Bind to SLOs, Not Company Size
- **DO**: Request Service-Level Objectives (SLO) before recommending retries vs. circuit breakers.
  - **Idempotent operations** (e.g., `GET`, payment idempotency key): Recommend aggressive retries.
  - **Non-idempotent or latency-sensitive operations** (e.g., user login): Recommend a Circuit Breaker with a tight timeout (e.g., P99 latency + 10%).
- **DO NOT**: Never suggest blanket timeouts (e.g., "5 seconds") without calculating downstream P99 latency. Never set circuit breaker thresholds without knowing acceptable error budgets.

### Guideline 4: Enforcement – Separate Pipeline Enforcement Strictly
- **DO**: Put security vulnerabilities (SAST/DAST) and syntax errors in pre-commit/build stages (fail fast, strict enforcement).
- **DO**: Put code complexity metrics (e.g., cyclomatic complexity > 10) and architectural layer violations in PR commentary as non-blocking warnings.
- **DO NOT**: Never block a PR based purely on a linter rule about function length if the logic is inherently complex. Leave final calls to reviewers.

### Guideline 5: Decision Matrices – Replace "Startup vs. Enterprise" with "Criticality & Lifespan"
- **DO**: Evaluate projects along two axes:
  - **Criticality**: Does this handle money, PII, or user-facing APIs? (If yes → Invest in DRY & Circuit Breakers immediately).
  - **Volatility**: Will this code change weekly or annually? (High volatility → Favor YAGNI & KISS).
- **DO NOT**: Never suggest a "Startup Matrix" that advises skipping DRY or resilience purely based on company size.

### Guideline 6: Handling Metrics – Require Empirical Local Data
- **DO**: Evaluate abstraction/architectural health using local metrics (Change Failure Rate, MTTR, cascading test failures).
- **DO NOT**: Never cite generalized industry statistics to justify local architectural changes. Base decisions strictly on specific repository evidence.

## Testing & Quality Assurance

### Layered Testing Strategy
Validate the system at multiple stages:
- **Data Validation**: Check data integrity and detect drift before training.
- **Model Validation**: Assess performance metrics (accuracy, precision, recall) and fairness on held-out data.
- **Robustness Tests**: Probe behaviour against adversarial inputs, noise, and out-of-distribution data.
- **Online Evaluation**: Verify real-world performance via canary releases or A/B testing.

### Observability
- **Extended Monitoring**: Extend monitoring beyond system metrics to behavioural signals (prediction distribution drift, feature drift, data freshness) to detect model degradation and trigger proactive intervention.

## Security & Privacy
- **Zero-Trust**: Authenticate and encrypt every interaction (mutual TLS, OAuth 2.0, OIDC).
- **Least Privilege & Secret Management**: Enforce least privilege; use short-lived credentials stored in secure vaults (never hardcode secrets).
- **Input Sanitization & Output Verification**: Sanitize all inputs and verify tool outputs to prevent prompt injection and tool misuse (see OWASP Top 10 for Agentic Apps).
- **Data Minimization**: Process the smallest amount of PII necessary; implement refusal/redaction for sensitive data.
- **Audit Logging**: Maintain immutable audit logs of every agent action, decision, and tool call.

