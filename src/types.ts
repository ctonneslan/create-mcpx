export type Language = 'typescript' | 'python' | 'go';
export type Transport = 'stdio' | 'streamable-http';
export type Client = 'claude-desktop' | 'cursor' | 'vscode' | 'windsurf';

export interface Options {
  name: string;
  language: Language;
  transport: Transport;
  clients: Client[];
  features: string[];
}
