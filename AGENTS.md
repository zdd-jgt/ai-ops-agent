# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm TypeScript monorepo. Services live in `apps/`: `web` is the React console, `telemetry-api` is the Hono API, `mcp-server` exposes observability tools, and `agent-runtime` contains Mastra agents and workflows. Shared contracts and the browser SDK live in `packages/`; examples live in `examples/`. Keep architecture decisions in `docs/`, executable requirements in `specs/`, local deployment assets in `deploy/`, and cloud manifests in `infra/`.

Place tests in each workspace's `tests/` directory. Do not commit `dist/`, runtime databases, telemetry output, or local environment files.

## Build, Test, and Development Commands

Use Node.js 22+ and pnpm 10+ from the repository root:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm dev
pnpm --filter @ai-ops/web dev
pnpm --filter @ai-ops/telemetry-api dev
```

These commands install dependencies, check types, run Vitest, execute the local Playwright three-service E2E, build workspaces, or start development servers. Prefer filtered commands while iterating. `pnpm lint` currently aliases TypeScript static checking; ESLint is not configured yet.

## Coding Style & Naming Conventions

Use TypeScript ESM, two-space indentation, semicolons, and double quotes. Use `PascalCase` for components and exported types, `camelCase` for functions and variables, kebab-case filenames such as `fetch-transport.ts`, and `UPPER_SNAKE_CASE` for environment variables. Validate public inputs with Zod and avoid undocumented `any`. No formatter or linter is enforced; follow nearby code and keep type checking clean.

## Testing Guidelines

Vitest is standard; React tests use Testing Library and jsdom. Name tests `*.test.ts` or `*.test.tsx`, with shared setup in `tests/setup.ts`. Cover success, validation failure, authorization, timeout, and empty-data paths as applicable. Bug fixes require focused regression tests. No coverage threshold is configured.

## Commit & Pull Request Guidelines

History uses prefixes such as `feat:` and `init:`. Write concise, imperative messages, for example `fix: preserve telemetry events during retry`; add a scope when useful. Pull requests must identify affected workspaces, link the issue or spec, list verification results, and disclose unverified paths. Include screenshots for UI changes and request/response examples for APIs.

## Security & Operational Boundaries

Copy `.env.example` locally; never commit keys, tokens, cookies, credentials, or customer data. Phase 1 is read-only: agents must not receive arbitrary Shell, SQL, SSH, script, or `kubectl` tools. AWS resource creation, paid services, production changes, and external security scans require explicit approval. Keep cloud and air-gapped deployments isolated, and support diagnoses with evidence, scope, and time range.
