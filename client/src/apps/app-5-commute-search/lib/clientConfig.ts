/**
 * Fetches public runtime config from Express /api/config.
 * Cached after the first call — never hits the network twice.
 */

interface ClientConfig {
  googleMapsBrowserKey: string;
}

let cached: ClientConfig | null = null;

export async function getClientConfig(): Promise<ClientConfig> {
  if (cached) return cached;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`/api/config returned ${res.status}`);
    cached = (await res.json()) as ClientConfig;
  } catch {
    cached = { googleMapsBrowserKey: '' };
  }
  return cached;
}

export function getCachedConfig(): ClientConfig {
  return cached ?? { googleMapsBrowserKey: '' };
}
