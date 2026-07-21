import { Container, Graphics, Text } from 'pixi.js';

/** Draw helpers keep Matter hitboxes fixed; only silhouettes change. */

export function buildScooterView(primary: number, secondary: number): {
  root: Container;
  body: Container;
  rearWheel: Graphics;
  frontWheel: Graphics;
} {
  const root = new Container();
  const body = new Container();
  const rearWheel = new Graphics();
  const frontWheel = new Graphics();

  drawWheel(rearWheel, secondary);
  drawWheel(frontWheel, secondary);
  rearWheel.position.set(-12, 10);
  frontWheel.position.set(14, 10);

  const bodyGfx = new Graphics();
  // deck
  bodyGfx.roundRect(-16, 2, 30, 6, 2).fill(primary);
  // stem
  bodyGfx.rect(10, -14, 3, 18).fill(0xc8d0dc);
  // handlebar
  bodyGfx.roundRect(4, -18, 16, 4, 1).fill(secondary);
  // rider torso
  bodyGfx.roundRect(-6, -16, 12, 14, 3).fill(primary);
  // helmet
  bodyGfx.circle(0, -20, 7).fill(secondary);
  bodyGfx.circle(2, -21, 2).fill(0x0d1015);

  body.addChild(bodyGfx);
  root.addChild(rearWheel, frontWheel, body);
  return { root, body, rearWheel, frontWheel };
}

function drawWheel(g: Graphics, rim: number): void {
  g.clear();
  g.circle(0, 0, 7).fill(0x1a1f28).stroke({ width: 2, color: rim });
  g.moveTo(0, -6).lineTo(0, 6).stroke({ width: 2, color: rim });
  g.moveTo(-6, 0).lineTo(6, 0).stroke({ width: 2, color: rim });
}

export function drawCone(g: Graphics, primary: number): void {
  g.clear();
  g.rect(-18, 16, 36, 6).fill(0x2a3140);
  g.poly([-14, 16, 14, 16, 6, -20, -6, -20]).fill(primary);
  g.rect(-10, -2, 20, 5).fill(0xf7f5ed);
  g.rect(-8, 8, 16, 4).fill(0xf7f5ed);
}

export function drawBarrier(g: Graphics, primary: number, secondary: number): void {
  g.clear();
  // tall construction barrier — needs double jump
  g.roundRect(-16, -36, 32, 72, 3).fill(0x2a3140);
  g.rect(-16, -36, 32, 10).fill(primary);
  g.rect(-16, -8, 32, 10).fill(secondary);
  g.rect(-16, 20, 32, 10).fill(primary);
  g.rect(-12, -28, 4, 56).fill(0x1a1f28);
  g.rect(8, -28, 4, 56).fill(0x1a1f28);
}

export function drawRideToken(g: Graphics, secondary: number): void {
  g.clear();
  g.roundRect(-14, -10, 28, 20, 5).fill(secondary);
  g.roundRect(-10, -6, 20, 12, 3).fill(0x0d1015);
  g.circle(-14, 0, 3).fill(0x0d1015);
  g.circle(14, 0, 3).fill(0x0d1015);
  g.rect(-2, -4, 4, 8).fill(secondary);
  g.rect(-4, -2, 8, 4).fill(secondary);
}

export function drawBuilding(g: Graphics, width: number, height: number, tone: number, windowTone: number): void {
  g.clear();
  g.rect(0, -height, width, height).fill(tone);
  const cols = Math.max(2, Math.floor(width / 18));
  const rows = Math.max(2, Math.floor(height / 22));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if ((row + col + width) % 3 === 0) continue;
      g.rect(6 + col * 16, -height + 10 + row * 18, 7, 5).fill(windowTone);
    }
  }
}

export function makeFloatLabel(text: string, color: string): Text {
  return new Text({
    text,
    style: {
      fontFamily: 'Barlow Condensed, Impact, sans-serif',
      fontSize: 22,
      fontWeight: '800',
      fill: color,
      stroke: { color: '#0d1015', width: 3 },
    },
  });
}
