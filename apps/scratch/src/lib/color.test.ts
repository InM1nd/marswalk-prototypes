import { describe, expect, it } from 'vitest';
import { onColor, shade } from './color';

describe('color', () => {
  it('picks dark text on light segments and white on dark ones', () => {
    expect(onColor('#7dffe0')).toBe('#0b0b10');
    expect(onColor('#ffb020')).toBe('#0b0b10');
    expect(onColor('#ff7a1a')).toBe('#0b0b10');
    expect(onColor('#00b894')).toBe('#0b0b10');
    expect(onColor('#20202a')).toBe('#ffffff');
    expect(onColor('#1a6bff')).toBe('#ffffff');
  });

  it('shades toward white and black', () => {
    expect(shade('#808080', 1)).toBe(0xffffff);
    expect(shade('#808080', -1)).toBe(0x000000);
    expect(shade('#fff', 0)).toBe(0xffffff);
  });
});
