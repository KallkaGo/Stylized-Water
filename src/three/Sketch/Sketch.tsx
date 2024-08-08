import {
  Float,
  OrbitControls,
  useTexture,
} from "@react-three/drei";
import { useInteractStore, useLoadedStore } from "@utils/Store";
import { useEffect,  useMemo, useRef } from "react";
import Rock from "../components/Rock";
import Log from "../components/Log";
import Pond from "../components/Pond";
import Lifesaver from "../components/Lifesaver";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NormalBlending,
  RepeatWrapping,
  Texture,
  Uniform,
  UnsignedByteType,
  Vector3,
} from "three";
import CustomMaterial from "three-custom-shader-material/vanilla";
import vertexShader from "../shader/water/vertex.glsl";
import fragmentShader from "../shader/water/fragment.glsl";
import shorelineVertex from "../shader/shoreline/vertex.glsl";
import shorelineFragment from "../shader/shoreline/fragment.glsl";
import { useDepthTexturePers } from "@utils/useDepthTexturePers";
import { useNormalBuffer } from "@utils/useNormalBuffer";
import { useControls } from "leva";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import GTToneMap from "../effect/GTToneMap";

const Sketch = () => {

  const noiseTex = useTexture("/textures/PerlinNoise.png");
  noiseTex.wrapS = noiseTex.wrapT = RepeatWrapping;

  const causticsTex = useTexture("/textures/caustics.png");
  causticsTex.wrapS = causticsTex.wrapT = RepeatWrapping;
  causticsTex.repeat.set(3, 3);

  const distortionTex = useTexture("/textures/WaterDistortion.png");

  const flowTex = useTexture("/textures/flowmap.png");
  flowTex.wrapS = flowTex.wrapT = RepeatWrapping;

  const normalTex = useTexture("/textures/water-normal.png");
  normalTex.wrapS = normalTex.wrapT = RepeatWrapping;

  const derivativeHeightTex = useTexture("/textures/derivativeHeight.png");
  derivativeHeightTex.wrapS = derivativeHeightTex.wrapT = RepeatWrapping;

  const scene = useThree((state) => state.scene);
  const controlDom = useInteractStore((state) => state.controlDom);

  const params = useRef({
    waterPos: new Vector3(0, 0, 0),
  });

  const waterMeshRef = useRef<Mesh | undefined>();

  const shorelioneMeshRef = useRef<Mesh | undefined>();

  const uniforms = useMemo(
    () => ({
      uDepthTex: new Uniform(undefined) as Uniform<Texture | undefined>,
      uNoiseTex: new Uniform(noiseTex),
      uDisortTex: new Uniform(distortionTex),
      uNormalTex: new Uniform(undefined) as Uniform<Texture | undefined>,
      uDerivativeHeightTex: new Uniform(derivativeHeightTex),
      uNear: new Uniform(0),
      uFar: new Uniform(0),
      uTime: new Uniform(0),
      uFoamMaximumDistance: new Uniform(0.3),
      uFoamMinimumDistance: new Uniform(0.03),
      uFoamColor: new Uniform(new Color("white")),
      uFlowTex: new Uniform(flowTex),
      uSurfaceNormalTex: new Uniform(normalTex),
      uTiling: new Uniform(0),
      uSpeed: new Uniform(0),
      uFlowOffset: new Uniform(0),
      uFlowStrength: new Uniform(0),
      uHeightScaleModulated: new Uniform(0),
      uHightScale: new Uniform(0),
    }),
    []
  );

  const shorelineUniforms = useMemo(
    () => ({
      uPosY: new Uniform(0),
      uCausticsTex: new Uniform(causticsTex),
      uTime: new Uniform(0),
    }),
    []
  );

  useEffect(() => {
    const waterMesh = scene.getObjectByName("Water") as Mesh;
    const shorelioneMesh = scene.getObjectByName("Shoreline") as Mesh;
    if (waterMesh) {
      const mat = waterMesh.material as MeshToonMaterial;
      const newMat = new CustomMaterial({
        baseMaterial: MeshPhysicalMaterial,
        uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        silent: true,
        depthWrite: false,
        blending: NormalBlending,
        sheen: 0.5,
        ior: 2,
        patchMap: {
          csm_SurfaceNormal: {
            "#include <normal_fragment_begin>": /* glsl */ `

                #include <normal_fragment_begin>
                vec2 flowVector = texture2D(uFlowTex, vUv).rg * 2. - 1.;

                flowVector *= uFlowStrength;
                

                float noise = texture2D(uFlowTex, vUv).a;
                
                vec3 uvwA = flowUVW(vUv, flowVector, uTime * uSpeed + noise, false, uTiling);
                vec3 uvwB = flowUVW(vUv, flowVector, uTime * uSpeed + noise, true, uTiling);

                // vec3 normalA = UnpackNormal(uSurfaceNormalTex, uvwA.xy) * uvwA.z;
                // vec3 normalB = UnpackNormal(uSurfaceNormalTex, uvwB.xy) * uvwB.z;

                float finalHeightScale = length(flowVector) * uHeightScaleModulated + uHightScale;

                vec3 dhA = UnpackDerivativeHeight(texture2D(uDerivativeHeightTex, uvwA.xy)) * (uvwA.z * finalHeightScale);

                vec3 dhB = UnpackDerivativeHeight(texture2D(uDerivativeHeightTex, uvwB.xy)) * (uvwB.z * finalHeightScale);

                vec3 oriNor = UnpackNormal(uSurfaceNormalTex, vUv*2.);

                // vec3 surface = normalize(normalA + normalB);

                mat3 tbn = getTangentFrame( - vViewPosition, normal, vUv);

                // https://www.yuque.com/u33646201/wh3mt6/abzffwzqynfcb5gm#WoGKk
                normal = normalize(tbn * vec3(-(dhA.xy + dhB.xy), 1.));

                // normal = oriNor;

            `,
          },
        },
      });
      waterMeshRef.current = waterMesh;
      waterMesh.material = newMat;
    }

    if (shorelioneMesh) {
      const mat = shorelioneMesh.material as MeshStandardMaterial;
      const newMat = new CustomMaterial({
        baseMaterial: mat,
        uniforms: shorelineUniforms,
        vertexShader: shorelineVertex,
        fragmentShader: shorelineFragment,
        silent: true,
        map: mat.map,
      });

      shorelioneMesh.material = newMat;
    }

    useLoadedStore.setState({ ready: true });
  }, []);

  const { depthTexture } = useDepthTexturePers(innerWidth, innerHeight, {
    ignoreObjects: [waterMeshRef],
  });

  const { normalTexture } = useNormalBuffer();

  useFrame((state, delta) => {
    delta %= 1;
    const { waterPos } = params.current;
    const waterMesh = waterMeshRef.current;
    if (waterMesh) {
      waterMesh.getWorldPosition(waterPos);
      shorelineUniforms.uPosY.value = waterPos.y;
      shorelineUniforms.uTime.value += delta;
    }
    uniforms.uNear.value = state.camera.near;
    uniforms.uFar.value = state.camera.far;
    uniforms.uTime.value += delta;
    uniforms.uDepthTex.value = depthTexture;
    uniforms.uNormalTex.value = normalTexture;
  });

  useControls("Water", {
    FoamColor: {
      value: "white",
      onChange: (v) => uniforms.uFoamColor.value.set(v),
    },
    tiling: {
      value: 0.3,
      min: 0,
      max: 10,
      step: 0.1,
      onChange: (v) => (uniforms.uTiling.value = v),
    },
    speed: {
      value: 0.15,
      min: 0,
      max: 5,
      step: 0.01,
      onChange: (v) => (uniforms.uSpeed.value = v),
    },
    flowOffset: {
      value: 0,
      min: -1,
      max: 1,
      step: 0.01,
      onChange: (v) => (uniforms.uFlowOffset.value = v),
    },
    flowStrength: {
      value: 0.15,
      min: 0,
      max: 10,
      step: 0.01,
      onChange: (v) => (uniforms.uFlowStrength.value = v),
    },
    heightScale: {
      value: 3.5,
      min: 0,
      max: 20,
      step: 0.01,
      onChange: (v) => (uniforms.uHightScale.value = v),
    },
    heightScaleModulated: {
      value: 9,
      min: 0,
      max: 20,
      step: 0.01,
      onChange: (v) => (uniforms.uHeightScaleModulated.value = v),
    },
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
      <ambientLight intensity={2.5} />
      <directionalLight position={[-6, 4, -5]} />
      <group scale={0.01 * 0.7}>
        <Rock />
        <Log />
        <Pond />
        <Float>
          <Lifesaver />
        </Float>
      </group>
      <EffectComposer
        disableNormalPass
        frameBufferType={UnsignedByteType}
        multisampling={0}
      >
        <SMAA />
        <GTToneMap {...gtProps} />
      </EffectComposer>
    </>
  );
};

export default Sketch;
