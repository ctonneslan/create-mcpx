import fs from 'node:fs/promises';
import path from 'node:path';
import { Options } from './types.js';
import { generateTypeScript } from './generators/typescript.js';
import { generatePython } from './generators/python.js';

export interface GeneratedFile {
  path: string;
  content: string;
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

  const files =
    options.language === 'typescript'
      ? generateTypeScript(options)
      : generatePython(options);

  // Write all files
  for (const file of files) {
    const filePath = path.join(outputDir, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content, 'utf-8');
  }

  // Make entry point executable for stdio servers
  if (options.transport === 'stdio') {
    const entry =
      options.language === 'typescript'
        ? path.join(outputDir, 'src', 'index.ts')
        : path.join(outputDir, 'src', 'server.py');
    try {
      await fs.chmod(entry, 0o755);
    } catch {
      // Non-critical
    }
  }

  return outputDir;
}
