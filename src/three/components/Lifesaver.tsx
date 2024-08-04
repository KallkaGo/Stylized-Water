import { useFBX, useTexture } from "@react-three/drei";
import { useEffect } from "react";
import {
  Mesh,
  MeshStandardMaterial,
  MeshToonMaterial,
  SRGBColorSpace,
} from "three";

const Lifesaver = () => {
  const model = useFBX("/model/Lifesaver.FBX");
  const tex = useTexture("/textures/Lifesaver.png");
  tex.colorSpace = SRGBColorSpace;

  model.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const mat = (child as Mesh).material as MeshToonMaterial;
      mat.map = tex;
    }
  });

  return <primitive object={model} scale={0.5} position={[-120, 0, -50]} />;
};

export default Lifesaver;
