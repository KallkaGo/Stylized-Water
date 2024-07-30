import {
  Environment,
  OrbitControls,
  useEnvironment,
  useTexture,
} from "@react-three/drei";
import { useInteractStore, useLoadedStore } from "@utils/Store";
import { useEffect, useMemo, useRef } from "react";
import Rock from "../components/Rock";
import Log from "../components/Log";
import Pond from "../components/Pond";
import Lifesaver from "../components/Lifesaver";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  RepeatWrapping,
  Texture,
  Uniform,
} from "three";
import CustomMaterial from "three-custom-shader-material/vanilla";
import vertexShader from "../shader/vertex.glsl";
import fragmentShader from "../shader/fragment.glsl";
import { useDepthTexturePers } from "@utils/useDepthTexturePers";

const Sketch = () => {
  const noiseTex = useTexture("/textures/PerlinNoise.png");
  noiseTex.wrapS = noiseTex.wrapT = RepeatWrapping;

  const distortionTex = useTexture('/textures/WaterDistortion.png')
  

  const scene = useThree((state) => state.scene);
  const controlDom = useInteractStore((state) => state.controlDom);

  const uniforms = useMemo(
    () => ({
      uDepthTex: new Uniform(undefined) as Uniform<Texture | undefined>,
      uNoiseTex: new Uniform(noiseTex),
      uDisortTex: new Uniform(distortionTex),
      uNear: new Uniform(0),
      uFar: new Uniform(0),
      uTime: new Uniform(0),
    }),
    []
  );

  useEffect(() => {
    const waterMesh = scene.getObjectByName("Water") as Mesh;
    if (waterMesh) {
      const mat = waterMesh.material as MeshToonMaterial;
      const newMat = new CustomMaterial({
        baseMaterial: MeshBasicMaterial,
        uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        silent: true,
      });

      waterMesh.material = newMat;
    }
    useLoadedStore.setState({ ready: true });
  }, []);

  const { depthTexture } = useDepthTexturePers(innerWidth, innerHeight);

  useFrame((state, delta) => {
    delta %= 1;
    uniforms.uNear.value = state.camera.near;
    uniforms.uFar.value = state.camera.far;
    uniforms.uTime.value += delta;
    uniforms.uDepthTex.value = depthTexture;
  });

  return (
    <>
      <OrbitControls domElement={controlDom} />
      <color attach={"background"} args={["ivory"]} />
      <ambientLight intensity={5} />
      <group scale={0.01 * 0.5}>
        <Rock />
        <Log />
        <Pond />
        <Lifesaver />
      </group>
    </>
  );
};

export default Sketch;
