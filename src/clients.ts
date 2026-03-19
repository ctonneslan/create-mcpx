import { Client, Language, Transport } from './types.js';

export interface ClientConfig {
  client: Client;
  label: string;
  configPath: string;
  snippet: string;
}

/** Infer the best transport based on which clients are targeted. */
export function inferTransport(clients: Client[]): Transport | null {
  // All these clients use stdio for local servers
  const stdioClients: Client[] = ['claude-desktop', 'cursor', 'vscode', 'windsurf'];

  if (clients.length === 0) return null;

  // If all selected clients support stdio, default to stdio
  const allStdio = clients.every((c) => stdioClients.includes(c));
  if (allStdio) return 'stdio';

  // Fallback
  return 'stdio';
}

export function generateClientConfigs(
  serverName: string,
  language: Language,
  transport: Transport,
): ClientConfig[] {
  const command = language === 'typescript' ? 'node' : 'python';
  const args =
    language === 'typescript'
      ? `["dist/index.js"]`
      : `["-m", "src.server"]`;

  if (transport === 'streamable-http') {
    return [
      {
        client: 'claude-desktop',
        label: 'Claude Desktop',
        configPath: claudeDesktopConfigPath(),
        snippet: JSON.stringify(
          {
            mcpServers: {
              [serverName]: {
                url: 'http://localhost:3000/mcp',
              },
            },
          },
          null,
          2,
        ),
      },
    ];
  }

  // stdio configs for each client
  return [
    {
      client: 'claude-desktop',
      label: 'Claude Desktop',
      configPath: claudeDesktopConfigPath(),
      snippet: JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              command,
              args: JSON.parse(args),
            },
          },
        },
        null,
        2,
      ),
    },
    {
      client: 'cursor',
      label: 'Cursor',
      configPath: '.cursor/mcp.json (in your project root)',
      snippet: JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              command,
              args: JSON.parse(args),
            },
          },
        },
        null,
        2,
      ),
    },
    {
      client: 'vscode',
      label: 'VS Code',
      configPath: '.vscode/settings.json',
      snippet: JSON.stringify(
        {
          'mcp.servers': {
            [serverName]: {
              command,
              args: JSON.parse(args),
            },
          },
        },
        null,
        2,
      ),
    },
    {
      client: 'windsurf',
      label: 'Windsurf',
      configPath: '~/.codeium/windsurf/mcp_config.json',
      snippet: JSON.stringify(
        {
          mcpServers: {
            [serverName]: {
              command,
              args: JSON.parse(args),
            },
          },
        },
        null,
        2,
      ),
    },
  ];
}

function claudeDesktopConfigPath(): string {
  return process.platform === 'darwin'
    ? '~/Library/Application Support/Claude/claude_desktop_config.json'
    : process.platform === 'win32'
      ? '%APPDATA%\\Claude\\claude_desktop_config.json'
      : '~/.config/Claude/claude_desktop_config.json';
}
