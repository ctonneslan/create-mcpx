import fs from 'node:fs/promises';
import path from 'node:path';
import { Options } from './types.js';
import { generateTypeScript } from './generators/typescript.js';
import { generatePython } from './generators/python.js';
import { generateGo } from './generators/go.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

function generateFiles(options: Options): GeneratedFile[] {
  switch (options.language) {
    case 'typescript':
      return generateTypeScript(options);
    case 'python':
      return generatePython(options);
    case 'go':
      return generateGo(options);
  }
}

/** Preview which files would be created without writing anything. */
export function dryRun(options: Options): GeneratedFile[] {
  return generateFiles(options);
}

export async function scaffold(options: Options): Promise<string> {
  const outputDir = path.resolve(process.cwd(), options.name);

  // Check if directory already exists
  try {
    await fs.access(outputDir);
    throw new Error(`Directory "${options.name}" already exists`);
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }

  const files = generateFiles(options);

  // Write all files, rolling back on failure
  try {
    for (const file of files) {
      const filePath = path.join(outputDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
    }
  } catch (err) {
    // Clean up partial output
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(`Failed to write files: ${err instanceof Error ? err.message : err}`);
  }

  // Make entry point executable for stdio servers
  if (options.transport === 'stdio') {
    let entry: string | null = null;
    if (options.language === 'typescript') {
      entry = path.join(outputDir, 'src', 'index.ts');
    } else if (options.language === 'python') {
      entry = path.join(outputDir, 'src', 'server.py');
    }

    if (entry) {
      try {
        await fs.chmod(entry, 0o755);
      } catch {
        // Non-critical, chmod doesn't apply on Windows
      }
    }
  }

  return outputDir;
}
