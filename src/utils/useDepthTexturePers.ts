import { useFBO } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { MutableRefObject, RefObject, useMemo } from "react"
import { DepthFormat, DepthTexture, MeshDepthMaterial, NearestFilter, Object3D, Object3DEventMap, RGBAFormat, ShaderMaterial, Texture, Uniform, UnsignedByteType, UnsignedShortType } from "three"
import { FullScreenQuad } from "three/examples/jsm/Addons.js"


interface iConfig {
  ignoreObjects?: MutableRefObject<Object3D<Object3DEventMap> | undefined>[]
}


const useDepthTexturePers = (width: number, height: number, config: iConfig) => {

  const camera = useThree((state) => state.camera)

  const { ignoreObjects = [] } = config

  const rt = useFBO(width, height, {
    depthBuffer: true,
    stencilBuffer: false,
    depthTexture: new DepthTexture(width, height),
    generateMipmaps: false,
    format: RGBAFormat,
  })
  rt.depthTexture.format = DepthFormat
  rt.depthTexture.type = UnsignedShortType

  const material = useMemo(() => new MeshDepthMaterial(), [])


  useFrame((state, delta) => {
    const { gl, scene } = state
    if (ignoreObjects.some((item) => !item.current)) return
    const dpr = gl.getPixelRatio()
    rt.setSize(innerWidth * dpr, innerHeight * dpr)
    ignoreObjects.forEach((item) => {
      item.current!.visible = false
    })
    scene.overrideMaterial = material
    gl.setRenderTarget(rt)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    ignoreObjects.forEach((item) => {
      item.current!.visible = true
    })
    scene.overrideMaterial = null
  })

  return { depthTexture: rt.depthTexture as Texture }

}


export {
  useDepthTexturePers
}