import { afterEach, describe, expect, test } from 'vitest';
import {
  getAllowedReturnToOriginsFromEnv,
  normalizeReturnToOrigin,
} from './returnTo';

const RETURN_TO_ALLOWLIST_ENV = 'ALLOWED_RETURN_TO_ORIGINS';

afterEach(() => {
  delete process.env[RETURN_TO_ALLOWLIST_ENV];
});

describe('returnTo allowlist', () => {
  test('normalizes to origin when allowlisted', () => {
    const allowlist = new Set(['https://app.systify.dev']);
    const result = normalizeReturnToOrigin(
      'https://app.systify.dev/settings?tab=integrations',
      allowlist,
    );

    expect(result).toBe('https://app.systify.dev');
  });

  test('rejects non-allowlisted origin', () => {
    const allowlist = new Set(['https://app.systify.dev']);

    expect(() =>
      normalizeReturnToOrigin('https://evil.example.com/phish', allowlist),
    ).toThrow(/not allowlisted/i);
  });

  test('rejects non-localhost http redirect origins', () => {
    const allowlist = new Set(['http://example.com']);

    expect(() => normalizeReturnToOrigin('http://example.com/install', allowlist)).toThrow(
      /localhost development origins/i,
    );
  });

  test('accepts localhost http redirect origin when allowlisted', () => {
    const allowlist = new Set(['http://localhost:5173']);

    expect(
      normalizeReturnToOrigin('http://localhost:5173/callback?source=github', allowlist),
    ).toBe('http://localhost:5173');
  });

  test('parses allowlist from env and canonicalizes origins', () => {
    process.env[RETURN_TO_ALLOWLIST_ENV] =
      ' https://app.systify.dev/ , https://preview.systify.dev ';

    const parsed = getAllowedReturnToOriginsFromEnv();

    expect(parsed.has('https://app.systify.dev')).toBe(true);
    expect(parsed.has('https://preview.systify.dev')).toBe(true);
    expect(parsed.size).toBe(2);
  });
});
