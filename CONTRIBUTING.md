# Contributing to create-mcp-server

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/ctonneslan/create-mcp-server.git
cd create-mcp-server
npm install
npm run build
```

## Running Tests

```bash
npm test
```

## Project Structure

```
src/
├── index.ts              # CLI entry point, argument parsing
├── scaffold.ts           # File generation orchestrator
├── types.ts              # Shared type definitions
├── generators/
│   ├── typescript.ts     # TypeScript template generator
│   └── python.ts         # Python template generator
└── __tests__/
    └── scaffold.test.ts  # Tests
```

## Adding a New Language Template

1. Create `src/generators/<language>.ts` exporting a function that returns `GeneratedFile[]`
2. Add the language to the `Language` type in `src/types.ts`
3. Add a branch in `src/scaffold.ts` to call your generator
4. Add the language option in the interactive prompts in `src/index.ts`
5. Add tests in `src/__tests__/scaffold.test.ts`

## Adding a New Feature (like `tests`, `docker`, `ci`)

1. Add the feature string to the `VALID_FEATURES` array in `src/index.ts`
2. Add the option in the interactive multiselect in `src/index.ts`
3. Handle the feature in each generator's main function
4. Add tests

## Pull Requests

- Keep PRs focused on a single change
- Add tests for new functionality
- Run `npm test` before submitting
- Update the README if you're adding user-facing features

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Your Node.js version and OS
- The command you ran
