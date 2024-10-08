import { useFBX } from "@react-three/drei";
import { Color, Mesh, MeshToonMaterial } from "three";

const Rock = () => {
  const model = useFBX("/model/Rock.FBX");
  model.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const mat = (child as Mesh).material as MeshToonMaterial;
      mat.color = new Color("grey");
    }
  });
  return <primitive object={model} position={[150, 0, -150]} />;
};

export default Rock;
