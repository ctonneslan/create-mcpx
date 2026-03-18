import { Options } from '../types.js';
import { GeneratedFile } from '../scaffold.js';

export function generateTypeScript(options: Options): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({ path: 'package.json', content: packageJson(options) });
  files.push({ path: 'tsconfig.json', content: tsconfig() });
  files.push({ path: 'src/index.ts', content: entrypoint(options) });
  files.push({ path: 'src/tools.ts', content: tools(options) });
  files.push({ path: '.gitignore', content: gitignore() });
  files.push({ path: 'README.md', content: readme(options) });

  if (options.features.includes('tests')) {
    files.push({ path: 'src/__tests__/tools.test.ts', content: testFile(options) });
  }

  if (options.features.includes('docker')) {
    files.push({ path: 'Dockerfile', content: dockerfile(options) });
  }

  if (options.features.includes('ci')) {
    files.push({ path: '.github/workflows/ci.yml', content: ciWorkflow() });
  }

  return files;
}

function packageJson(options: Options): string {
  const deps: Record<string, string> = {
    '@modelcontextprotocol/sdk': '^1.12.0',
    zod: '^3.25.0',
  };

  if (options.transport === 'streamable-http') {
    deps['express'] = '^5.1.0';
  }

  const devDeps: Record<string, string> = {
    '@types/node': '^22.15.0',
    typescript: '^5.8.3',
  };

  if (options.features.includes('tests')) {
    devDeps['vitest'] = '^3.1.0';
  }

  if (options.transport === 'streamable-http') {
    devDeps['@types/express'] = '^5.0.0';
  }

  const scripts: Record<string, string> = {
    build: 'tsc',
    dev: 'tsc --watch',
    start: 'node dist/index.js',
  };

  if (options.features.includes('tests')) {
    scripts.test = 'vitest run';
  }

  const pkg = {
    name: options.name,
    version: '0.1.0',
    description: `${options.name} MCP server`,
    type: 'module',
    main: 'dist/index.js',
    scripts,
    dependencies: deps,
    devDependencies: devDeps,
  };

  return JSON.stringify(pkg, null, 2) + '\n';
}

function tsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'Node16',
        moduleResolution: 'Node16',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        sourceMap: true,
      },
      include: ['src'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2,
  ) + '\n';
}

function entrypoint(options: Options): string {
  if (options.transport === 'stdio') {
    return `#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';

const server = new McpServer({
  name: '${options.name}',
  version: '0.1.0',
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
`;
  }

  // Streamable HTTP
  return `import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools } from './tools.js';

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const server = new McpServer({
    name: '${options.name}',
    version: '0.1.0',
  });

  registerTools(server);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, () => {
  console.log(\`MCP server listening on http://localhost:\${port}/mcp\`);
});
`;
}

function tools(options: Options): string {
  return `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerTools(server: McpServer): void {
  server.tool(
    'hello',
    'Say hello to someone',
    { name: z.string().describe('Name to greet') },
    async ({ name }) => ({
      content: [{ type: 'text', text: \`Hello, \${name}! Welcome to ${options.name}.\` }],
    }),
  );

  // Add more tools here
}
`;
}

function testFile(options: Options): string {
  return `import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from '../tools.js';

describe('${options.name} tools', () => {
  async function createTestClient(): Promise<Client> {
    const server = new McpServer({
      name: '${options.name}',
      version: '0.1.0',
    });

    registerTools(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: 'test-client', version: '0.1.0' });
    await client.connect(clientTransport);

    return client;
  }

  it('should list tools', async () => {
    const client = await createTestClient();
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('hello');
  });

  it('should call hello tool', async () => {
    const client = await createTestClient();
    const result = await client.callTool({ name: 'hello', arguments: { name: 'World' } });
    expect(result.content).toEqual([
      { type: 'text', text: 'Hello, World! Welcome to ${options.name}.' },
    ]);
  });
});
`;
}

function gitignore(): string {
  return `node_modules/
dist/
*.tsbuildinfo
.env
`;
}

function dockerfile(options: Options): string {
  return `FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
${options.transport === 'streamable-http' ? 'EXPOSE 3000\n' : ''}CMD ["node", "dist/index.js"]
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
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
`;
}

function readme(options: Options): string {
  const installCmd =
    options.transport === 'stdio'
      ? `## Usage with Claude Desktop

Add to your Claude Desktop config (\`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "${options.name}": {
      "command": "node",
      "args": ["${options.name}/dist/index.js"]
    }
  }
}
\`\`\``
      : `## Usage

Start the server:

\`\`\`bash
npm start
\`\`\`

The server will be available at \`http://localhost:3000/mcp\`.`;

  return `# ${options.name}

An MCP server built with [create-mcp-server](https://github.com/ctonneslan/create-mcp-server).

## Setup

\`\`\`bash
npm install
npm run build
\`\`\`

${installCmd}

## Tools

| Tool | Description |
|------|-------------|
| \`hello\` | Say hello to someone |

## Development

\`\`\`bash
npm run dev    # Watch mode
${options.features.includes('tests') ? 'npm test       # Run tests\n' : ''}\`\`\`
`;
}
