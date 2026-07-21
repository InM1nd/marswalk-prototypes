import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { PlinkoConfig } from '../config/schema';
import { usePlinkoStore } from '../store/gameStore';
import { BOARD, slotCenters } from './layout';

interface BallProps {
  dropId: number;
  color: string;
  glow: string;
  config: PlinkoConfig;
}

function nearestSlot(x: number, centers: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  centers.forEach((cx, i) => {
    const d = Math.abs(cx - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export function Ball({ dropId, color, glow, config }: BallProps) {
  const body = useRef<RapierRigidBody>(null);
  const settled = useRef(false);
  const bornAt = useRef(performance.now());
  const setResult = usePlinkoStore((s) => s.setResult);
  const centers = useMemo(() => slotCenters(config.slots.length), [config.slots.length]);

  const spawn = useMemo(() => {
    const x = (Math.random() - 0.5) * 0.8;
    const y = BOARD.height / 2 - 0.5;
    const vx = (Math.random() - 0.5) * 1.8;
    return { x, y, vx };
  }, [dropId]);

  useEffect(() => {
    settled.current = false;
    bornAt.current = performance.now();
    const id = window.setTimeout(() => {
      body.current?.setLinvel({ x: spawn.vx, y: -2.5, z: 0 }, true);
    }, 40);
    return () => window.clearTimeout(id);
  }, [dropId, spawn.vx]);

  useFrame(() => {
    const rb = body.current;
    if (!rb || settled.current) return;

    const { y, x } = rb.translation();
    const vel = rb.linvel();
    const speed = Math.hypot(vel.x, vel.y);
    const floorY = -BOARD.height / 2 + 0.45;
    const age = performance.now() - bornAt.current;

    const nearFloor = y <= floorY;
    const slow = speed < 0.8;
    const timedOut = age > 6500;

    if ((nearFloor && slow) || timedOut || y < -BOARD.height / 2 - 1.5) {
      settled.current = true;
      const idx = nearestSlot(x, centers);
      queueMicrotask(() => setResult(config.slots[idx]));
    }
  });

  return (
    <RigidBody
      ref={body}
      colliders="ball"
      position={[spawn.x, spawn.y, 0]}
      restitution={0.28}
      friction={0.2}
      linearDamping={0.08}
      angularDamping={0.2}
      mass={0.45}
      ccd
      canSleep={false}
      enabledTranslations={[true, true, false]}
      enabledRotations={[false, false, true]}
    >
      <mesh castShadow>
        <sphereGeometry args={[BOARD.ballRadius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.55}
          roughness={0.22}
          emissive={glow}
          emissiveIntensity={0.4}
        />
      </mesh>
    </RigidBody>
  );
}
