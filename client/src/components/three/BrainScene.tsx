import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useNeuroData } from "../../context/NeuroStreamContext";
import {
  Color,
  Mesh,
  Object3D,
  SphereGeometry,
  MeshBasicMaterial,
  Material,
  Vector3,
  Raycaster,
  MeshStandardMaterial,
} from "three";

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

const BrainModel = ({
  activations,
  pulse,
  latestAnomaly,
}: {
  activations: number[];
  pulse: number;
  latestAnomaly: AnomalyWithMeta | undefined;
}) => {
  const { scene } = useGLTF(MODEL_PATH);
  const groupRef = useRef<Object3D>(null);
  const copiedSceneRef = useRef<Object3D | null>(null);
  const markersRef = useRef<Mesh[]>([]);

  const electrodePositions: Record<string, [number, number, number]> = {
    Fp1: [-0.25, 0.92, 0.48],
    Fp2: [0.25, 0.92, 0.48],
    F7: [-0.80, 0.48, 0.40],
    F3: [-0.48, 0.62, 0.70],
    Fz: [0.00, 0.65, 0.78],
    F4: [0.48, 0.62, 0.70],
    F8: [0.80, 0.48, 0.40],
    T3: [-1.00, 0.12, 0.15],
    C3: [-0.70, 0.18, 0.66],
    Cz: [0.00, 0.20, 0.76],
    C4: [0.70, 0.18, 0.66],
    T4: [1.00, 0.12, 0.15],
    T5: [-0.72, -0.45, 0.28],
    P3: [-0.55, -0.38, 0.64],
    Pz: [0.00, -0.40, 0.72],
    P4: [0.55, -0.38, 0.64],
    T6: [0.72, -0.45, 0.28],
    O1: [-0.32, -0.82, 0.30],
    O2: [0.32, -0.82, 0.30],
  };

  useEffect(() => {
    if (scene && !copiedSceneRef.current) {
      copiedSceneRef.current = scene.clone(true);
    }
  }, [scene]);


  const addEmissive = (mat: Material | Material[], color: Color, intensity: number) => {
    const apply = (m: Material) => {
      if ("emissive" in m) (m as any).emissive = color.clone();
      if ("emissiveIntensity" in m) (m as any).emissiveIntensity = intensity;
      m.needsUpdate = true;
    };
    Array.isArray(mat) ? mat.forEach(apply) : apply(mat);
  };

  const projectToBrainSurface = (ideal: [number, number, number]): Vector3 => {
    if (!copiedSceneRef.current) return new Vector3(...ideal);

    const origin = copiedSceneRef.current.getWorldPosition(new Vector3());
    const direction = new Vector3(...ideal).sub(origin).normalize();
    const raycaster = new Raycaster(origin, direction, 0, 10);

    const intersects = raycaster.intersectObject(copiedSceneRef.current!, true);
    if (intersects.length > 0) {
      return intersects[0].point.add(intersects[0].face!.normal.clone().multiplyScalar(0.02));
    }
    return new Vector3(...ideal);
  };

  useFrame(() => {
    if (!groupRef.current || !copiedSceneRef.current) return;

    const baseScale = 1 + (activations[0] ?? 0) * 0.12;
    groupRef.current.scale.setScalar(baseScale * (1 + pulse * 0.35));
    groupRef.current.rotation.y += 0.003;

    const scene = copiedSceneRef.current;

    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh && mesh.material) {
        addEmissive(mesh.material, new Color(0x001133), 0.08 + pulse * 0.4);
      }
    });

    markersRef.current.forEach((m) => (m.visible = false));

    if (latestAnomaly?.meta?.channels) {
      const color = new Color(latestAnomaly.meta.regionColor || 0xff0033);
      let idx = 0;

      latestAnomaly.meta.channels.forEach((ch) => {
        if (pulse > 0.3) {
          scene.traverse((child) => {
            const mesh = child as Mesh;
            if (mesh.isMesh && mesh.name.toLowerCase().includes(ch.toLowerCase())) {
              addEmissive(mesh.material, color, 7 + pulse * 16);
            }
          });
        }

        const ideal = electrodePositions[ch];
        if (ideal) {
          let marker = markersRef.current[idx];
          if (!marker) {
            const mat = new MeshBasicMaterial({ color, toneMapped: false });
            marker = new Mesh(new SphereGeometry(0.05, 20, 20), mat);
            groupRef.current!.add(marker);
            markersRef.current.push(marker);
          }

          const surfacePos = projectToBrainSurface(ideal);
          marker.position.copy(surfacePos);
          marker.scale.setScalar(0.9 + Math.sin(Date.now() * 0.004) * 0.2);
          marker.visible = true;
          idx++;
        }
      });
    }
  });

  if (!copiedSceneRef.current) {
    return (
      <mesh ref={groupRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#334466" emissive="#3344aa" emissiveIntensity={0.8} />
      </mesh>
    );
  }

  return <group ref={groupRef}><primitive object={copiedSceneRef.current} /></group>;
};

const OverlayAlert = () => {
  const { anomalies } = useNeuroData();
  const latest = anomalies[anomalies.length - 1] as AnomalyWithMeta | undefined;
  if (!latest?.meta || latest.score < 0.65) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white px-5 py-3 rounded-xl text-base font-medium border border-red-500/60">
      <div className="text-red-400 font-bold text-lg">{latest.meta.name}</div>
      <div className="text-sm opacity-90">Score: {(latest.score * 100).toFixed(0)}%</div>
    </div>
  );
};

const BrainSceneInner = () => {
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
    if (latestAnomaly) pulseRef.current = Math.max(pulseRef.current, latestAnomaly.score * 2);
  }, [latestAnomaly]);

  useFrame(() => {
    pulseRef.current *= 0.93;
    if (pulseRef.current < 0.005) pulseRef.current = 0;
  });

  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[6, 10, 8]} intensity={1.4} />
      <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#333333" />
      <BrainModel activations={activations} pulse={pulseRef.current} latestAnomaly={latestAnomaly} />
    </>
  );
};

export const BrainScene: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 max-w-2xl mx-auto">
      <h2 className="font-semibold mb-3 text-lg text-gray-800">3D Brain View</h2>
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 to-black shadow-2xl">
        <div className="w-full aspect-square md:aspect-auto md:w-96 md:h-96 mx-auto">
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