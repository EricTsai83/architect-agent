import { afterEach, describe, expect, test } from 'vitest';
import {
  getAllowedReturnToOriginsFromEnv,
  normalizeReturnToUrl,
} from './returnTo';

const RETURN_TO_ALLOWLIST_ENV = 'ALLOWED_RETURN_TO_ORIGINS';

afterEach(() => {
  delete process.env[RETURN_TO_ALLOWLIST_ENV];
});

describe('returnTo allowlist', () => {
  test('returns sanitized full returnTo URL when allowlisted', () => {
    const allowlist = new Set(['https://app.systify.dev']);
    const result = normalizeReturnToUrl(
      'https://app.systify.dev/settings?tab=integrations',
      allowlist,
    );

    expect(result).toBe('https://app.systify.dev/settings?tab=integrations');
  });

  test('rejects non-allowlisted origin', () => {
    const allowlist = new Set(['https://app.systify.dev']);

    expect(() =>
      normalizeReturnToUrl('https://evil.example.com/phish', allowlist),
    ).toThrow(/not allowlisted/i);
  });

  test('rejects non-localhost http redirect origins', () => {
    const allowlist = new Set(['http://example.com']);

    expect(() => normalizeReturnToUrl('http://example.com/install', allowlist)).toThrow(
      /localhost development origins/i,
    );
  });

  test('accepts localhost http redirect origin when allowlisted', () => {
    const allowlist = new Set(['http://localhost:5173']);

    expect(
      normalizeReturnToUrl('http://localhost:5173/callback?source=github', allowlist),
    ).toBe('http://localhost:5173/callback?source=github');
  });

  test('throws when returnTo is malformed or not absolute', () => {
    const allowlist = new Set(['https://app.systify.dev']);

    expect(() => normalizeReturnToUrl('/relative/path', allowlist)).toThrow(
      'returnTo must be an absolute URL.',
    );
    expect(() => normalizeReturnToUrl('not-a-url', allowlist)).toThrow(
      'returnTo must be an absolute URL.',
    );
  });

  test('throws when returnTo includes credentials', () => {
    const allowlist = new Set(['https://app.systify.dev']);

    expect(() =>
      normalizeReturnToUrl(
        'https://user:pass@app.systify.dev/settings?tab=integrations',
        allowlist,
      ),
    ).toThrow('returnTo must not include username or password.');
  });

  test('rejects localhost http redirect when localhost origin is not allowlisted', () => {
    const allowlist = new Set(['https://app.systify.dev']);

    expect(() =>
      normalizeReturnToUrl('http://localhost:5173/callback?source=github', allowlist),
    ).toThrow(/not allowlisted/i);
  });

  test('parses allowlist from env and canonicalizes origins', () => {
    process.env[RETURN_TO_ALLOWLIST_ENV] =
      ' https://app.systify.dev/ , https://preview.systify.dev ';

    const parsed = getAllowedReturnToOriginsFromEnv();

    expect(parsed.has('https://app.systify.dev')).toBe(true);
    expect(parsed.has('https://preview.systify.dev')).toBe(true);
    expect(parsed.size).toBe(2);
  });

  test('rejects non-localhost http origin entries in env allowlist', () => {
    process.env[RETURN_TO_ALLOWLIST_ENV] = 'http://staging.example.com';

    expect(() => getAllowedReturnToOriginsFromEnv()).toThrow(
      /only allowed for localhost development origins/i,
    );
  });

  test('throws when env allowlist is missing or empty', () => {
    delete process.env[RETURN_TO_ALLOWLIST_ENV];
    expect(() => getAllowedReturnToOriginsFromEnv()).toThrow(
      `${RETURN_TO_ALLOWLIST_ENV} is required`,
    );

    process.env[RETURN_TO_ALLOWLIST_ENV] = '   ';
    expect(() => getAllowedReturnToOriginsFromEnv()).toThrow(
      `${RETURN_TO_ALLOWLIST_ENV} is required`,
    );
  });

  test('refreshes cached allowlist when env value changes', () => {
    process.env[RETURN_TO_ALLOWLIST_ENV] = 'https://app.systify.dev';
    const first = getAllowedReturnToOriginsFromEnv();
    expect(first.has('https://app.systify.dev')).toBe(true);
    expect(first.has('https://preview.systify.dev')).toBe(false);

    process.env[RETURN_TO_ALLOWLIST_ENV] = 'https://preview.systify.dev';
    const second = getAllowedReturnToOriginsFromEnv();
    expect(second.has('https://app.systify.dev')).toBe(false);
    expect(second.has('https://preview.systify.dev')).toBe(true);
  });
});
