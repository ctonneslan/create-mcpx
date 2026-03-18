import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { scaffold } from '../scaffold.js';
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

describe('scaffold', () => {
  describe('typescript + stdio', () => {
    const opts: Options = {
      name: 'my-server',
      language: 'typescript',
      transport: 'stdio',
      features: ['tests', 'docker', 'ci'],
    };

    it('creates expected files', async () => {
      await scaffold(opts);
      const dir = path.join(tmpDir, 'my-server');
      const files = await listFiles(dir);

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
      await scaffold(opts);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'my-server', 'package.json'), 'utf-8'),
      );

      expect(pkg.name).toBe('my-server');
      expect(pkg.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
      expect(pkg.scripts.test).toBe('vitest run');
    });

    it('includes zod in dependencies', async () => {
      await scaffold(opts);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'my-server', 'package.json'), 'utf-8'),
      );

      expect(pkg.dependencies.zod).toBeDefined();
    });

    it('uses stdio transport in entry point', async () => {
      await scaffold(opts);
      const entry = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toContain('StdioServerTransport');
      expect(entry).not.toContain('StreamableHTTPServerTransport');
    });

    it('includes shebang for stdio entry point', async () => {
      await scaffold(opts);
      const entry = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toMatch(/^#!\/usr\/bin\/env node/);
    });

    it('generates valid Dockerfile', async () => {
      await scaffold(opts);
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
      await scaffold(opts);
      const ci = await fs.readFile(
        path.join(tmpDir, 'my-server', '.github', 'workflows', 'ci.yml'),
        'utf-8',
      );

      expect(ci).toContain('npm ci');
      expect(ci).toContain('npm run build');
      expect(ci).toContain('npm test');
    });

    it('embeds server name in tool output', async () => {
      await scaffold(opts);
      const tools = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', 'tools.ts'),
        'utf-8',
      );

      expect(tools).toContain('Welcome to my-server');
    });

    it('generates test file with InMemoryTransport', async () => {
      await scaffold(opts);
      const test = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', '__tests__', 'tools.test.ts'),
        'utf-8',
      );

      expect(test).toContain('InMemoryTransport');
      expect(test).toContain("name: 'hello'");
    });
  });

  describe('typescript + streamable-http', () => {
    const opts: Options = {
      name: 'http-server',
      language: 'typescript',
      transport: 'streamable-http',
      features: [],
    };

    it('uses express and StreamableHTTPServerTransport', async () => {
      await scaffold(opts);
      const entry = await fs.readFile(
        path.join(tmpDir, 'http-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toContain('express');
      expect(entry).toContain('StreamableHTTPServerTransport');
      expect(entry).not.toContain('#!/usr/bin/env node');
    });

    it('includes express in dependencies', async () => {
      await scaffold(opts);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'http-server', 'package.json'), 'utf-8'),
      );

      expect(pkg.dependencies.express).toBeDefined();
      expect(pkg.devDependencies['@types/express']).toBeDefined();
    });

    it('omits test files when tests not selected', async () => {
      await scaffold(opts);
      const files = await listFiles(path.join(tmpDir, 'http-server'));
      expect(files).not.toContain('src/__tests__/tools.test.ts');
    });

    it('omits Dockerfile when docker not selected', async () => {
      await scaffold(opts);
      const files = await listFiles(path.join(tmpDir, 'http-server'));
      expect(files).not.toContain('Dockerfile');
    });

    it('omits CI when ci not selected', async () => {
      await scaffold(opts);
      const files = await listFiles(path.join(tmpDir, 'http-server'));
      expect(files).not.toContain('.github/workflows/ci.yml');
    });

    it('exposes port 3000 in Dockerfile for HTTP transport', async () => {
      const httpWithDocker: Options = { ...opts, features: ['docker'] };
      await scaffold(httpWithDocker);
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'http-server', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).toContain('EXPOSE 3000');
    });
  });

  describe('typescript minimal (no features)', () => {
    const opts: Options = {
      name: 'minimal',
      language: 'typescript',
      transport: 'stdio',
      features: [],
    };

    it('creates only core files', async () => {
      await scaffold(opts);
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
      await scaffold(opts);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'minimal', 'package.json'), 'utf-8'),
      );

      expect(pkg.scripts.test).toBeUndefined();
      expect(pkg.devDependencies.vitest).toBeUndefined();
    });
  });

  describe('python + stdio', () => {
    const opts: Options = {
      name: 'py-server',
      language: 'python',
      transport: 'stdio',
      features: ['tests'],
    };

    it('creates expected files', async () => {
      await scaffold(opts);
      const files = await listFiles(path.join(tmpDir, 'py-server'));

      expect(files).toContain('pyproject.toml');
      expect(files).toContain('src/__init__.py');
      expect(files).toContain('src/server.py');
      expect(files).toContain('src/tools.py');
      expect(files).toContain('tests/__init__.py');
      expect(files).toContain('tests/test_tools.py');
    });

    it('uses stdio transport', async () => {
      await scaffold(opts);
      const server = await fs.readFile(
        path.join(tmpDir, 'py-server', 'src', 'server.py'),
        'utf-8',
      );

      expect(server).toContain('transport="stdio"');
    });

    it('generates valid pyproject.toml', async () => {
      await scaffold(opts);
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
      await scaffold(opts);
      const server = await fs.readFile(
        path.join(tmpDir, 'py-server', 'src', 'server.py'),
        'utf-8',
      );

      expect(server).toContain('from mcp.server.fastmcp import FastMCP');
    });
  });

  describe('python + streamable-http', () => {
    const opts: Options = {
      name: 'py-http',
      language: 'python',
      transport: 'streamable-http',
      features: [],
    };

    it('uses streamable-http transport', async () => {
      await scaffold(opts);
      const server = await fs.readFile(
        path.join(tmpDir, 'py-http', 'src', 'server.py'),
        'utf-8',
      );

      expect(server).toContain('transport="streamable-http"');
      expect(server).toContain('port=3000');
    });

    it('includes uvicorn in dependencies', async () => {
      await scaffold(opts);
      const toml = await fs.readFile(
        path.join(tmpDir, 'py-http', 'pyproject.toml'),
        'utf-8',
      );

      expect(toml).toContain('uvicorn');
    });

    it('omits test files without tests feature', async () => {
      await scaffold(opts);
      const files = await listFiles(path.join(tmpDir, 'py-http'));

      expect(files).not.toContain('tests/test_tools.py');
      expect(files).not.toContain('tests/__init__.py');
    });
  });

  describe('python + docker', () => {
    it('exposes port for HTTP transport', async () => {
      await scaffold({
        name: 'py-docker-http',
        language: 'python',
        transport: 'streamable-http',
        features: ['docker'],
      });
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'py-docker-http', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).toContain('EXPOSE 3000');
      expect(dockerfile).toContain('python:3.12-slim');
    });

    it('does not expose port for stdio transport', async () => {
      await scaffold({
        name: 'py-docker-stdio',
        language: 'python',
        transport: 'stdio',
        features: ['docker'],
      });
      const dockerfile = await fs.readFile(
        path.join(tmpDir, 'py-docker-stdio', 'Dockerfile'),
        'utf-8',
      );

      expect(dockerfile).not.toContain('EXPOSE');
    });
  });

  describe('server name embedding', () => {
    it('embeds name in TypeScript server config', async () => {
      await scaffold({ name: 'cool-server', language: 'typescript', transport: 'stdio', features: [] });
      const entry = await fs.readFile(
        path.join(tmpDir, 'cool-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toContain("name: 'cool-server'");
    });

    it('embeds name in Python server config', async () => {
      await scaffold({ name: 'cool-server', language: 'python', transport: 'stdio', features: [] });
      const server = await fs.readFile(
        path.join(tmpDir, 'cool-server', 'src', 'server.py'),
        'utf-8',
      );

      expect(server).toContain('FastMCP("cool-server")');
    });
  });

  describe('README generation', () => {
    it('includes Claude Desktop config for stdio TypeScript', async () => {
      await scaffold({ name: 'ts-stdio', language: 'typescript', transport: 'stdio', features: [] });
      const readme = await fs.readFile(path.join(tmpDir, 'ts-stdio', 'README.md'), 'utf-8');

      expect(readme).toContain('claude_desktop_config.json');
      expect(readme).toContain('ts-stdio');
    });

    it('includes localhost URL for HTTP TypeScript', async () => {
      await scaffold({ name: 'ts-http', language: 'typescript', transport: 'streamable-http', features: [] });
      const readme = await fs.readFile(path.join(tmpDir, 'ts-http', 'README.md'), 'utf-8');

      expect(readme).toContain('http://localhost:3000/mcp');
    });

    it('includes test command when tests enabled', async () => {
      await scaffold({ name: 'with-tests', language: 'typescript', transport: 'stdio', features: ['tests'] });
      const readme = await fs.readFile(path.join(tmpDir, 'with-tests', 'README.md'), 'utf-8');

      expect(readme).toContain('npm test');
    });
  });

  describe('error handling', () => {
    it('throws if directory already exists', async () => {
      await fs.mkdir(path.join(tmpDir, 'existing'));
      await expect(
        scaffold({ name: 'existing', language: 'typescript', transport: 'stdio', features: [] }),
      ).rejects.toThrow('already exists');
    });

    it('returns absolute path to output directory', async () => {
      const result = await scaffold({
        name: 'abs-path-test',
        language: 'typescript',
        transport: 'stdio',
        features: [],
      });

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
