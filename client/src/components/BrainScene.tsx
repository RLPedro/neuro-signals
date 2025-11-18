import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useMemo } from "react";
import type { Mesh } from "three";
import { useNeuroData } from "../context/NeuroStreamContext";

const BrainMesh = () => {
  const { samples } = useNeuroData();
  const meshRef = useRef<Mesh | null>(null);

  const activations = useMemo(() => {
    if (!samples.length) return [0, 0, 0, 0];
    return samples.map((ch) => {
      if (!ch.values.length) return 0;
      const avg =
        ch.values.reduce((sum, v) => sum + Math.abs(v), 0) /
        ch.values.length;
      return Math.min(avg * 4, 1);
    });
  }, [samples]);

  useFrame(() => {
    if (!meshRef.current) return;
    const a = activations[0] ?? 0;
    meshRef.current.scale.setScalar(1 + a * 0.3);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  );
}

export const BrainScene = () => {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="font-semibold mb-2 text-sm">3D Brain View</h2>
      <div className="w-full h-72 md:h-[18rem] rounded-md overflow-hidden bg-slate-900">
        <Canvas camera={{ position: [0, 0, 3] }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[2, 2, 2]} intensity={0.8} />
          <BrainMesh />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
    </div>
  );
}
