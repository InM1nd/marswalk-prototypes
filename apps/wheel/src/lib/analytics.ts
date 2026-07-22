type AnalyticsPayload = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, payload: AnalyticsPayload = {}): void {
  console.info('[analytics]', event, payload);
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (measurementId && typeof window.gtag === 'function') {
    window.gtag('event', event, payload);
  }
}
