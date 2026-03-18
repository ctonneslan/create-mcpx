export type Language = 'typescript' | 'python';
export type Transport = 'stdio' | 'streamable-http';

export interface Options {
  name: string;
  language: Language;
  transport: Transport;
  features: string[];
}
