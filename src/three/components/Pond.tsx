import { useFBX, useTexture } from "@react-three/drei";
import { useEffect } from "react";
import {
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

const Pond = () => {
  const model = useFBX("/model/Pond.FBX");
  const tex = useTexture("/textures/Shoreline.png");
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;

  useEffect(() => {
    model.traverse((child) => {
      if ((child as Mesh).isMesh) {
        if (child.name !== "Water") {
          const mat = (child as Mesh).material as MeshStandardMaterial;
          mat.map = tex;
        }
        if (child.name === "Water") {
          // child.visible = false;
        }
      }
    });
  }, []);

  return (
    <>
      <primitive object={model} position={[0, 0, 0]}></primitive>;
    </>
  );
};

export default Pond;
