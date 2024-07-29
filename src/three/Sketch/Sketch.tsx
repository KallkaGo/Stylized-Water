import { Environment, OrbitControls, useEnvironment } from "@react-three/drei";
import { useInteractStore, useLoadedStore } from "@utils/Store";
import { useEffect, useRef } from "react";
import Rock from "../components/Rock";
import Log from "../components/Log";
import Pond from "../components/Pond";
import Lifesaver from "../components/Lifesaver";

const Sketch = () => {
  const controlDom = useInteractStore((state) => state.controlDom);

  useEffect(() => {
    useLoadedStore.setState({ ready: true });
  }, []);

  return (
    <>
      <OrbitControls domElement={controlDom} />
      <color attach={"background"} args={["black"]} />
      <directionalLight position={[6, 4, 5]}  />
      <ambientLight />
      <group scale={0.01}>
        <Rock />
        <Log />
        <Pond />
        <Lifesaver />
      </group>
    </>
  );
};

export default Sketch;
