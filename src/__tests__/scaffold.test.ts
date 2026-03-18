import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { scaffold } from '../scaffold.js';
import { Options } from '../types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-mcp-'));
  process.chdir(tmpDir);
});

afterEach(async () => {
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

    it('uses stdio transport in entry point', async () => {
      await scaffold(opts);
      const entry = await fs.readFile(
        path.join(tmpDir, 'my-server', 'src', 'index.ts'),
        'utf-8',
      );

      expect(entry).toContain('StdioServerTransport');
      expect(entry).not.toContain('StreamableHTTPServerTransport');
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
    });

    it('includes express in dependencies', async () => {
      await scaffold(opts);
      const pkg = JSON.parse(
        await fs.readFile(path.join(tmpDir, 'http-server', 'package.json'), 'utf-8'),
      );

      expect(pkg.dependencies.express).toBeDefined();
    });

    it('omits test files when tests not selected', async () => {
      await scaffold(opts);
      const files = await listFiles(path.join(tmpDir, 'http-server'));
      expect(files).not.toContain('src/__tests__/tools.test.ts');
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
  });

  describe('error handling', () => {
    it('throws if directory already exists', async () => {
      await fs.mkdir(path.join(tmpDir, 'existing'));
      await expect(
        scaffold({ name: 'existing', language: 'typescript', transport: 'stdio', features: [] }),
      ).rejects.toThrow('already exists');
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
