# create-mcp-server

Scaffold a new [MCP](https://modelcontextprotocol.io) server project in seconds.

```bash
npx create-mcp-server my-server
```

Pick your language, transport, and optional extras — get a working MCP server with tests, Docker, and CI ready to go.

## Why

Every MCP server starts the same way: copy an example, rip out the parts you don't need, wire up the transport, add a build step. `create-mcp-server` does all of that in one command so you can skip straight to writing tools.

## Quick Start

### Interactive

```bash
npx create-mcp-server
```

You'll be prompted for:
- **Server name** — lowercase, hyphens ok
- **Language** — TypeScript (recommended) or Python
- **Transport** — stdio (for Claude Desktop / CLI) or Streamable HTTP (for web)
- **Extras** — Tests, Dockerfile, GitHub Actions CI

### Non-Interactive

```bash
npx create-mcp-server my-server --language typescript --transport stdio --features tests,docker,ci
```

### Then

```bash
cd my-server
npm install    # or: pip install -e ".[dev]"
npm run build
npm test
```

## What You Get

### TypeScript + stdio

```
my-server/
├── src/
│   ├── index.ts          # Server entry point (stdio transport)
│   ├── tools.ts          # Tool definitions
│   └── __tests__/
│       └── tools.test.ts # Tests using InMemoryTransport
├── package.json
├── tsconfig.json
├── Dockerfile
├── .github/workflows/ci.yml
└── README.md
```

### TypeScript + Streamable HTTP

Same structure, but `index.ts` sets up an Express server with the `StreamableHTTPServerTransport`.

### Python + stdio

```
my-server/
├── src/
│   ├── __init__.py
│   ├── server.py         # FastMCP server
│   └── tools.py          # Tool definitions
├── tests/
│   ├── __init__.py
│   └── test_tools.py
├── pyproject.toml
├── Dockerfile
├── .github/workflows/ci.yml
└── README.md
```

## Templates

The generated servers use the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) for TypeScript and [`mcp`](https://github.com/modelcontextprotocol/python-sdk) for Python. Each template includes:

- A working `hello` tool as a starting example
- Proper transport setup (stdio or Streamable HTTP)
- Type-safe tool definitions
- Tests that run against the actual MCP protocol (no mocking)

## Adding Tools

### TypeScript

Edit `src/tools.ts`:

```typescript
server.tool(
  'my-tool',
  'Description of what it does',
  { input: z.string().describe('What this input is') },
  async ({ input }) => ({
    content: [{ type: 'text', text: `Result: ${input}` }],
  }),
);
```

### Python

Edit `src/tools.py`:

```python
@mcp.tool()
def my_tool(input: str) -> str:
    """Description of what it does."""
    return f"Result: {input}"
```

## Using with Claude Desktop

For stdio servers, add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/my-server/dist/index.js"]
    }
  }
}
```

## License

MIT
