import type { CampaignConfig } from '../schema';
import { fmcgDemoConfig } from './fmcgDemo';
import { bankDemoConfig } from './bankDemo';
import { travelDemoConfig } from './travelDemo';

export type CampaignPresetId = 'fmcg-demo' | 'bank-demo' | 'travel-demo';

export interface CampaignPreset {
  id: CampaignPresetId;
  label: string;
  vertical: string;
  config: CampaignConfig;
}

export const CAMPAIGN_PRESETS: CampaignPreset[] = [
  { id: 'fmcg-demo', label: 'FMCG', vertical: 'Promo / retail', config: fmcgDemoConfig },
  { id: 'bank-demo', label: 'Banking', vertical: 'Cashback / card', config: bankDemoConfig },
  { id: 'travel-demo', label: 'Travel', vertical: 'Booking perk', config: travelDemoConfig },
];

export function presetById(id: string): CampaignPreset {
  return CAMPAIGN_PRESETS.find((p) => p.id === id) ?? CAMPAIGN_PRESETS[0];
}
