const RETURN_TO_ALLOWLIST_ENV = 'ALLOWED_RETURN_TO_ORIGINS';
const LOCAL_HTTP_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function normalizeConfiguredOrigin(rawOrigin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawOrigin);
  } catch {
    throw new Error(`Invalid origin "${rawOrigin}" in ${RETURN_TO_ALLOWLIST_ENV}.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Origin "${rawOrigin}" in ${RETURN_TO_ALLOWLIST_ENV} must use http or https.`,
    );
  }

  if (parsed.username || parsed.password) {
    throw new Error(
      `Origin "${rawOrigin}" in ${RETURN_TO_ALLOWLIST_ENV} must not include username or password.`,
    );
  }

  return parsed.origin;
}

export function getAllowedReturnToOriginsFromEnv(): Set<string> {
  const configured = process.env[RETURN_TO_ALLOWLIST_ENV];
  if (!configured?.trim()) {
    return new Set<string>();
  }

  const origins = configured
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map(normalizeConfiguredOrigin);

  return new Set(origins);
}

export function normalizeReturnToOrigin(returnTo: string, allowedOrigins?: Set<string>): string {
  let parsed: URL;
  try {
    parsed = new URL(returnTo);
  } catch {
    throw new Error('returnTo must be an absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('returnTo must use http or https.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('returnTo must not include username or password.');
  }

  const normalizedOrigin = parsed.origin;
  if (parsed.protocol === 'http:' && !LOCAL_HTTP_HOSTS.has(parsed.hostname)) {
    throw new Error('returnTo with http is only allowed for localhost development origins.');
  }

  const effectiveAllowlist = allowedOrigins ?? getAllowedReturnToOriginsFromEnv();
  if (!effectiveAllowlist.has(normalizedOrigin)) {
    throw new Error(
      `returnTo origin is not allowlisted. Configure ${RETURN_TO_ALLOWLIST_ENV}.`,
    );
  }

  return normalizedOrigin;
}
