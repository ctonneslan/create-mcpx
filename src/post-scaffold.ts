import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Options } from './types.js';

const exec = promisify(execFile);

interface PostScaffoldOptions {
  git: boolean;
  install: boolean;
  spinner?: { start: (msg: string) => void; stop: (msg: string) => void };
}

export async function postScaffold(
  outputDir: string,
  config: Options,
  opts: PostScaffoldOptions,
): Promise<void> {
  // Git init
  if (opts.git) {
    try {
      await exec('git', ['init'], { cwd: outputDir });
      await exec('git', ['add', '-A'], { cwd: outputDir });
      await exec('git', ['commit', '-m', 'Initial commit from create-mcpx'], {
        cwd: outputDir,
      });
    } catch {
      // Git not available or init failed, non-critical
    }
  }

  // Install dependencies
  if (opts.install) {
    opts.spinner?.start('Installing dependencies...');

    try {
      if (config.language === 'typescript') {
        await exec('npm', ['install'], { cwd: outputDir, timeout: 120_000 });
      } else if (config.language === 'python') {
        await exec('pip', ['install', '-e', '.[dev]'], { cwd: outputDir, timeout: 120_000 });
      } else if (config.language === 'go') {
        await exec('go', ['mod', 'download'], { cwd: outputDir, timeout: 120_000 });
      }

      opts.spinner?.stop('Dependencies installed!');
    } catch (err) {
      opts.spinner?.stop('Dependency install failed (you can install manually).');
    }
  }
}
