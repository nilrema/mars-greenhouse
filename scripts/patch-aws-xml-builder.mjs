import fs from 'fs/promises';
import path from 'path';

const projectRoot = process.cwd();

const targetFiles = [
  path.join(
    projectRoot,
    'node_modules/@aws-sdk/xml-builder/dist-cjs/xml-parser.js'
  ),
  path.join(
    projectRoot,
    'node_modules/@aws-sdk/xml-builder/dist-es/xml-parser.js'
  ),
];

const insertionPoint = `    maxNestedTags: 1024,\n});`;

const replacementPoint = `    maxNestedTags: 1024,
    processEntities: {
        enabled: true,
        maxEntitySize: 10000,
        maxExpansionDepth: 10,
        maxTotalExpansions: 20000,
        maxExpandedLength: 1000000,
        maxEntityCount: 1000,
        allowedTags: null,
        tagFilter: null,
    },
});`;

async function patchFile(filePath) {
  let source;

  try {
    source = await fs.readFile(filePath, 'utf8');
  } catch {
    return;
  }

  if (source.includes('maxTotalExpansions: 20000')) {
    return;
  }

  if (!source.includes(insertionPoint)) {
    throw new Error(`Unexpected xml-parser.js contents in ${filePath}`);
  }

  const patched = source.replace(insertionPoint, replacementPoint);
  await fs.writeFile(filePath, patched, 'utf8');
}

await Promise.all(targetFiles.map(patchFile));
