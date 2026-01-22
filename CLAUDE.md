# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-ui (formerly xinjs-ui) is a web-component library built on [tosijs](https://tosijs.net). Components augment HTML5/CSS3 rather than replacing native elements. The library is developed using [bun](https://bun.sh/).

## Common Commands

```bash
bun start              # Dev server at https://localhost:8787 (hot reload)
bun tests              # Run unit tests + Playwright tests
bun format             # ESLint + Prettier
bun latest             # Clean install (removes node_modules + bun.lock)
```

Running a single unit test:
```bash
bun test src/make-sorter.test.ts
```

Running a single Playwright test:
```bash
bun playwright test tests/form.pw.ts
```

## Architecture

### Build Pipeline

`bin/dev.ts` orchestrates the build:
1. Extracts `/*#` doc comments from `src/` and `README.md` → `demo/docs.json`
2. Compiles TypeScript → ESM in `dist/`
3. Generates type declarations → `dist/*.d.ts`
4. Bundles IIFE version (tosijs + marked included) → `dist/iife.js`
5. Builds demo site → `docs/`

The dev server watches `src/`, `demo/src/`, and `README.md` for changes.

### Component Structure

Each component lives in `src/<component>.ts` and exports:
- A `Component` subclass (the custom element)
- An `ElementCreator` function (factory for creating instances)

New components must be added to `src/index.ts`.

Example pattern:
```typescript
export class MyComponent extends Component {
  myProperty: string = ''
  
  constructor() {
    super()
    this.initAttributes('myProperty')  // Make reactive
  }
  
  content = () => [/* elements or template */]
}

export const myComponent = MyComponent.elementCreator({
  tag: 'my-component',
  styleSpec: { /* styles */ }
}) as ElementCreator<MyComponent>
```

### Documentation System

Components are self-documenting via `/*#` comment blocks containing markdown. Live examples use consecutive code blocks (html/js/css). Control nav ordering with JSON metadata:
- `/*{ "pin": "top" }*/` or `<!--{ "pin": "top" }-->` for pinning

The `createDocBrowser()` function renders documentation from extracted `docs.json`.

### Key Dependencies

- `tosijs`: Core component framework (peer dependency)
- `marked`: Markdown parsing (peer dependency)
- Components use custom HTML tags with `xin-` prefix (e.g., `<xin-table>`, `<xin-select>`)

### Component Philosophy

- Work with the browser, not against it
- `value` property for state, `change` event when it changes
- `action` event for user interactions (distinct from value changes)
- Binary attributes (`hidden`, `disabled`) work as expected
- Interoperable with other web-component libraries

## Issue Tracking with bd

This project uses [bd](https://github.com/steveyegge/beads) (beads) for dependency-aware issue tracking.

### Common bd Commands

```bash
bd list                    # List open issues
bd list --status closed    # List closed issues
bd ready                   # Show issues ready to work on (no blockers)
bd show xinjs-ui-abc       # Show issue details
bd create "Title" -d "Description" -t feature   # Create issue
bd close xinjs-ui-abc --reason "Fixed"          # Close issue
bd dep add xinjs-ui-1 xinjs-ui-2   # Add dependency (2 blocks 1)
bd dep tree xinjs-ui-abc           # Visualize dependency tree
```

### Issue Types

Use `-t` flag: `feature`, `bug`, `task`, `chore`

### Workflow

1. Create issues for planned work with `bd create`
2. Check `bd ready` for unblocked work
3. Update status with `bd update <id> --status in_progress`
4. Close with `bd close <id> --reason "description"`

Issues are stored in `.beads/` and auto-sync with git.
