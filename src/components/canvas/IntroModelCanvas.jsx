import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT_COLOR = '#4fc3f7';

// Camera positions per phase — thinking is close-up, waving is zoomed out
const PHASE_CAMERA = {
  // Camera looks down toward where the thinker sits (lower screen)
  thinking: { pos: new THREE.Vector3(0, 0.5, 4.0), lookAt: new THREE.Vector3(0, -0.6, 0) },
  // Camera pulled back enough to show the full crowd without feet cut off
  waving: { pos: new THREE.Vector3(0, 0.2, 7.2), lookAt: new THREE.Vector3(0, -0.8, 0) },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWireframeMat(opacity = 0.72) {
  return new THREE.MeshBasicMaterial({
    color: ACCENT_COLOR,
    wireframe: true,
    transparent: true,
    opacity,
  });
}

/**
 * Clone a GLTF scene, apply wireframe material to all meshes,
 * then scale + center it so it fits within `targetHeight` world units.
 */
function cloneAsWireframe(scene, targetHeight = 2.6) {
  const cloned = scene.clone(true);

  // Apply wireframe material
  cloned.traverse((child) => {
    if (child.isMesh) {
      child.material = makeWireframeMat();
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  // Auto-fit to target height
  const box = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) cloned.scale.setScalar(targetHeight / maxDim);

  // Re-center
  box.setFromObject(cloned);
  const center = new THREE.Vector3();
  box.getCenter(center);
  cloned.position.sub(center);

  return cloned;
}

// ─── Wireframe Model ──────────────────────────────────────────────────────────

function WireframeModel({ url, targetHeight = 2.6, rotationSpeed = 0.18, yOffset = 0 }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef();

  // biome-ignore lint/correctness/useExhaustiveDependencies: url change means a new model load; scene/targetHeight are stable references
  const cloned = useMemo(() => cloneAsWireframe(scene, targetHeight), [url]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * rotationSpeed) * 0.2;
  });

  return (
    <group position={[0, yOffset, 0]}>
      <primitive ref={groupRef} object={cloned} />
    </group>
  );
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────

function CameraRig({ phase }) {
  const { camera } = useThree();
  const cfg = PHASE_CAMERA[phase] ?? PHASE_CAMERA.thinking;
  const targetPos = useRef(cfg.pos.clone());
  const targetLook = useRef(cfg.lookAt.clone());
  const currentLook = useRef(cfg.lookAt.clone());

  useEffect(() => {
    const next = PHASE_CAMERA[phase] ?? PHASE_CAMERA.thinking;
    targetPos.current.copy(next.pos);
    targetLook.current.copy(next.lookAt);
  }, [phase]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: init-once
  useEffect(() => {
    camera.position.copy(PHASE_CAMERA.thinking.pos);
    camera.lookAt(PHASE_CAMERA.thinking.lookAt);
  }, []);

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.045);
    currentLook.current.lerp(targetLook.current, 0.045);
    camera.lookAt(currentLook.current);
  });

  return null;
}

// ─── Particle shimmer plane ────────────────────────────────────────────────────
// A faint grid of points behind the model for depth/atmosphere.

function BackgroundParticles() {
  const count = 280;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 4 - 3;
    }
    return arr;
  }, []);

  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime * 0.025;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={ACCENT_COLOR}
        size={0.035}
        transparent
        opacity={0.28}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Preload ──────────────────────────────────────────────────────────────────

useGLTF.preload('/models/thinking_man.glb');
useGLTF.preload('/models/lowpoly_people.glb');

// ─── Main Canvas ──────────────────────────────────────────────────────────────

export default function IntroModelCanvas({ phase }) {
  const isWaving = phase === 'waving';

  return (
    <Canvas
      camera={{ position: [0, 0.5, 4.0], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <CameraRig phase={phase} />
      <ambientLight intensity={0.15} />

      <BackgroundParticles />

      <Suspense fallback={null}>
        {/* Thinking man — close-up, scaled down so base doesn't dominate,
            shifted up so the figure (not pedestal) is the focal point */}
        {!isWaving && (
          <WireframeModel
            url="/models/thinking_man.glb"
            targetHeight={1.7}
            rotationSpeed={0.15}
            yOffset={-1.1}
          />
        )}

        {/* Presenting group — zoomed out, pushed down below text overlay */}
        {isWaving && (
          <WireframeModel
            url="/models/lowpoly_people.glb"
            targetHeight={3.2}
            rotationSpeed={0.22}
            yOffset={-1.6}
          />
        )}
      </Suspense>

      <EffectComposer>
        <Bloom luminanceThreshold={0.05} luminanceSmoothing={0.85} intensity={0.9} />
      </EffectComposer>
    </Canvas>
  );
}
