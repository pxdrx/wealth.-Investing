# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence -- without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

- **Vitest** v4.x with jsdom environment
- **@testing-library/react** for component testing
- **@testing-library/jest-dom** for DOM assertions

## Running Tests

```bash
npm test          # run all tests once
npm run test:watch # watch mode (re-runs on file changes)
```

## Directory Structure

```
test/
  setup.ts                    # global test setup (jest-dom matchers)
  trading-category.test.ts    # unit tests for lib/trading/category.ts
  ...
```

## Test Layers

- **Unit tests** (`test/*.test.ts`): Pure functions, utilities, parsers. Fast, no network.
- **Component tests** (`test/*.test.tsx`): React components with @testing-library/react.
- **Integration tests**: API route handlers with mocked Supabase client.
- **E2E tests**: Future — Playwright for critical flows (auth, import, journal).

## Conventions

- File naming: `{module-name}.test.ts` or `{component-name}.test.tsx`
- Use `describe/it/expect` from vitest (globals enabled)
- Assertions: use specific matchers (`toBe`, `toContain`, `toHaveBeenCalledWith`) not just `toBeDefined`
- Path aliases: use `@/` prefix matching the project's tsconfig paths
- No secrets or API keys in test files — use fixtures or env vars
