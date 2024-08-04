import { useFBX, useTexture } from "@react-three/drei";
import { useEffect } from "react";
import { Mesh, MeshStandardMaterial, SRGBColorSpace } from "three";

const Log = () => {
  const model = useFBX("/model/Log.FBX");
  const tex = useTexture("/textures/Log.png");
  tex.colorSpace = SRGBColorSpace;

  model.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const mat = (child as Mesh).material as MeshStandardMaterial;
      mat.map = tex;
    }
  });

  return <primitive object={model} position={[100, 0, 50]}></primitive>;
};

export default Log;
