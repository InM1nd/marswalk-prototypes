import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import type { PlinkoConfig } from '../config/schema';
import { BOARD, buildPegLayout, slotCenters, slotWidth } from './layout';

export function BoardShell({ config }: { config: PlinkoConfig }) {
  const { primaryColor, secondaryColor, accentColor } = config.branding;
  const pegs = buildPegLayout(config.board.rows, config.slots.length);
  const centers = slotCenters(config.slots.length);
  const sW = slotWidth(config.slots.length);
  const halfW = BOARD.width / 2;
  const halfH = BOARD.height / 2;

  return (
    <group>
      <mesh position={[0, 0, -0.22]} receiveShadow>
        <boxGeometry args={[BOARD.width + 0.35, BOARD.height + 0.35, 0.08]} />
        <meshStandardMaterial color="#121821" metalness={0.35} roughness={0.55} />
      </mesh>

      <mesh position={[0, halfH + 0.12, 0]}>
        <boxGeometry args={[BOARD.width + 0.4, 0.22, 0.45]} />
        <meshStandardMaterial
          color={primaryColor}
          metalness={0.4}
          roughness={0.35}
          emissive={primaryColor}
          emissiveIntensity={0.15}
        />
      </mesh>

      <RigidBody type="fixed" position={[-halfW - BOARD.wallThickness / 2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[BOARD.wallThickness, BOARD.height + 0.4, 0.55]} />
          <meshStandardMaterial color="#1a2230" metalness={0.3} roughness={0.5} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[halfW + BOARD.wallThickness / 2, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[BOARD.wallThickness, BOARD.height + 0.4, 0.55]} />
          <meshStandardMaterial color="#1a2230" metalness={0.3} roughness={0.5} />
        </mesh>
      </RigidBody>

      {pegs.map((peg) => (
        <RigidBody key={peg.key} type="fixed" position={[peg.x, peg.y, 0]} colliders={false} restitution={0.35} friction={0.15}>
          <BallCollider args={[BOARD.pegRadius]} />
          <mesh castShadow>
            <sphereGeometry args={[BOARD.pegRadius, 18, 18]} />
            <meshStandardMaterial
              color={secondaryColor}
              metalness={0.85}
              roughness={0.25}
              emissive={secondaryColor}
              emissiveIntensity={0.14}
            />
          </mesh>
        </RigidBody>
      ))}

      {centers.map((x, i) => {
        const slot = config.slots[i];
        const y = -halfH + BOARD.slotDepth / 2;
        return (
          <group key={slot.id}>
            <RigidBody type="fixed" position={[x + sW / 2, y, 0]}>
              <mesh>
                <boxGeometry args={[0.1, BOARD.slotDepth, 0.5]} />
                <meshStandardMaterial color="#243041" metalness={0.2} roughness={0.6} />
              </mesh>
            </RigidBody>
            {i === 0 && (
              <RigidBody type="fixed" position={[x - sW / 2, y, 0]}>
                <mesh>
                  <boxGeometry args={[0.1, BOARD.slotDepth, 0.5]} />
                  <meshStandardMaterial color="#243041" metalness={0.2} roughness={0.6} />
                </mesh>
              </RigidBody>
            )}

            <mesh position={[x, -halfH + 0.05, 0]}>
              <boxGeometry args={[sW * 0.92, 0.12, 0.45]} />
              <meshStandardMaterial
                color={slot.highlight ? primaryColor : '#1a2230'}
                emissive={slot.highlight ? primaryColor : '#000000'}
                emissiveIntensity={slot.highlight ? 0.28 : 0}
                metalness={0.3}
                roughness={0.45}
              />
            </mesh>

            <Text
              position={[x, -halfH + 0.52, 0.3]}
              fontSize={0.28}
              color={slot.highlight ? accentColor : secondaryColor}
              anchorX="center"
              anchorY="middle"
              maxWidth={sW * 0.9}
            >
              {slot.label}
            </Text>
          </group>
        );
      })}

      <RigidBody type="fixed" position={[0, -halfH - 0.08, 0]} colliders={false} friction={1.2} restitution={0.02}>
        <CuboidCollider args={[halfW + 0.45, 0.1, 0.4]} />
        <mesh>
          <boxGeometry args={[BOARD.width + 0.55, 0.18, 0.55]} />
          <meshStandardMaterial color="#0d121a" metalness={0.4} roughness={0.5} />
        </mesh>
      </RigidBody>
    </group>
  );
}
