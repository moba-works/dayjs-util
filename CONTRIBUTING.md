# Contributing to @brandonwie/dayjs-util

Thank you for your interest in contributing! This is a small, focused library and every contribution matters. This guide will help you get set up and understand the project conventions.

## Code of Conduct

Be respectful, constructive, and patient. We're all here to make timezone handling less painful.

## Getting Started

### Prerequisites

- **Node.js** 24+
- **pnpm** (package manager — [install guide](https://pnpm.io/installation))
- Familiarity with [dayjs](https://day.js.org/) is helpful but not required

### Setup

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/dayjs-util.git
cd dayjs-util
pnpm install
```

### Verify Your Setup

```bash
pnpm test        # Run all tests (should pass)
pnpm typecheck   # TypeScript strict mode check (should pass)
```

If both pass, you're ready to contribute.

## Development Workflow

### 1. Create a Branch

Branch from `main` using the naming convention:

```
type/short-description
```

Examples:

```bash
git checkout -b feat/add-quarter-boundary
git checkout -b fix/dst-transition-edge-case
git checkout -b docs/improve-api-examples
```

### 2. Make Your Changes

All source code lives in `src/`. See [Architecture Overview](#architecture-overview) below for the file layout.

### 3. Add or Update Tests

Every new public method needs tests. Tests live in a single file: `src/DayjsUtil.spec.ts`.

### 4. Run Checks Locally

```bash
pnpm test        # All tests must pass
pnpm typecheck   # No type errors allowed
```

### 5. Commit with Conventional Commits

See [Commit Messages](#commit-messages) below.

### 6. Push and Open a PR

```bash
git push origin your-branch-name
```

Then open a Pull Request on GitHub. The [PR template](.github/PULL_REQUEST_TEMPLATE.md) will guide you through what to include.

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
type(scope): description
```

### Types (with real examples from this project)

| Type       | Purpose                                | Example                                                |
| ---------- | -------------------------------------- | ------------------------------------------------------ |
| `feat`     | New method or functionality            | `feat(api): expand DayjsUtil with 20 new methods`      |
| `fix`      | Bug fix                                | `fix(ci): use npm publish for OIDC trusted publishing` |
| `docs`     | Documentation only                     | `docs: add Korean README`                              |
| `chore`    | Maintenance (versions, dependencies)   | `chore: bump version to 0.4.0`                         |
| `build`    | Build system changes                   | `build(tsup): disable code splitting`                  |
| `refactor` | Code restructuring, no behavior change | `refactor: rename DateUtil -> DayjsUtil`               |

### Scopes (optional)

Common scopes: `api`, `event`, `ci`, `tsup`

### Breaking Changes

Add `!` after the type to flag breaking changes:

```
feat(event)!: redesign EventDateHandler for multi-API format support
```

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Fill out the PR template completely
3. **What happens after you open a PR:**
   - CI runs `pnpm test` and `pnpm typecheck` automatically
   - Claude AI will post an automated code review (this is normal — don't be surprised)
   - The maintainer ([@brandonwie](https://github.com/brandonwie)) will review manually
4. Address review feedback with new commits (don't force-push)
5. Once approved, the maintainer will merge

## Testing Requirements

### Where to Add Tests

All tests live in **one file**: `src/DayjsUtil.spec.ts`. Add new test blocks within the existing structure.

### Test Structure

Tests are organized by method name using `describe` blocks:

```ts
describe(DayjsUtil.formatISOString.name, () => {
  it("should format date with specific timezone", () => {
    const result = DayjsUtil.formatISOString(testDateString, "Asia/Seoul");
    expect(result).toMatch(/2025-06-15T09:00:00\+09:00/);
  });

  it("should use UTC as default timezone if not specified", () => {
    const result = DayjsUtil.formatISOString(testDateString);
    expect(result).toMatch(/2025-06-15T00:00:00\+00:00/);
  });
});
```

### Testing Guidelines

- **Always test with explicit timezone strings** — use IANA identifiers like `"Asia/Seoul"`, `"America/New_York"`, `"Europe/London"`
- **Test edge cases:** UTC midnight boundaries, DST transitions, null/undefined inputs
- **Use the existing test constants** defined at the top of the spec file:
  ```ts
  const testDateString = "2025-06-15T09:00:00+09:00";
  const testUTCString = "2025-06-15T00:00:00Z";
  const testDateOnlyString = "2025-06-15";
  ```
- **TZ=UTC environment:** Tests run with `TZ=UTC` (configured in `vitest.config.ts`). Your local timezone does not affect results, but keep this in mind when debugging timezone-specific behavior.

## Code Style

This project has no external linter or formatter. Follow the patterns you see in the existing code:

- **TypeScript strict mode** with `noUncheckedIndexedAccess`
- **2-space indentation**, double quotes for strings
- **Explicit return types** on all public methods
- **JSDoc comments** on public methods with `@param`, `@returns`, and `@example`
- **Section dividers** in source files: `// ─── Section Name ───`

## Architecture Overview

### Project Structure

```
src/
├── DayjsUtil.ts           # Core static utility class (32 methods)
├── EventDateHandler.ts     # Calendar event date normalizer (3 methods)
├── constants.ts            # DATE_FORMAT, UTC, FORMAT_PATTERNS, RRULE_DAYS
├── types.ts                # DateInput, TimezoneString, NormalizedEventDates
├── index.ts                # Barrel export
└── DayjsUtil.spec.ts       # All tests (single file)
```

### Key Design Principles

| Principle             | What it means                                               |
| --------------------- | ----------------------------------------------------------- |
| **Static class**      | No instantiation — call methods directly: `DayjsUtil.now()` |
| **Immutable**         | All operations return new values, never mutate inputs       |
| **Explicit timezone** | Every timezone-aware method takes timezone as a parameter   |
| **No global state**   | dayjs plugins are loaded once at import (idempotent)        |

### Method Naming Conventions

| Suffix    | Return type | Example              |
| --------- | ----------- | -------------------- |
| `*Date`   | JS `Date`   | `convertToUTCDate()` |
| `*String` | `string`    | `formatISOString()`  |
| bare      | `Dayjs`     | `tzParse()`, `now()` |

### Two Entry Points

```ts
import { DayjsUtil } from "@brandonwie/dayjs-util"; // Core
import { EventDateHandler } from "@brandonwie/dayjs-util/event"; // Calendar events
```

These are independent and tree-shakeable — bundlers only include what you import.

### EventDateHandler — Under Active Review

The `EventDateHandler` API is being reviewed for broader compatibility with major calendar APIs (Google Calendar, Microsoft Graph, iCal/RFC 5545). **If you want to contribute changes to EventDateHandler, please open an issue to discuss your approach first.** This avoids wasted effort if the API is about to change.

## Reporting Issues

When reporting bugs, please include:

- **Your timezone(s)** — this is a timezone library; timezone context is critical
- **Both versions** — `dayjs-util` version AND `dayjs` version
- **Minimal reproduction code** — a short snippet that demonstrates the issue
- **Expected vs actual behavior** — what you expected to happen and what actually happened

Use the [bug report template](https://github.com/brandonwie/dayjs-util/issues/new?template=bug_report.yml) for structured reporting.

## Questions?

Open a [blank issue](https://github.com/brandonwie/dayjs-util/issues/new) on GitHub. The maintainer is responsive.
