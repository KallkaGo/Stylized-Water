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
  Color,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NormalBlending,
  NoToneMapping,
  RepeatWrapping,
  Texture,
  Uniform,
  UnsignedByteType,
} from "three";
import CustomMaterial from "three-custom-shader-material/vanilla";
import vertexShader from "../shader/water/vertex.glsl";
import fragmentShader from "../shader/water/fragment.glsl";
import { useDepthTexturePers } from "@utils/useDepthTexturePers";
import { useNormalBuffer } from "@utils/useNormalBuffer";
import { useControls } from "leva";
import {
  BrightnessContrast,
  ColorAverage,
  EffectComposer,
  SMAA,
  ToneMapping,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import GTToneMap from "../effect/GTToneMap";

const Sketch = () => {
  const noiseTex = useTexture("/textures/PerlinNoise.png");
  noiseTex.wrapS = noiseTex.wrapT = RepeatWrapping;

  const distortionTex = useTexture("/textures/WaterDistortion.png");

  const scene = useThree((state) => state.scene);
  const controlDom = useInteractStore((state) => state.controlDom);

  const uniforms = useMemo(
    () => ({
      uDepthTex: new Uniform(undefined) as Uniform<Texture | undefined>,
      uNoiseTex: new Uniform(noiseTex),
      uDisortTex: new Uniform(distortionTex),
      uNormalTex: new Uniform(undefined) as Uniform<Texture | undefined>,
      uNear: new Uniform(0),
      uFar: new Uniform(0),
      uTime: new Uniform(0),
      uFoamMaximumDistance: new Uniform(0.3),
      uFoamMinimumDistance: new Uniform(0.03),
      uFoamColor: new Uniform(new Color("white")),
    }),
    []
  );

  useControls("Water", {
    FoamColor: {
      value: "white",
      onChange: (v) => uniforms.uFoamColor.value.set(v),
    },
  });

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
        depthWrite: false,
        blending: NormalBlending,
      });

      waterMesh.material = newMat;
    }
    useLoadedStore.setState({ ready: true });
  }, []);

  const { depthTexture } = useDepthTexturePers(innerWidth, innerHeight);

  const { normalTexture } = useNormalBuffer();

  useFrame((state, delta) => {
    delta %= 1;
    uniforms.uNear.value = state.camera.near;
    uniforms.uFar.value = state.camera.far;
    uniforms.uTime.value += delta;
    uniforms.uDepthTex.value = depthTexture;
    uniforms.uNormalTex.value = normalTexture;
  });

  const gtProps = useControls("ToneMapGT", {
    MaxLuminanice: {
      value: 2,
      min: 1,
      max: 100,
      step: 0.01,
    },
    Contrast: {
      value: 1,
      min: 1,
      max: 5,
      step: 0.01,
    },
    LinearSectionStart: {
      value: 0.49,
      min: 0,
      max: 1,
      step: 0.01,
    },
    LinearSectionLength: {
      value: 0.12,
      min: 0,
      max: 0.99,
      step: 0.01,
    },
    BlackTightnessC: {
      value: 1.69,
      min: 1,
      max: 3,
      step: 0.01,
    },
    BlackTightnessB: {
      value: 0.0,
      min: 0,
      max: 1,
      step: 0.25,
    },
    Enabled: true,
  });

  return (
    <>
      <OrbitControls domElement={controlDom} minDistance={2} maxDistance={5} />
      <color attach={"background"} args={["ivory"]} />
      <ambientLight intensity={5} />
      <group scale={0.01 * 0.7}>
        <Rock />
        <Log />
        <Pond />
        <Lifesaver />
      </group>
      <EffectComposer
        disableNormalPass
        frameBufferType={HalfFloatType}
        multisampling={0}
      >
        <SMAA/>
        <GTToneMap {...gtProps} />
      </EffectComposer>
    </>
  );
};

export default Sketch;
