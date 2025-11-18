import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useNeuroData } from "../../context/NeuroStreamContext";
import { Color } from "three";

const MODEL_PATH = "/models/brain.glb";

type AnomalyMeta = {
  name: string;
  channels: string[];
  regionColor: number;
  description: string;
};

type AnomalyWithMeta = {
  type: "ANOMALY";
  ts: number;
  score: number;
  maxRms?: number;
  meta?: AnomalyMeta;
};

function BrainModel({
  activations,
  pulse,
  latestAnomaly,
}: {
  activations: number[];
  pulse: number;
  latestAnomaly?: AnomalyWithMeta | undefined;
}) {
  const gltf = useGLTF(MODEL_PATH, true) as any;
  const meshRef = useRef<any | null>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const safePulse = Math.max(0, Math.min(1, Number(pulse) || 0));
    const baseAct = Math.max(0, Math.min(1, activations?.[0] || 0));
    const base = 1 + baseAct * 0.08;
    const pulseScale = 1 + safePulse * 0.35;
    const finalScale = Math.max(0.8, Math.min(1.45, base * pulseScale));
    meshRef.current.scale.set(finalScale, finalScale, finalScale);
    meshRef.current.rotation.y += 0.003;
  });

  if (!gltf || !gltf.scene) {
    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.05, 64, 64]} />
        <meshStandardMaterial
          roughness={0.3}
          metalness={0.2}
          color={"#7c3aed"}
          emissive={"#ff4d6d"}
          emissiveIntensity={Math.max(0.02, Math.min(1.2, pulse * 0.8))}
        />
      </mesh>
    );
  }

  const scene = gltf.scene.clone(true);
  scene.traverse((child: any) => {
    if (child.isMesh && child.material) {
      try {
        const mat = child.material as any;
        if (mat && mat.emissive) {
          const safePulse = Math.max(0, Math.min(1, pulse || 0));
          const tint = new Color("#ff4d6d");

          mat.emissive.lerp(tint, Math.min(1, safePulse * 0.9));
          if ("emissiveIntensity" in mat) {
            mat.emissiveIntensity = Math.max(0.02, Math.min(1.2, safePulse * 0.9 + 0.05));
          }
        }
      } catch (err) {
        // console.warn("BrainModel material update skipped", err);
      }
    }
  });

  return (
    <group ref={meshRef}>
      <primitive object={scene} />
    </group>
  );
}

const OverlayAlert: React.FC = () => {
  const { anomalies } = useNeuroData();
  const latest = anomalies[anomalies.length - 1] as AnomalyWithMeta | undefined;
  if (!latest?.meta || latest.score < 0.65) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium border border-red-500/30"
      style={{ maxWidth: "72%", whiteSpace: "normal", wordBreak: "break-word" }}
    >
      <div className="text-red-300 font-semibold">{latest.meta.name}</div>
      <div className="text-xs opacity-90">Score: {(latest.score * 100).toFixed(0)}%</div>
    </div>
  );
};

const BrainSceneInner: React.FC = () => {
  const { samples, anomalies } = useNeuroData();
  const activations = React.useMemo(() => {
    if (!samples?.length) return [0, 0, 0, 0];
    return samples.map((ch: any) =>
      ch.values?.length
        ? Math.min(1, (ch.values.reduce((s: number, v: number) => s + Math.abs(v), 0) / ch.values.length) * 4)
        : 0
    );
  }, [samples]);

  const pulseRef = useRef(0);
  const latestAnomaly = anomalies[anomalies.length - 1] as AnomalyWithMeta | undefined;

  React.useEffect(() => {
    if (latestAnomaly) {
      const bump = Math.max(0, Math.min(1, latestAnomaly.score || 0)) * 1.0;
      pulseRef.current = Math.max(pulseRef.current, bump);
    }
  }, [latestAnomaly]);

  useFrame(() => {
    pulseRef.current *= 0.92;
    if (pulseRef.current < 0.0005) pulseRef.current = 0;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 10, 8]} intensity={0.9} />
      <hemisphereLight intensity={0.35} color="#ffffff" groundColor="#222222" />
      <BrainModel activations={activations} pulse={pulseRef.current} latestAnomaly={latestAnomaly} />
    </>
  );
};

export const BrainScene: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 max-w-2xl mx-auto">
      <h2 className="font-semibold mb-3 text-lg text-gray-800">3D Brain View</h2>
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 to-black shadow-2xl">
        <div className="w-full aspect-square md:aspect-auto md:w-96 md:h-96 mx-auto min-h-[18rem]">
          <Canvas camera={{ position: [0, 0, 3.1], fov: 50 }}>
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={1.5}
              maxDistance={5}
              autoRotate
              autoRotateSpeed={0.5}
              rotateSpeed={0.8}
              zoomSpeed={0.8}
            />
            <Suspense fallback={null}>
              <BrainSceneInner />
            </Suspense>
          </Canvas>
        </div>

        <OverlayAlert />
      </div>
    </div>
  );
};
