# Promotion Drafts for create-mcpx

## 1. Hacker News — Show HN

**Title:** Show HN: create-mcpx – Scaffold MCP servers in seconds (TS/Python/Go)

**Text:**
I built a CLI that scaffolds MCP (Model Context Protocol) server projects. Think create-react-app but for MCP servers.

npx create-mcpx

The problem: every MCP server starts with the same boilerplate — pick a transport, wire up the SDK, figure out the config format for Claude Desktop vs Cursor vs VS Code (they're all different), add tests, add Docker. I was doing this repeatedly so I automated it.

What it does:
- Generates a complete working server in TypeScript, Python, or Go
- Auto-detects the right transport (stdio vs HTTP) based on which clients you pick
- Generates ready-to-paste config snippets for Claude Desktop, Cursor, VS Code, and Windsurf
- Includes tests that run against the actual MCP protocol (not mocks)
- Optionally adds Dockerfile and GitHub Actions CI

The client config part is what I think matters most. Every MCP boilerplate README I've seen spends half its docs explaining where to put the JSON config for each client. This just generates the right snippet for you.

Built in TypeScript, 72 tests, MIT licensed.

GitHub: https://github.com/ctonneslan/create-mcpx
npm: https://www.npmjs.com/package/create-mcpx

---

## 2. Reddit — r/ClaudeAI

**Title:** I built a CLI that scaffolds MCP servers with auto-generated client configs

**Text:**
Got tired of the MCP server setup dance — copy a template, pick a transport, figure out the claude_desktop_config.json format, set up tests, etc. So I built this:

```
npx create-mcpx
```

You pick your language (TypeScript, Python, or Go), which clients you're targeting (Claude Desktop, Cursor, VS Code, Windsurf), and it generates a complete project with:

- Working server code with a starter tool
- Tests that actually run against the MCP protocol
- Client config snippets for each client you selected (the exact JSON, the exact file path)
- Dockerfile and GitHub Actions CI if you want them

The transport gets auto-detected from your client selection so you don't have to think about stdio vs Streamable HTTP.

Took about a day to build. Open source, MIT licensed: https://github.com/ctonneslan/create-mcpx

Would love feedback on what templates or features would be useful.

---

## 3. Reddit — r/cursor

**Title:** Made a tool that scaffolds MCP servers with Cursor config included

**Text:**
If you've set up MCP servers for Cursor, you know the config is slightly different from Claude Desktop. I built a CLI that generates MCP server projects and includes the right config snippet for each client:

```
npx create-mcpx my-server --language typescript --clients cursor,claude-desktop
```

The generated README includes copy-paste JSON for your `.cursor/mcp.json` (and Claude Desktop, VS Code, etc. if you selected those too).

Supports TypeScript, Python, and Go. Also generates tests, Dockerfile, and CI.

https://github.com/ctonneslan/create-mcpx

---

## 4. X/Twitter

**Post:**
Built a thing: npx create-mcpx

Scaffolds MCP servers in TypeScript, Python, or Go. Pick your target clients (Claude Desktop, Cursor, VS Code, Windsurf) and it auto-generates the right transport + config snippets.

72 tests. MIT licensed. One command to scaffold, one to run, one to test.

github.com/ctonneslan/create-mcpx

---

## 5. MCP GitHub Discussions (modelcontextprotocol/discussions — Show & Tell)

**Title:** create-mcpx — CLI to scaffold MCP servers with client config generation

**Text:**
Hey all, I built a CLI tool that scaffolds MCP server projects:

```bash
npx create-mcpx
```

**Languages:** TypeScript (@modelcontextprotocol/sdk), Python (FastMCP), Go (mcp-go)
**Transports:** stdio, Streamable HTTP (auto-detected from client selection)
**Client configs:** Generates ready-to-paste JSON for Claude Desktop, Cursor, VS Code, and Windsurf

The main pain point I wanted to solve was the config fragmentation — every client has a slightly different format and file location. The generated README includes the exact snippet for each client you're targeting.

Each generated project includes:
- A working `hello` tool as a starting point
- Tests using InMemoryTransport (TS), FastMCP testing (Python), or mcptest (Go)
- Optional Dockerfile and GitHub Actions CI

GitHub: https://github.com/ctonneslan/create-mcpx
npm: https://www.npmjs.com/package/create-mcpx

Feedback welcome — especially on what other templates or features would be useful.

---

## Posting Order

1. **Now:** MCP GitHub Discussions (most targeted audience, they'll give good feedback)
2. **Now:** r/ClaudeAI (high intent users who actually build MCP servers)
3. **Tomorrow morning:** r/cursor (slightly different angle)
4. **Tomorrow afternoon:** Hacker News Show HN (broader audience, weekday morning EST gets best traction)
5. **After HN:** X/Twitter (share the HN link too)
