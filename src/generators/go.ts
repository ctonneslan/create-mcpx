import { Options } from '../types.js';
import { GeneratedFile } from '../scaffold.js';
import { generateClientConfigs } from '../clients.js';

export function generateGo(options: Options): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({ path: 'go.mod', content: goMod(options) });
  files.push({ path: 'main.go', content: mainGo(options) });
  files.push({ path: 'tools.go', content: toolsGo(options) });
  files.push({ path: '.gitignore', content: gitignore(options) });
  files.push({ path: 'README.md', content: readme(options) });

  if (options.features.includes('tests')) {
    files.push({ path: 'tools_test.go', content: testFile(options) });
  }

  if (options.features.includes('docker')) {
    files.push({ path: 'Dockerfile', content: dockerfile(options) });
  }

  if (options.features.includes('ci')) {
    files.push({ path: '.github/workflows/ci.yml', content: ciWorkflow() });
  }

  return files;
}

function goMod(options: Options): string {
  return `module ${options.name}

go 1.23.0

require github.com/mark3labs/mcp-go v0.32.0
`;
}

function mainGo(options: Options): string {
  if (options.transport === 'stdio') {
    return `package main

import (
\t"log"

\t"github.com/mark3labs/mcp-go/server"
)

func main() {
\ts := server.NewMCPServer(
\t\t"${options.name}",
\t\t"0.1.0",
\t\tserver.WithToolCapabilities(false),
\t)

\tregisterTools(s)

\tif err := server.ServeStdio(s); err != nil {
\t\tlog.Fatalf("Server error: %v", err)
\t}
}
`;
  }

  // Streamable HTTP
  return `package main

import (
\t"log"

\t"github.com/mark3labs/mcp-go/server"
)

func main() {
\ts := server.NewMCPServer(
\t\t"${options.name}",
\t\t"0.1.0",
\t\tserver.WithToolCapabilities(false),
\t)

\tregisterTools(s)

\thttpServer := server.NewStreamableHTTPServer(s)

\tlog.Println("MCP server listening on http://localhost:3000/mcp")
\tif err := httpServer.Start(":3000"); err != nil {
\t\tlog.Fatalf("Server error: %v", err)
\t}
}
`;
}

function toolsGo(options: Options): string {
  return `package main

import (
\t"context"
\t"fmt"

\t"github.com/mark3labs/mcp-go/mcp"
\t"github.com/mark3labs/mcp-go/server"
)

func registerTools(s *server.MCPServer) {
\thelloTool := mcp.NewTool("hello",
\t\tmcp.WithDescription("Say hello to someone"),
\t\tmcp.WithString("name",
\t\t\tmcp.Description("Name to greet"),
\t\t\tmcp.Required(),
\t\t),
\t)

\ts.AddTool(helloTool, handleHello)

\t// Add more tools here
}

func handleHello(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
\tname := request.GetString("name", "World")

\treturn mcp.NewToolResultText(
\t\tfmt.Sprintf("Hello, %s! Welcome to ${options.name}.", name),
\t), nil
}
`;
}

function testFile(options: Options): string {
  return `package main

import (
\t"context"
\t"testing"

\t"github.com/mark3labs/mcp-go/mcp"
\t"github.com/mark3labs/mcp-go/mcptest"
\t"github.com/mark3labs/mcp-go/server"
)

func setupTestServer(t *testing.T) *mcptest.Server {
\tt.Helper()

\thelloTool := mcp.NewTool("hello",
\t\tmcp.WithDescription("Say hello to someone"),
\t\tmcp.WithString("name",
\t\t\tmcp.Description("Name to greet"),
\t\t\tmcp.Required(),
\t\t),
\t)

\ts, err := mcptest.NewServer(t,
\t\tserver.ServerTool{Tool: helloTool, Handler: handleHello},
\t)
\tif err != nil {
\t\tt.Fatalf("Failed to create test server: %v", err)
\t}

\treturn s
}

func TestListTools(t *testing.T) {
\ts := setupTestServer(t)
\tdefer s.Close()

\tclient := s.Client()
\tresult, err := client.ListTools(context.Background(), mcp.ListToolsRequest{})
\tif err != nil {
\t\tt.Fatalf("ListTools failed: %v", err)
\t}

\tif len(result.Tools) != 1 {
\t\tt.Fatalf("Expected 1 tool, got %d", len(result.Tools))
\t}

\tif result.Tools[0].Name != "hello" {
\t\tt.Fatalf("Expected tool name 'hello', got '%s'", result.Tools[0].Name)
\t}
}

func TestHelloTool(t *testing.T) {
\ts := setupTestServer(t)
\tdefer s.Close()

\tclient := s.Client()

\treq := mcp.CallToolRequest{}
\treq.Params.Name = "hello"
\treq.Params.Arguments = map[string]any{"name": "World"}

\tresult, err := client.CallTool(context.Background(), req)
\tif err != nil {
\t\tt.Fatalf("CallTool failed: %v", err)
\t}

\tif len(result.Content) == 0 {
\t\tt.Fatal("Expected content in result")
\t}

\ttextContent, ok := result.Content[0].(mcp.TextContent)
\tif !ok {
\t\tt.Fatal("Expected TextContent")
\t}

\texpected := "Hello, World! Welcome to ${options.name}."
\tif textContent.Text != expected {
\t\tt.Fatalf("Expected %q, got %q", expected, textContent.Text)
\t}
}
`;
}

function gitignore(options: Options): string {
  return `${options.name}
*.exe
.env
`;
}

function dockerfile(options: Options): string {
  return `FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM alpine:3.21
WORKDIR /app
COPY --from=builder /app/server .
${options.transport === 'streamable-http' ? 'EXPOSE 3000\n' : ''}CMD ["./server"]
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
      - uses: actions/setup-go@v5
        with:
          go-version: "1.23"
      - run: go build ./...
      - run: go test ./...
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
go run .
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

An MCP server built with [create-mcpx](https://github.com/ctonneslan/create-mcpx) and [mcp-go](https://github.com/mark3labs/mcp-go).

## Setup

\`\`\`bash
go mod download
go build .
\`\`\`

${clientSections}## Tools

| Tool | Description |
|------|-------------|
| \`hello\` | Say hello to someone |

## Development

\`\`\`bash
go run .         # Run server
${options.features.includes('tests') ? 'go test ./...    # Run tests\n' : ''}\`\`\`
`;
}
