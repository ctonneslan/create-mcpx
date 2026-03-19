import { describe, it, expect } from 'vitest';
import { inferTransport, generateClientConfigs } from '../clients.js';

describe('inferTransport', () => {
  it('returns stdio for Claude Desktop', () => {
    expect(inferTransport(['claude-desktop'])).toBe('stdio');
  });

  it('returns stdio for Cursor', () => {
    expect(inferTransport(['cursor'])).toBe('stdio');
  });

  it('returns stdio for VS Code', () => {
    expect(inferTransport(['vscode'])).toBe('stdio');
  });

  it('returns stdio for Windsurf', () => {
    expect(inferTransport(['windsurf'])).toBe('stdio');
  });

  it('returns stdio for multiple local clients', () => {
    expect(inferTransport(['claude-desktop', 'cursor', 'vscode'])).toBe('stdio');
  });

  it('returns null for empty clients array', () => {
    expect(inferTransport([])).toBeNull();
  });
});

describe('generateClientConfigs', () => {
  describe('typescript + stdio', () => {
    const configs = generateClientConfigs('my-server', 'typescript', 'stdio');

    it('generates configs for all 4 clients', () => {
      expect(configs).toHaveLength(4);
      expect(configs.map((c) => c.client)).toEqual([
        'claude-desktop',
        'cursor',
        'vscode',
        'windsurf',
      ]);
    });

    it('uses node command', () => {
      for (const config of configs) {
        expect(config.snippet).toContain('"node"');
      }
    });

    it('uses dist/index.js args', () => {
      for (const config of configs) {
        expect(config.snippet).toContain('dist/index.js');
      }
    });

    it('has correct Claude Desktop config path', () => {
      const claude = configs.find((c) => c.client === 'claude-desktop')!;
      expect(claude.configPath).toContain('claude_desktop_config.json');
    });

    it('has correct Cursor config path', () => {
      const cursor = configs.find((c) => c.client === 'cursor')!;
      expect(cursor.configPath).toContain('.cursor/mcp.json');
    });

    it('uses mcp.servers key for VS Code', () => {
      const vscode = configs.find((c) => c.client === 'vscode')!;
      expect(vscode.snippet).toContain('mcp.servers');
    });

    it('has correct Windsurf config path', () => {
      const windsurf = configs.find((c) => c.client === 'windsurf')!;
      expect(windsurf.configPath).toContain('windsurf');
      expect(windsurf.configPath).toContain('mcp_config.json');
    });
  });

  describe('python + stdio', () => {
    const configs = generateClientConfigs('py-server', 'python', 'stdio');

    it('uses python command', () => {
      for (const config of configs) {
        expect(config.snippet).toContain('"python"');
      }
    });

    it('uses -m src.server args', () => {
      for (const config of configs) {
        expect(config.snippet).toContain('src.server');
      }
    });
  });

  describe('streamable-http transport', () => {
    const configs = generateClientConfigs('http-server', 'typescript', 'streamable-http');

    it('returns only Claude Desktop config for HTTP', () => {
      expect(configs).toHaveLength(1);
      expect(configs[0].client).toBe('claude-desktop');
    });

    it('uses URL instead of command', () => {
      expect(configs[0].snippet).toContain('http://localhost:3000/mcp');
      expect(configs[0].snippet).not.toContain('"command"');
    });
  });

  describe('server name embedding', () => {
    it('embeds server name in config snippets', () => {
      const configs = generateClientConfigs('custom-name', 'typescript', 'stdio');

      for (const config of configs) {
        expect(config.snippet).toContain('custom-name');
      }
    });
  });
});
