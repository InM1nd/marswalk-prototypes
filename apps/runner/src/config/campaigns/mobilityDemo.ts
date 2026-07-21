import type { RunnerConfig } from '../schema';

export const mobilityDemoConfig: RunnerConfig = {
  campaignId: 'mobility-demo',
  branding: {
    primaryColor: '#ff5a36',
    secondaryColor: '#ffc857',
    bgColor: '#0a0e14',
  },
  physics: {
    gravity: 1.2,
    jumpForce: -14,
    baseSpeed: 6,
    speedRampPerSecond: 0.05,
  },
  round: {
    durationSeconds: 45,
    obstacleIntervalMs: { min: 900, max: 1800 },
    coinIntervalMs: { min: 600, max: 1200 },
  },
  copy: {
    title: 'GRIDLOCK RUN',
    subtitle: 'Hop the cones, bank bonus rides, outrun the traffic clock.',
    startButtonLabel: 'START RIDE',
    gameOverTitle: 'RIDE OVER',
    retryButtonLabel: 'RIDE AGAIN',
  },
};
