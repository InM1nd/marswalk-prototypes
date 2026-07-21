import { z } from 'zod';

// MVP scope only (see prototype-2-runner.md §6): runner mode, one obstacle
// type, one coin type, flat-color branding (no sprite atlas — draws
// PIXI.Graphics shapes so a new client needs zero art pipeline, just colors).
// Matching mode and multi-obstacle types are deferred.
export const RunnerConfigSchema = z.object({
  campaignId: z.string(),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    bgColor: z.string(),
  }),
  physics: z.object({
    gravity: z.number().default(1.2),
    jumpForce: z.number().default(-14),
    baseSpeed: z.number().default(6),
    speedRampPerSecond: z.number().default(0.05),
  }),
  round: z.object({
    durationSeconds: z.number().default(45),
    obstacleIntervalMs: z.object({ min: z.number(), max: z.number() }).default({ min: 900, max: 1800 }),
    coinIntervalMs: z.object({ min: z.number(), max: z.number() }).default({ min: 600, max: 1200 }),
  }),
  copy: z.object({
    title: z.string(),
    subtitle: z.string(),
    startButtonLabel: z.string().default('Играть'),
    gameOverTitle: z.string(),
    retryButtonLabel: z.string().default('Ещё раз'),
  }),
});

export type RunnerConfig = z.infer<typeof RunnerConfigSchema>;
