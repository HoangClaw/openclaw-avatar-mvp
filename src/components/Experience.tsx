'use client';

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Avatar } from "./Avatar";
import { useEffect, useRef } from "react";
import * as THREE from "three";

function CameraHandler() {
  const { camera } = useThree();
  const targetFov = useRef(30);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'e' || e.key === 'E') {
          // Zoom In
          targetFov.current = Math.max(15, targetFov.current - 2);
        }
        if (e.key === 'q' || e.key === 'Q') {
          // Zoom Out
          targetFov.current = Math.min(60, targetFov.current + 2);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useFrame(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov.current, 0.1);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

export default function Experience() {
  return (
    <Canvas shadows camera={{ position: [0, 0.5, 1.5], fov: 30 }}>
      <CameraHandler />
      <OrbitControls 
        target={[0, 0.55, 0]} // Focus on head (approx 1.55m height - 1m offset)
        enableZoom={false} 
        enablePan={false} 
        minPolarAngle={Math.PI / 2.5} 
        maxPolarAngle={Math.PI / 2}
      />
      <Environment preset="city" />
      <group position={[0, -1, 0]}>
        <Avatar />
      </group>
    </Canvas>
  );
}
