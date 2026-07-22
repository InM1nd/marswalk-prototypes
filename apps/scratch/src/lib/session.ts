const TTL_MS = 24 * 60 * 60 * 1000;

function key(campaignId: string): string {
  return `scratched_${campaignId}`;
}

export function hasScratched(campaignId: string): boolean {
  try {
    const raw = localStorage.getItem(key(campaignId));
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw) as { expiresAt: number };
    if (Date.now() > expiresAt) {
      localStorage.removeItem(key(campaignId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markScratched(campaignId: string): void {
  localStorage.setItem(key(campaignId), JSON.stringify({ expiresAt: Date.now() + TTL_MS }));
}

export function clearScratched(campaignId: string): void {
  localStorage.removeItem(key(campaignId));
}
