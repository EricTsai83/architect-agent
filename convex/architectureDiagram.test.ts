/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest';
import {
  generateArchitectureDiagram,
  type DiagramSnapshot,
  type DiagramSnapshotFile,
} from './lib/architectureDiagram';

/**
 * Fixture repository roughly modelled after a small full-stack TypeScript app:
 *
 *   - `src/` is the frontend (`main.tsx` entrypoint, components, pages, lib)
 *   - `convex/` is the backend (schema + a few feature files + lib)
 *   - top-level config files (package.json, tsconfig.json, README.md)
 *
 * Anything snapshot-tested here must stay deterministic for stable input.
 * If a future change to ArchitectureDiagramGenerator alters the wire format
 * intentionally, run `vitest -u` to refresh the inline snapshot — but the
 * intent of the test is to catch *unintentional* drift in the Mermaid output.
 */
const FIXTURE_FILES: DiagramSnapshotFile[] = [
  // Repository root
  file('package.json', { isConfig: true, isImportant: true }),
  file('tsconfig.json', { isConfig: true, isImportant: true }),
  file('README.md', { isImportant: true, language: 'Markdown' }),
  file('vite.config.ts', { isConfig: true, isImportant: true, language: 'TypeScript' }),

  // src/
  dir('src'),
  file('src/main.tsx', { isEntryPoint: true, isImportant: true, language: 'TypeScript' }),
  file('src/App.tsx', { isImportant: true, language: 'TypeScript' }),
  dir('src/components'),
  file('src/components/Button.tsx', { language: 'TypeScript' }),
  file('src/components/Card.tsx', { language: 'TypeScript' }),
  dir('src/pages'),
  file('src/pages/home.tsx', { language: 'TypeScript' }),
  file('src/pages/chat.tsx', { language: 'TypeScript' }),
  dir('src/lib'),
  file('src/lib/utils.ts', { language: 'TypeScript' }),

  // convex/
  dir('convex'),
  file('convex/schema.ts', { isImportant: true, language: 'TypeScript' }),
  file('convex/chat.ts', { language: 'TypeScript' }),
  file('convex/repositories.ts', { language: 'TypeScript' }),
  dir('convex/lib'),
  file('convex/lib/auth.ts', { language: 'TypeScript' }),
  file('convex/lib/constants.ts', { language: 'TypeScript' }),

  // public/ (just to make sure it shows at service depth)
  dir('public'),
  file('public/favicon.ico'),
];

const FIXTURE_SNAPSHOT: DiagramSnapshot = {
  repositoryName: 'acme/widget',
  detectedLanguages: ['TypeScript', 'Markdown'],
  packageManagers: ['bun'],
  entrypoints: ['src/main.tsx'],
  externalDependencies: ['react', 'react-dom', 'convex', 'zod', 'tailwind-merge'],
  files: FIXTURE_FILES,
};

function file(
  path: string,
  overrides: Partial<DiagramSnapshotFile> = {},
): DiagramSnapshotFile {
  const segments = path.split('/');
  return {
    path,
    parentPath: segments.length > 1 ? segments.slice(0, -1).join('/') : '',
    fileType: 'file',
    isEntryPoint: false,
    isConfig: false,
    isImportant: false,
    ...overrides,
  };
}

function dir(path: string): DiagramSnapshotFile {
  const segments = path.split('/');
  return {
    path,
    parentPath: segments.length > 1 ? segments.slice(0, -1).join('/') : '',
    fileType: 'dir',
    isEntryPoint: false,
    isConfig: false,
    isImportant: false,
  };
}

describe('ArchitectureDiagramGenerator', () => {
  test('service depth produces a stable Mermaid graph TD', () => {
    const result = generateArchitectureDiagram(FIXTURE_SNAPSHOT, 'service');
    expect(result).toMatchSnapshot();
  });

  test('module depth produces a stable Mermaid graph TD', () => {
    const result = generateArchitectureDiagram(FIXTURE_SNAPSHOT, 'module');
    expect(result).toMatchSnapshot();
  });

  test('file depth produces a stable Mermaid graph TD', () => {
    const result = generateArchitectureDiagram(FIXTURE_SNAPSHOT, 'file');
    expect(result).toMatchSnapshot();
  });

  test('output is deterministic across multiple invocations', () => {
    // Snapshot tests already enforce determinism against a recorded value, but
    // an explicit double-call check guards against any in-place mutation of
    // shared state inside the generator (e.g. re-using a Set across calls).
    const a = generateArchitectureDiagram(FIXTURE_SNAPSHOT, 'module');
    const b = generateArchitectureDiagram(FIXTURE_SNAPSHOT, 'module');
    expect(a).toEqual(b);
  });

  test('handles a repository with no recognised top-level directories', () => {
    const snapshot: DiagramSnapshot = {
      repositoryName: 'acme/empty',
      detectedLanguages: [],
      packageManagers: [],
      entrypoints: [],
      externalDependencies: [],
      files: [
        file('README.md', { isImportant: true }),
        file('package.json', { isConfig: true, isImportant: true }),
      ],
    };

    const result = generateArchitectureDiagram(snapshot, 'service');
    expect(result.mermaid).toContain('graph TD');
    expect(result.mermaid).toContain('acme/empty');
    expect(result.summary).toContain('0 services');
  });

  test('omits external dependency edges when none are provided', () => {
    const snapshot: DiagramSnapshot = {
      ...FIXTURE_SNAPSHOT,
      externalDependencies: [],
    };
    const result = generateArchitectureDiagram(snapshot, 'service');
    expect(result.mermaid).not.toContain('-.->');
    expect(result.summary).toContain('0 external dependencies');
  });

  test('truncates external dependencies past the cap with an overflow node', () => {
    const snapshot: DiagramSnapshot = {
      ...FIXTURE_SNAPSHOT,
      externalDependencies: Array.from({ length: 12 }, (_, index) => `dep-${String(index).padStart(2, '0')}`),
    };
    const result = generateArchitectureDiagram(snapshot, 'service');
    // The cap is 8 named external deps + 1 overflow node, so we should see
    // the overflow indicator with the remaining count.
    expect(result.mermaid).toContain('+ 4 more');
  });

  test('reuses node ids deterministically when the same path appears at multiple depths', () => {
    const snapshot: DiagramSnapshot = {
      ...FIXTURE_SNAPSHOT,
      // Adding a colliding-prefix path should not produce duplicate id lines.
      files: [
        ...FIXTURE_SNAPSHOT.files,
        dir('src-extras'),
        file('src-extras/notes.md', { isImportant: true }),
      ],
    };
    const a = generateArchitectureDiagram(snapshot, 'module');
    const b = generateArchitectureDiagram(snapshot, 'module');
    expect(a.mermaid).toBe(b.mermaid);
    // Sanity: the two top-level dirs render distinct ids (no accidental
    // collision between `src` and `src-extras` after sanitization).
    expect(a.mermaid).toContain('svc_service_src');
    expect(a.mermaid).toContain('svc_service_src_extras');
  });

  test('module depth links entrypoint to service node when no submodule exists', () => {
    const snapshot: DiagramSnapshot = {
      repositoryName: 'acme/flat-service',
      detectedLanguages: ['TypeScript'],
      packageManagers: ['bun'],
      entrypoints: ['backend/main.ts'],
      externalDependencies: [],
      files: [dir('backend'), file('backend/main.ts', { isEntryPoint: true, isImportant: true })],
    };

    const result = generateArchitectureDiagram(snapshot, 'module');
    expect(result.mermaid).toContain('svc_service_backend["backend/"]:::module');
    expect(result.mermaid).toContain('svc_service_backend --> ep_entrypoint_backend_main_ts');
    expect(result.mermaid).not.toContain('svc_service_backend_grp --> ep_entrypoint_backend_main_ts');
  });

  test('file depth never exceeds global file-node cap when root files exist', () => {
    const serviceDirs = ['svc1', 'svc2', 'svc3', 'svc4', 'svc5', 'svc6'];
    const files: DiagramSnapshotFile[] = [
      file('package.json', { isConfig: true, isImportant: true }),
      file('tsconfig.json', { isConfig: true, isImportant: true }),
      file('README.md', { isImportant: true }),
    ];
    for (const service of serviceDirs) {
      files.push(dir(service));
      for (let index = 1; index <= 4; index += 1) {
        files.push(file(`${service}/important-${index}.ts`, { isImportant: true }));
      }
    }
    const snapshot: DiagramSnapshot = {
      repositoryName: 'acme/cap-case',
      detectedLanguages: ['TypeScript'],
      packageManagers: ['bun'],
      entrypoints: [],
      externalDependencies: [],
      files,
    };

    const result = generateArchitectureDiagram(snapshot, 'file');
    expect(result.summary).toContain('24 key files');
    expect(result.mermaid).not.toContain('subgraph repo_repo_acme_cap_case_root["root"]');
  });
});
