import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { scaffold, dryRun } from '../scaffold.js';
import { Options } from '../types.js';

let tmpDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-mcp-'));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/** Helper to create Options with defaults. */
function opts(overrides: Partial<Options> & Pick<Options, 'name'>): Options {
  return {
    language: 'typescript',
    transport: 'stdio',
    clients: [],
    features: [],
    ...overrides,
  };
}

describe('scaffold', () => {
  describe('typescript + stdio', () => {
    const o = opts({
      name: 'my-server',
      features: ['tests', 'docker', 'ci'],
    });

    it('creates expected files', async () => {
      await scaffold(o);
      const files = await listFiles(path.join(tmpDir, 'my-server'));

      expect(files).toContain('package.json');
      expect(files).toContain('tsconfig.json');
      expect(files).toContain('src/index.ts');
      expect(files).toContain('src/tools.ts');
      expect(files).toContain('src/__tests__/tools.test.ts');
      expect(files).toContain('Dockerfile');
      expect(files).toContain('.github/workflows/ci.yml');
      expect(files).toContain('.gitignore');
      expect(files).toContain('README.md');
    });

    it('generates valid package.json', async () => {
      await scaffold(o);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'my-server', 'package.json'), 'utf-8'),
      );

      expect(pkg.name).toBe('my-server');
      expect(pkg.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
      expect(pkg.scripts.test).toBe('vitest run');
    });

    it('includes zod in dependencies', async () => {
      await scaffold(o);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'my-server', 'package.json'), 'utf-8'),
      );

      expect(pkg.dependencies.zod).toBeDefined();
    });

    it('uses stdio transport in entry point', async () => {
      await scaffold(o);
      const entry = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toContain('StdioServerTransport');
      expect(entry).not.toContain('StreamableHTTPServerTransport');
    });

    it('includes shebang for stdio entry point', async () => {
      await scaffold(o);
      const entry = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toMatch(/^#!\/usr\/bin\/env node/);
    });

    it('generates valid Dockerfile', async () => {
      await scaffold(o);
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'my-server', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).toContain('FROM node:22-slim AS builder');
      expect(dockerfile).toContain('npm ci');
      expect(dockerfile).toContain('npm run build');
      expect(dockerfile).not.toContain('EXPOSE');
    });

    it('generates valid CI workflow', async () => {
      await scaffold(o);
      const ci = await fs.readFile(
        path.join(tmpDir, 'my-server', '.github', 'workflows', 'ci.yml'),
        'utf-8',
      );

      expect(ci).toContain('npm ci');
      expect(ci).toContain('npm run build');
      expect(ci).toContain('npm test');
    });

    it('embeds server name in tool output', async () => {
      await scaffold(o);
      const tools = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', 'tools.ts'),
        'utf-8',
      );

      expect(tools).toContain('Welcome to my-server');
    });

    it('generates test file with InMemoryTransport', async () => {
      await scaffold(o);
      const test = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', '__tests__', 'tools.test.ts'),
        'utf-8',
      );

      expect(test).toContain('InMemoryTransport');
      expect(test).toContain("name: 'hello'");
    });
  });

  describe('typescript + streamable-http', () => {
    const o = opts({
      name: 'http-server',
      transport: 'streamable-http',
    });

    it('uses express and StreamableHTTPServerTransport', async () => {
      await scaffold(o);
      const entry = await fs.readFile(
        path.join(tmpDir, 'http-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toContain('express');
      expect(entry).toContain('StreamableHTTPServerTransport');
      expect(entry).not.toContain('#!/usr/bin/env node');
    });

    it('includes express in dependencies', async () => {
      await scaffold(o);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'http-server', 'package.json'), 'utf-8'),
      );

      expect(pkg.dependencies.express).toBeDefined();
      expect(pkg.devDependencies['@types/express']).toBeDefined();
    });

    it('omits test files when tests not selected', async () => {
      await scaffold(o);
      const files = await listFiles(path.join(tmpDir, 'http-server'));
      expect(files).not.toContain('src/__tests__/tools.test.ts');
    });

    it('omits Dockerfile when docker not selected', async () => {
      await scaffold(o);
      const files = await listFiles(path.join(tmpDir, 'http-server'));
      expect(files).not.toContain('Dockerfile');
    });

    it('omits CI when ci not selected', async () => {
      await scaffold(o);
      const files = await listFiles(path.join(tmpDir, 'http-server'));
      expect(files).not.toContain('.github/workflows/ci.yml');
    });

    it('exposes port 3000 in Dockerfile for HTTP transport', async () => {
      await scaffold(opts({ name: 'http-server-docker', transport: 'streamable-http', features: ['docker'] }));
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'http-server-docker', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).toContain('EXPOSE 3000');
    });
  });

  describe('typescript minimal (no features)', () => {
    const o = opts({ name: 'minimal' });

    it('creates only core files', async () => {
      await scaffold(o);
      const files = await listFiles(path.join(tmpDir, 'minimal'));

      expect(files).toContain('package.json');
      expect(files).toContain('tsconfig.json');
      expect(files).toContain('src/index.ts');
      expect(files).toContain('src/tools.ts');
      expect(files).toContain('.gitignore');
      expect(files).toContain('README.md');

      expect(files).not.toContain('Dockerfile');
      expect(files).not.toContain('.github/workflows/ci.yml');
      expect(files).not.toContain('src/__tests__/tools.test.ts');
    });

    it('does not include test script without tests feature', async () => {
      await scaffold(o);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'minimal', 'package.json'), 'utf-8'),
      );

      expect(pkg.scripts.test).toBeUndefined();
      expect(pkg.devDependencies.vitest).toBeUndefined();
    });
  });

  describe('python + stdio', () => {
    const o = opts({
      name: 'py-server',
      language: 'python',
      features: ['tests'],
    });

    it('creates expected files', async () => {
      await scaffold(o);
      const files = await listFiles(path.join(tmpDir, 'py-server'));

      expect(files).toContain('pyproject.toml');
      expect(files).toContain('src/__init__.py');
      expect(files).toContain('src/server.py');
      expect(files).toContain('src/tools.py');
      expect(files).toContain('tests/__init__.py');
      expect(files).toContain('tests/test_tools.py');
    });

    it('uses stdio transport', async () => {
      await scaffold(o);
      const server = await fs.readFile(
        path.join(tmpDir, 'py-server', 'src', 'server.py'),
        'utf-8',
      );

      expect(server).toContain('transport="stdio"');
    });

    it('generates valid pyproject.toml', async () => {
      await scaffold(o);
      const toml = await fs.readFile(
        path.join(tmpDir, 'py-server', 'pyproject.toml'),
        'utf-8',
      );

      expect(toml).toContain('[project]');
      expect(toml).toContain('name = "py-server"');
      expect(toml).toContain('mcp[cli]');
      expect(toml).toContain('pytest');
    });

    it('uses FastMCP in server template', async () => {
      await scaffold(o);
      const server = await fs.readFile(
        path.join(tmpDir, 'py-server', 'src', 'server.py'),
        'utf-8',
      );

      expect(server).toContain('from mcp.server.fastmcp import FastMCP');
    });
  });

  describe('python + streamable-http', () => {
    const o = opts({
      name: 'py-http',
      language: 'python',
      transport: 'streamable-http',
    });

    it('uses streamable-http transport', async () => {
      await scaffold(o);
      const server = await fs.readFile(
        path.join(tmpDir, 'py-http', 'src', 'server.py'),
        'utf-8',
      );

      expect(server).toContain('transport="streamable-http"');
      expect(server).toContain('port=3000');
    });

    it('includes uvicorn in dependencies', async () => {
      await scaffold(o);
      const toml = await fs.readFile(
        path.join(tmpDir, 'py-http', 'pyproject.toml'),
        'utf-8',
      );

      expect(toml).toContain('uvicorn');
    });

    it('omits test files without tests feature', async () => {
      await scaffold(o);
      const files = await listFiles(path.join(tmpDir, 'py-http'));

      expect(files).not.toContain('tests/test_tools.py');
      expect(files).not.toContain('tests/__init__.py');
    });
  });

  describe('python + docker', () => {
    it('exposes port for HTTP transport', async () => {
      await scaffold(opts({
        name: 'py-docker-http',
        language: 'python',
        transport: 'streamable-http',
        features: ['docker'],
      }));
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'py-docker-http', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).toContain('EXPOSE 3000');
      expect(dockerfile).toContain('python:3.12-slim');
    });

    it('does not expose port for stdio transport', async () => {
      await scaffold(opts({
        name: 'py-docker-stdio',
        language: 'python',
        features: ['docker'],
      }));
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'py-docker-stdio', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).not.toContain('EXPOSE');
    });
  });

  describe('server name embedding', () => {
    it('embeds name in TypeScript server config', async () => {
      await scaffold(opts({ name: 'cool-server' }));
      const entry = await fs.readFile(
        path.join(tmpDir, 'cool-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toContain("name: 'cool-server'");
    });

    it('embeds name in Python server config', async () => {
      await scaffold(opts({ name: 'cool-server', language: 'python' }));
      const server = await fs.readFile(
        path.join(tmpDir, 'cool-server', 'src', 'server.py'),
        'utf-8',
      );

      expect(server).toContain('FastMCP("cool-server")');
    });
  });

  describe('client config in README', () => {
    it('includes all client configs when no clients specified (stdio)', async () => {
      await scaffold(opts({ name: 'all-clients' }));
      const readme = await fs.readFile(path.join(tmpDir, 'all-clients', 'README.md'), 'utf-8');

      expect(readme).toContain('Claude Desktop');
      expect(readme).toContain('Cursor');
      expect(readme).toContain('VS Code');
      expect(readme).toContain('Windsurf');
    });

    it('includes only selected client configs', async () => {
      await scaffold(opts({
        name: 'cursor-only',
        clients: ['cursor'],
      }));
      const readme = await fs.readFile(path.join(tmpDir, 'cursor-only', 'README.md'), 'utf-8');

      expect(readme).toContain('Cursor');
      expect(readme).toContain('.cursor/mcp.json');
      expect(readme).not.toContain('### Claude Desktop');
      expect(readme).not.toContain('### VS Code');
      expect(readme).not.toContain('### Windsurf');
    });

    it('uses correct VS Code config format', async () => {
      await scaffold(opts({
        name: 'vscode-server',
        clients: ['vscode'],
      }));
      const readme = await fs.readFile(path.join(tmpDir, 'vscode-server', 'README.md'), 'utf-8');

      expect(readme).toContain('mcp.servers');
      expect(readme).toContain('.vscode/settings.json');
    });

    it('uses URL-based config for HTTP transport', async () => {
      await scaffold(opts({
        name: 'http-cfg',
        transport: 'streamable-http',
        clients: ['claude-desktop'],
      }));
      const readme = await fs.readFile(path.join(tmpDir, 'http-cfg', 'README.md'), 'utf-8');

      expect(readme).toContain('http://localhost:3000/mcp');
    });

    it('uses command-based config for stdio transport', async () => {
      await scaffold(opts({
        name: 'stdio-cfg',
        clients: ['claude-desktop'],
      }));
      const readme = await fs.readFile(path.join(tmpDir, 'stdio-cfg', 'README.md'), 'utf-8');

      expect(readme).toContain('"command"');
      expect(readme).toContain('"node"');
    });

    it('uses python command for Python stdio projects', async () => {
      await scaffold(opts({
        name: 'py-cfg',
        language: 'python',
        clients: ['claude-desktop'],
      }));
      const readme = await fs.readFile(path.join(tmpDir, 'py-cfg', 'README.md'), 'utf-8');

      expect(readme).toContain('"python"');
      expect(readme).toContain('src.server');
    });

    it('includes multiple selected clients', async () => {
      await scaffold(opts({
        name: 'multi-client',
        clients: ['claude-desktop', 'cursor'],
      }));
      const readme = await fs.readFile(path.join(tmpDir, 'multi-client', 'README.md'), 'utf-8');

      expect(readme).toContain('### Claude Desktop');
      expect(readme).toContain('### Cursor');
      expect(readme).not.toContain('### VS Code');
    });
  });

  describe('README generation', () => {
    it('includes localhost URL for HTTP TypeScript', async () => {
      await scaffold(opts({ name: 'ts-http', transport: 'streamable-http' }));
      const readme = await fs.readFile(path.join(tmpDir, 'ts-http', 'README.md'), 'utf-8');

      expect(readme).toContain('http://localhost:3000/mcp');
    });

    it('includes test command when tests enabled', async () => {
      await scaffold(opts({ name: 'with-tests', features: ['tests'] }));
      const readme = await fs.readFile(path.join(tmpDir, 'with-tests', 'README.md'), 'utf-8');

      expect(readme).toContain('npm test');
    });
  });

  describe('go + stdio', () => {
    const o = opts({
      name: 'go-server',
      language: 'go',
      features: ['tests', 'docker', 'ci'],
    });

    it('creates expected files', async () => {
      await scaffold(o);
      const files = await listFiles(path.join(tmpDir, 'go-server'));

      expect(files).toContain('go.mod');
      expect(files).toContain('main.go');
      expect(files).toContain('tools.go');
      expect(files).toContain('tools_test.go');
      expect(files).toContain('Dockerfile');
      expect(files).toContain('.github/workflows/ci.yml');
      expect(files).toContain('.gitignore');
      expect(files).toContain('README.md');
    });

    it('generates valid go.mod', async () => {
      await scaffold(o);
      const gomod = await fs.readFile(
        path.join(tmpDir, 'go-server', 'go.mod'),
        'utf-8',
      );

      expect(gomod).toContain('module go-server');
      expect(gomod).toContain('github.com/mark3labs/mcp-go');
    });

    it('uses stdio transport in main.go', async () => {
      await scaffold(o);
      const main = await fs.readFile(
        path.join(tmpDir, 'go-server', 'main.go'),
        'utf-8',
      );

      expect(main).toContain('ServeStdio');
      expect(main).not.toContain('StreamableHTTPServer');
    });

    it('uses mcp-go SDK patterns in tools', async () => {
      await scaffold(o);
      const tools = await fs.readFile(
        path.join(tmpDir, 'go-server', 'tools.go'),
        'utf-8',
      );

      expect(tools).toContain('mcp.NewTool');
      expect(tools).toContain('mcp.WithDescription');
      expect(tools).toContain('mcp.NewToolResultText');
    });

    it('uses mcptest package in tests', async () => {
      await scaffold(o);
      const test = await fs.readFile(
        path.join(tmpDir, 'go-server', 'tools_test.go'),
        'utf-8',
      );

      expect(test).toContain('mcptest');
      expect(test).toContain('TestListTools');
      expect(test).toContain('TestHelloTool');
    });

    it('generates multi-stage Dockerfile', async () => {
      await scaffold(o);
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'go-server', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).toContain('golang:1.23-alpine AS builder');
      expect(dockerfile).toContain('CGO_ENABLED=0');
      expect(dockerfile).toContain('alpine:3.21');
      expect(dockerfile).not.toContain('EXPOSE');
    });
  });

  describe('go + streamable-http', () => {
    it('uses StreamableHTTPServer', async () => {
      await scaffold(opts({
        name: 'go-http',
        language: 'go',
        transport: 'streamable-http',
      }));
      const main = await fs.readFile(
        path.join(tmpDir, 'go-http', 'main.go'),
        'utf-8',
      );

      expect(main).toContain('StreamableHTTPServer');
      expect(main).toContain(':3000');
    });

    it('exposes port in Dockerfile', async () => {
      await scaffold(opts({
        name: 'go-http-docker',
        language: 'go',
        transport: 'streamable-http',
        features: ['docker'],
      }));
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'go-http-docker', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).toContain('EXPOSE 3000');
    });
  });

  describe('go client configs', () => {
    it('uses go run command in client configs', async () => {
      await scaffold(opts({
        name: 'go-cfg',
        language: 'go',
        clients: ['claude-desktop'],
      }));
      const readme = await fs.readFile(path.join(tmpDir, 'go-cfg', 'README.md'), 'utf-8');

      expect(readme).toContain('"go"');
      expect(readme).toContain('"run"');
    });
  });

  describe('dry run', () => {
    it('returns file list without writing anything', () => {
      const files = dryRun(opts({ name: 'preview' }));

      expect(files.length).toBeGreaterThan(0);
      expect(files.map((f) => f.path)).toContain('package.json');
      expect(files.map((f) => f.path)).toContain('src/index.ts');
    });

    it('includes optional files when features selected', () => {
      const files = dryRun(opts({
        name: 'preview',
        features: ['tests', 'docker', 'ci'],
      }));

      const paths = files.map((f) => f.path);
      expect(paths).toContain('Dockerfile');
      expect(paths).toContain('.github/workflows/ci.yml');
      expect(paths).toContain('src/__tests__/tools.test.ts');
    });

    it('works for all languages', () => {
      const tsFiles = dryRun(opts({ name: 'ts', language: 'typescript' }));
      const pyFiles = dryRun(opts({ name: 'py', language: 'python' }));
      const goFiles = dryRun(opts({ name: 'go', language: 'go' }));

      expect(tsFiles.map((f) => f.path)).toContain('package.json');
      expect(pyFiles.map((f) => f.path)).toContain('pyproject.toml');
      expect(goFiles.map((f) => f.path)).toContain('go.mod');
    });

    it('does not create any files on disk', async () => {
      dryRun(opts({ name: 'ghost' }));

      // Directory should not exist
      const exists = await fs.access(path.join(tmpDir, 'ghost')).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe('error handling', () => {
    it('throws if directory already exists', async () => {
      await fs.mkdir(path.join(tmpDir, 'existing'));
      await expect(scaffold(opts({ name: 'existing' }))).rejects.toThrow('already exists');
    });

    it('returns absolute path to output directory', async () => {
      const result = await scaffold(opts({ name: 'abs-path-test' }));

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('abs-path-test');
    });
  });
});

async function listFiles(dir: string, prefix = ''): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(dir, entry.name), rel)));
    } else {
      files.push(rel);
    }
  }

  return files;
}
