/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const bundleDir = join(root, 'bundle');
const a2aDistDir = join(root, 'packages/a2a-server/dist');
const coreDistDir = join(root, 'packages/core/dist');

// Create bundle directory if it doesn't exist
if (!existsSync(bundleDir)) {
  mkdirSync(bundleDir);
}

// Copy A2A server files to bundle
const filesToCopy = ['index.js', 'index.d.ts', 'a2a-server.mjs'];

for (const file of filesToCopy) {
  const src = join(a2aDistDir, file);
  if (existsSync(src)) {
    copyFileSync(src, join(bundleDir, file));
    console.log(`Copied ${file} to bundle/`);
  }
}

// Copy src directory contents
const srcDir = join(a2aDistDir, 'src');
if (existsSync(srcDir)) {
  const bundleSrcDir = join(bundleDir, 'a2a-server');
  if (!existsSync(bundleSrcDir)) {
    mkdirSync(bundleSrcDir);
  }

  const copyDir = (dir, targetDir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(dir, entry.name);
      const targetPath = join(targetDir, entry.name);
      const stat = statSync(srcPath);
      if (stat.isDirectory()) {
        if (!existsSync(targetPath)) {
          mkdirSync(targetPath);
        }
        copyDir(srcPath, targetPath);
      } else {
        copyFileSync(srcPath, targetPath);
      }
    }
  };

  copyDir(srcDir, bundleSrcDir);
  console.log('Copied a2a-server/src to bundle/a2a-server/');
}

// Copy @google/gemini-cli-core to bundled dependencies
if (existsSync(coreDistDir)) {
  const bundledDepsDir = join(
    bundleDir,
    'node_modules',
    '@google',
    'gemini-cli-core',
  );
  if (!existsSync(bundledDepsDir)) {
    mkdirSync(bundledDepsDir, { recursive: true });
  }

  const copyCoreDir = (dir, targetDir) => {
    const entries = readdirSync(dir);
    for (const file of entries) {
      const srcPath = join(dir, file);
      const destPath = join(targetDir, file);
      const stat = statSync(srcPath);
      if (stat.isDirectory()) {
        if (!existsSync(destPath)) {
          mkdirSync(destPath);
        }
        copyCoreDir(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  };

  copyCoreDir(coreDistDir, bundledDepsDir);
  console.log(
    'Copied @google/gemini-cli-core to bundle/node_modules/@google/gemini-cli-core/',
  );

  const corePackageJson = join(root, 'packages/core/package.json');
  const bundledPackageJson = join(bundledDepsDir, 'package.json');
  if (existsSync(corePackageJson)) {
    const packageJsonContent = readFileSync(corePackageJson, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    packageJson.main = 'index.js';
    writeFileSync(bundledPackageJson, JSON.stringify(packageJson, null, 2));
    console.log('Copied and modified package.json for @google/gemini-cli-core');
  }
}

// Create bundle package.json
const a2aPackageJson = join(root, 'packages/a2a-server/package.json');
const bundlePackageJson = join(bundleDir, 'package.json');
if (existsSync(a2aPackageJson)) {
  const packageJsonContent = readFileSync(a2aPackageJson, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);

  packageJson.main = 'index.js';
  packageJson.bin = {
    'qflow-cli-a2a-server': './a2a-server.mjs',
  };
  packageJson.files = ['.'];

  const bundledDeps = ['@google/gemini-cli-core'];
  packageJson.bundledDependencies = bundledDeps;

  const dependencies = {};
  for (const [key, value] of Object.entries(packageJson.dependencies)) {
    if (key !== '@google/gemini-cli-core') {
      dependencies[key] = value;
    }
  }
  packageJson.dependencies = dependencies;

  writeFileSync(bundlePackageJson, JSON.stringify(packageJson, null, 2));
  console.log('Created bundle/package.json');
}

// Copy .env file to bundle
const envFileSrc = join(root, 'packages/a2a-server/.env');
const envFileDest = join(bundleDir, '.env');
if (existsSync(envFileSrc)) {
  copyFileSync(envFileSrc, envFileDest);
  console.log('Copied .env to bundle/');
}

// Create logs directory
const logsDir = join(bundleDir, 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir);
  console.log('Created logs directory in bundle/');
}

console.log('A2A server bundle created successfully in bundle/');
