#!/usr/bin/env node

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { scaffold } from './scaffold.js';
import { Options, Language, Transport } from './types.js';

const VALID_LANGUAGES: Language[] = ['typescript', 'python'];
const VALID_TRANSPORTS: Transport[] = ['stdio', 'streamable-http'];
const VALID_FEATURES = ['tests', 'docker', 'ci'];

interface Flags extends Partial<Options> {
  name?: string;
  help?: boolean;
  version?: boolean;
}

function parseFlags(argv: string[]): Flags {
  const result: Record<string, string> = {};
  let name: string | undefined;
  let help = false;
  let version = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--version' || arg === '-v') {
      version = true;
    } else if (arg.startsWith('--') && i + 1 < argv.length) {
      result[arg.slice(2)] = argv[++i];
    } else if (!arg.startsWith('-')) {
      name = arg;
    }
  }

  return {
    name,
    language: result.language as Language | undefined,
    transport: result.transport as Transport | undefined,
    features: result.features?.split(',').filter(Boolean),
    help,
    version,
  };
}

function validateFlags(flags: { name: string; language: Language; transport: Transport; features?: string[] }): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(flags.name)) {
    console.error(`Error: Invalid name "${flags.name}". Use lowercase letters, numbers, and hyphens (no leading/trailing hyphens).`);
    process.exit(1);
  }

  if (!VALID_LANGUAGES.includes(flags.language)) {
    console.error(`Error: Unknown language "${flags.language}". Valid options: ${VALID_LANGUAGES.join(', ')}`);
    process.exit(1);
  }

  if (!VALID_TRANSPORTS.includes(flags.transport)) {
    console.error(`Error: Unknown transport "${flags.transport}". Valid options: ${VALID_TRANSPORTS.join(', ')}`);
    process.exit(1);
  }

  if (flags.features) {
    for (const f of flags.features) {
      if (!VALID_FEATURES.includes(f)) {
        console.error(`Error: Unknown feature "${f}". Valid options: ${VALID_FEATURES.join(', ')}`);
        process.exit(1);
      }
    }
  }
}

function printUsage(): void {
  console.log(`
Usage: create-mcp-server [name] [options]

Options:
  --language <lang>       typescript or python
  --transport <transport> stdio or streamable-http
  --features <list>       Comma-separated: tests,docker,ci
  -h, --help              Show this help
  -v, --version           Show version

Examples:
  create-mcp-server                              # Interactive mode
  create-mcp-server my-server                    # Interactive with name pre-filled
  create-mcp-server my-server \\
    --language typescript \\
    --transport stdio \\
    --features tests,docker,ci                   # Non-interactive
`.trim());
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  // --help / --version
  if (flags.help) {
    printUsage();
    return;
  }
  if (flags.version) {
    console.log('create-mcp-server 0.1.0');
    return;
  }

  // Non-interactive mode: all flags provided
  if (flags.name && flags.language && flags.transport) {
    validateFlags(flags as { name: string; language: Language; transport: Transport });
    const config: Options = {
      name: flags.name,
      language: flags.language,
      transport: flags.transport,
      features: flags.features ?? [],
    };
    const outputDir = await scaffold(config);
    console.log(`Created ${config.name} at ${outputDir}`);
    return;
  }

  p.intro(pc.bgCyan(pc.black(' create-mcp-server ')));

  const projectName = flags.name;

  const options = await p.group(
    {
      name: () =>
        projectName
          ? Promise.resolve(projectName)
          : p.text({
              message: 'What is your server name?',
              placeholder: 'my-mcp-server',
              validate: (value) => {
                if (!value) return 'Name is required';
                if (!/^[a-z0-9-]+$/.test(value))
                  return 'Use lowercase letters, numbers, and hyphens only';
              },
            }),

      language: () =>
        p.select({
          message: 'Which language?',
          options: [
            { value: 'typescript', label: 'TypeScript', hint: 'recommended' },
            { value: 'python', label: 'Python' },
          ],
        }),

      transport: () =>
        p.select({
          message: 'Which transport?',
          options: [
            { value: 'stdio', label: 'stdio', hint: 'for CLI tools like Claude Desktop' },
            { value: 'streamable-http', label: 'Streamable HTTP', hint: 'for web deployments' },
          ],
        }),

      features: () =>
        p.multiselect({
          message: 'Include extras?',
          options: [
            { value: 'tests', label: 'Tests', hint: 'vitest or pytest' },
            { value: 'docker', label: 'Dockerfile' },
            { value: 'ci', label: 'GitHub Actions CI' },
          ],
          required: false,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Cancelled.');
        process.exit(0);
      },
    },
  );

  const config: Options = {
    name: options.name as string,
    language: options.language as Language,
    transport: options.transport as Transport,
    features: (options.features as string[]) ?? [],
  };

  const s = p.spinner();
  s.start('Scaffolding your MCP server...');

  try {
    const outputDir = await scaffold(config);
    s.stop('Done!');

    p.note(
      [
        `cd ${config.name}`,
        config.language === 'typescript' ? 'npm install' : 'pip install -e ".[dev]"',
        config.language === 'typescript' ? 'npm run dev' : 'python -m src.server',
      ].join('\n'),
      'Next steps',
    );

    p.outro(pc.green(`Your MCP server is ready at ${pc.bold(outputDir)}`));
  } catch (err) {
    s.stop('Failed!');
    p.log.error(String(err));
    process.exit(1);
  }
}

main();
