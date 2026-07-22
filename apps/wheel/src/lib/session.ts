const TTL_MS = 24 * 60 * 60 * 1000;

function key(campaignId: string): string {
  return `spun_${campaignId}`;
}

export function hasSpun(campaignId: string): boolean {
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

export function markSpun(campaignId: string): void {
  localStorage.setItem(key(campaignId), JSON.stringify({ expiresAt: Date.now() + TTL_MS }));
}

/** Prototype-level reset — clears the demo anti-replay flag for this campaign. */
export function clearSpun(campaignId: string): void {
  localStorage.removeItem(key(campaignId));
}
