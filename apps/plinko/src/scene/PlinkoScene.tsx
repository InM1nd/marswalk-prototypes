import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import type { PlinkoConfig } from '../config/schema';
import { usePlinkoStore } from '../store/gameStore';
import { BoardShell } from './Board';
import { Ball } from './Ball';

interface PlinkoSceneProps {
  config: PlinkoConfig;
}

export function PlinkoScene({ config }: PlinkoSceneProps) {
  const status = usePlinkoStore((s) => s.status);
  const dropId = usePlinkoStore((s) => s.dropId);

  return (
    <Canvas
      className="plinko-canvas"
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, -0.4, 13.5], fov: 30, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[config.branding.bgColor]} />
      <fog attach="fog" args={[config.branding.bgColor, 18, 34]} />

      <ambientLight intensity={0.55} />
      <spotLight
        position={[5, 9, 12]}
        angle={0.42}
        penumbra={0.7}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-6, 3, 5]} intensity={0.7} color={config.branding.secondaryColor} />
      <pointLight position={[6, -3, 4]} intensity={0.45} color={config.branding.primaryColor} />

      <Environment preset="city" environmentIntensity={0.28} />

      <Physics gravity={[0, -12, 0]}>
        <group position={[0, 0.2, 0]}>
          <BoardShell config={config} />
          {(status === 'dropping' || status === 'result') && dropId > 0 ? (
            <Ball
              dropId={dropId}
              color={config.branding.primaryColor}
              glow={config.branding.secondaryColor}
              config={config}
            />
          ) : null}
        </group>
      </Physics>

      <ContactShadows position={[0, -5.3, 0]} opacity={0.38} scale={16} blur={2.6} far={9} />

      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-0.28}
        maxAzimuthAngle={0.28}
        minDistance={11}
        maxDistance={16}
        target={[0, -0.3, 0]}
      />
    </Canvas>
  );
}
