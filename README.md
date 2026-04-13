# Xenra Workspace

This repository is set up as a lean Nx-managed Bun workspace for building a full-stack TypeScript framework.

## What is configured

- Bun is the package manager and default runtime surface for repo commands.
- Nx manages repo-wide tasks and will grow with the monorepo as framework packages are added.
- Biome handles formatting and linting.
- Future framework packages should live under `packages/*`.

## Getting started

Install dependencies with:

```sh
bun install
```

Run the core workspace checks with:

```sh
bun x nx lint
bun x nx typecheck
bun x nx test
```

## Formatting

Nx reserves the `format` command for its own CLI, so Biome formatting is exposed through the root package scripts:

```sh
bun run format
bun run format:check
```

## Project layout

Keep framework code inside `packages/*`.

The workspace intentionally does not include generated apps or libraries yet. This pass only prepares the repo-level tooling so the first real framework packages can be added cleanly later.
