import type { LottoConfig } from '../lottoSchema';
import { fmcgLottoConfig } from './fmcgLotto';
import { bankLottoConfig } from './bankLotto';
import { travelLottoConfig } from './travelLotto';

export type LottoPresetId = 'fmcg-lotto-demo' | 'bank-lotto-demo' | 'travel-lotto-demo';

export interface LottoPreset {
  id: LottoPresetId;
  label: string;
  config: LottoConfig;
}

export const LOTTO_PRESETS: LottoPreset[] = [
  { id: 'fmcg-lotto-demo', label: 'FMCG', config: fmcgLottoConfig },
  { id: 'bank-lotto-demo', label: 'Banking', config: bankLottoConfig },
  { id: 'travel-lotto-demo', label: 'Travel', config: travelLottoConfig },
];

export function lottoPresetById(id: string): LottoPreset {
  return LOTTO_PRESETS.find((p) => p.id === id) ?? LOTTO_PRESETS[0];
}
