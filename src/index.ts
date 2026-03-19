#!/usr/bin/env node

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { scaffold, dryRun } from './scaffold.js';
import { Options, Language, Transport, Client } from './types.js';
import { inferTransport } from './clients.js';
import { postScaffold } from './post-scaffold.js';

const VALID_LANGUAGES: Language[] = ['typescript', 'python', 'go'];
const VALID_TRANSPORTS: Transport[] = ['stdio', 'streamable-http'];
const VALID_CLIENTS: Client[] = ['claude-desktop', 'cursor', 'vscode', 'windsurf'];
const VALID_FEATURES = ['tests', 'docker', 'ci'];

interface Flags extends Partial<Options> {
  name?: string;
  help?: boolean;
  version?: boolean;
  dryRun?: boolean;
  install?: boolean;
  noGit?: boolean;
}

function parseFlags(argv: string[]): Flags {
  const result: Record<string, string> = {};
  let name: string | undefined;
  let help = false;
  let version = false;
  let isDryRun = false;
  let install = false;
  let noGit = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--version' || arg === '-v') {
      version = true;
    } else if (arg === '--dry-run') {
      isDryRun = true;
    } else if (arg === '--install') {
      install = true;
    } else if (arg === '--no-git') {
      noGit = true;
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
    clients: result.clients?.split(',').filter(Boolean) as Client[] | undefined,
    features: result.features?.split(',').filter(Boolean),
    help,
    version,
    dryRun: isDryRun,
    install,
    noGit,
  };
}

function validateFlags(flags: {
  name: string;
  language: Language;
  transport?: Transport;
  clients?: Client[];
  features?: string[];
}): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(flags.name)) {
    console.error(
      `Error: Invalid name "${flags.name}". Use lowercase letters, numbers, and hyphens (no leading/trailing hyphens).`,
    );
    process.exit(1);
  }

  if (!VALID_LANGUAGES.includes(flags.language)) {
    console.error(
      `Error: Unknown language "${flags.language}". Valid options: ${VALID_LANGUAGES.join(', ')}`,
    );
    process.exit(1);
  }

  if (flags.transport && !VALID_TRANSPORTS.includes(flags.transport)) {
    console.error(
      `Error: Unknown transport "${flags.transport}". Valid options: ${VALID_TRANSPORTS.join(', ')}`,
    );
    process.exit(1);
  }

  if (flags.clients) {
    for (const c of flags.clients) {
      if (!VALID_CLIENTS.includes(c)) {
        console.error(
          `Error: Unknown client "${c}". Valid options: ${VALID_CLIENTS.join(', ')}`,
        );
        process.exit(1);
      }
    }
  }

  if (flags.features) {
    for (const f of flags.features) {
      if (!VALID_FEATURES.includes(f)) {
        console.error(
          `Error: Unknown feature "${f}". Valid options: ${VALID_FEATURES.join(', ')}`,
        );
        process.exit(1);
      }
    }
  }
}

function printUsage(): void {
  console.log(
    `
Usage: create-mcpx [name] [options]

Options:
  --language <lang>       typescript, python, or go
  --clients <list>        Comma-separated: claude-desktop,cursor,vscode,windsurf
  --transport <transport> stdio or streamable-http (auto-detected from clients if omitted)
  --features <list>       Comma-separated: tests,docker,ci
  --install               Install dependencies after scaffolding
  --no-git                Skip git init
  --dry-run               Preview files without writing anything
  -h, --help              Show this help
  -v, --version           Show version

Examples:
  create-mcpx                                    # Interactive mode
  create-mcpx my-server \\
    --language typescript \\
    --clients claude-desktop,cursor               # Auto-selects stdio transport
  create-mcpx my-server \\
    --language go --transport stdio \\
    --features tests,docker --install             # Go server, install deps
  create-mcpx my-server \\
    --language python --dry-run                   # Preview without writing
`.trim(),
  );
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.help) {
    printUsage();
    return;
  }
  if (flags.version) {
    console.log('create-mcpx 0.1.0');
    return;
  }

  // Non-interactive mode: name + language required, transport can be inferred
  if (flags.name && flags.language) {
    validateFlags(flags as { name: string; language: Language });

    const clients = flags.clients ?? [];
    const transport = flags.transport ?? inferTransport(clients) ?? 'stdio';

    const config: Options = {
      name: flags.name,
      language: flags.language,
      transport,
      clients,
      features: flags.features ?? [],
    };

    if (flags.dryRun) {
      const files = dryRun(config);
      console.log(`Would create ${files.length} files in ${config.name}/:\n`);
      for (const file of files) {
        console.log(`  ${file.path}`);
      }
      return;
    }

    const outputDir = await scaffold(config);
    console.log(`Created ${config.name} at ${outputDir}`);

    await postScaffold(outputDir, config, {
      git: !flags.noGit,
      install: flags.install ?? false,
    });
    return;
  }

  // Interactive mode
  p.intro(pc.bgCyan(pc.black(' create-mcpx ')));

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
            { value: 'go', label: 'Go' },
          ],
        }),

      clients: () =>
        p.multiselect({
          message: 'Which clients will connect to this server?',
          options: [
            { value: 'claude-desktop', label: 'Claude Desktop' },
            { value: 'cursor', label: 'Cursor' },
            { value: 'vscode', label: 'VS Code (Copilot)' },
            { value: 'windsurf', label: 'Windsurf' },
          ],
          required: false,
        }),

      transport: ({ results }) => {
        const clients = (results.clients as Client[]) ?? [];
        const inferred = inferTransport(clients);

        if (inferred && clients.length > 0) {
          p.log.info(
            `Transport auto-selected: ${pc.bold(inferred)} (based on your client choices)`,
          );
          return Promise.resolve(inferred);
        }

        return p.select({
          message: 'Which transport?',
          options: [
            { value: 'stdio', label: 'stdio', hint: 'for local clients (Claude Desktop, Cursor, etc.)' },
            { value: 'streamable-http', label: 'Streamable HTTP', hint: 'for remote/web deployments' },
          ],
        });
      },

      features: () =>
        p.multiselect({
          message: 'Include extras?',
          options: [
            { value: 'tests', label: 'Tests', hint: 'vitest, pytest, or go test' },
            { value: 'docker', label: 'Dockerfile' },
            { value: 'ci', label: 'GitHub Actions CI' },
          ],
          required: false,
        }),

      install: () =>
        p.confirm({
          message: 'Install dependencies?',
          initialValue: false,
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
    clients: (options.clients as Client[]) ?? [],
    features: (options.features as string[]) ?? [],
  };

  const s = p.spinner();
  s.start('Scaffolding your MCP server...');

  try {
    const outputDir = await scaffold(config);
    s.stop('Scaffolded!');

    await postScaffold(outputDir, config, {
      git: !flags.noGit,
      install: options.install as boolean,
      spinner: s,
    });

    const installCmd =
      config.language === 'typescript'
        ? 'npm install'
        : config.language === 'python'
          ? 'pip install -e ".[dev]"'
          : 'go mod download';

    const runCmd =
      config.language === 'typescript'
        ? 'npm run dev'
        : config.language === 'python'
          ? 'python -m src.server'
          : 'go run .';

    const steps = [`cd ${config.name}`];
    if (!options.install) steps.push(installCmd);
    steps.push(runCmd);

    p.note(steps.join('\n'), 'Next steps');
    p.outro(pc.green(`Your MCP server is ready at ${pc.bold(outputDir)}`));
  } catch (err) {
    s.stop('Failed!');
    p.log.error(String(err));
    process.exit(1);
  }
}

main();
