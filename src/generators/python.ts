import { Options } from '../types.js';
import { GeneratedFile } from '../scaffold.js';
import { generateClientConfigs } from '../clients.js';

export function generatePython(options: Options): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({ path: 'pyproject.toml', content: pyprojectToml(options) });
  files.push({ path: 'src/__init__.py', content: '' });
  files.push({ path: 'src/server.py', content: server(options) });
  files.push({ path: 'src/tools.py', content: tools(options) });
  files.push({ path: '.gitignore', content: gitignore() });
  files.push({ path: 'README.md', content: readme(options) });

  if (options.features.includes('tests')) {
    files.push({ path: 'tests/__init__.py', content: '' });
    files.push({ path: 'tests/test_tools.py', content: testFile(options) });
  }

  if (options.features.includes('docker')) {
    files.push({ path: 'Dockerfile', content: dockerfile(options) });
  }

  if (options.features.includes('ci')) {
    files.push({ path: '.github/workflows/ci.yml', content: ciWorkflow() });
  }

  return files;
}

function pyprojectToml(options: Options): string {
  const deps = ['"mcp[cli]>=1.9.0"'];
  if (options.transport === 'streamable-http') {
    deps.push('"uvicorn>=0.34.0"');
  }

  return `[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "${options.name}"
version = "0.1.0"
description = "${options.name} MCP server"
requires-python = ">=3.10"
dependencies = [
    ${deps.join(',\n    ')},
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.26",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
`;
}

function server(options: Options): string {
  if (options.transport === 'stdio') {
    return `"""${options.name} MCP server."""

from mcp.server.fastmcp import FastMCP
from src.tools import register_tools

mcp = FastMCP("${options.name}")
register_tools(mcp)

if __name__ == "__main__":
    mcp.run(transport="stdio")
`;
  }

  return `"""${options.name} MCP server."""

from mcp.server.fastmcp import FastMCP
from src.tools import register_tools

mcp = FastMCP("${options.name}")
register_tools(mcp)

if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=3000)
`;
}

function tools(options: Options): string {
  return `"""Tool definitions for ${options.name}."""


def register_tools(mcp):
    @mcp.tool()
    def hello(name: str) -> str:
        """Say hello to someone."""
        return f"Hello, {name}! Welcome to ${options.name}."

    # Add more tools here
`;
}

function testFile(options: Options): string {
  return `"""Tests for ${options.name} tools."""

import pytest
from mcp.server.fastmcp import FastMCP


def create_server() -> FastMCP:
    """Create a fresh server instance for testing."""
    from src.tools import register_tools

    mcp = FastMCP("${options.name}")
    register_tools(mcp)
    return mcp


class TestTools:
    def test_server_has_tools(self):
        server = create_server()
        tools = server._tool_manager.list_tools()
        tool_names = [t.name for t in tools]
        assert "hello" in tool_names

    @pytest.mark.asyncio
    async def test_hello(self):
        server = create_server()
        result = await server._tool_manager.call_tool("hello", {"name": "World"})
        assert len(result) > 0
        assert "Hello, World!" in result[0].text
`;
}

function gitignore(): string {
  return `__pycache__/
*.py[cod]
*.egg-info/
dist/
.venv/
.env
`;
}

function dockerfile(options: Options): string {
  return `FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY . .
${options.transport === 'streamable-http' ? 'EXPOSE 3000\n' : ''}CMD ["python", "-m", "src.server"]
`;
}

function ciWorkflow(): string {
  return `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[dev]"
      - run: pytest
`;
}

function readme(options: Options): string {
  const configs = generateClientConfigs(options.name, options.language, options.transport);
  const selectedConfigs = options.clients.length > 0
    ? configs.filter((c) => options.clients.includes(c.client))
    : configs;

  let clientSections = '';
  if (options.transport === 'streamable-http') {
    clientSections = `## Usage

\`\`\`bash
python -m src.server
\`\`\`

The server will be available at \`http://localhost:3000/mcp\`.

`;
  }

  if (selectedConfigs.length > 0) {
    clientSections += `## Client Configuration\n\n`;
    for (const config of selectedConfigs) {
      clientSections += `### ${config.label}

Add to \`${config.configPath}\`:

\`\`\`json
${config.snippet}
\`\`\`

`;
    }
  }

  return `# ${options.name}

An MCP server built with [create-mcpx](https://github.com/ctonneslan/create-mcp-server).

## Setup

\`\`\`bash
pip install -e ".[dev]"
\`\`\`

${clientSections}## Tools

| Tool | Description |
|------|-------------|
| \`hello\` | Say hello to someone |

## Development

\`\`\`bash
${options.features.includes('tests') ? 'pytest          # Run tests\n' : ''}python -m src.server  # Run server
\`\`\`
`;
}
