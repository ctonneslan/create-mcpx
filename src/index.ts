#!/usr/bin/env node

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { scaffold } from './scaffold.js';
import { Options, Language, Transport } from './types.js';

function parseFlags(argv: string[]): Partial<Options> & { name?: string } {
  const result: Record<string, string> = {};
  let name: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--') && i + 1 < argv.length) {
      result[arg.slice(2)] = argv[++i];
    } else if (!arg.startsWith('-')) {
      name = arg;
    }
  }

  return {
    name,
    language: result.language as Language | undefined,
    transport: result.transport as Transport | undefined,
    features: result.features?.split(','),
  };
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  // Non-interactive mode: all flags provided
  if (flags.name && flags.language && flags.transport) {
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
