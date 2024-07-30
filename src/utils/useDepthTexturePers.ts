import { useFBO } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useMemo } from "react"
import { DepthFormat, DepthTexture, MeshDepthMaterial, NearestFilter, RGBAFormat, ShaderMaterial, Texture, Uniform, UnsignedByteType, UnsignedShortType } from "three"
import { FullScreenQuad } from "three/examples/jsm/Addons.js"





const useDepthTexturePers = (width: number, height: number) => {

  const camera = useThree((state) => state.camera)

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
    const water = scene.getObjectByName("Water")
    if (!water) return
    const dpr = gl.getPixelRatio()
    rt.setSize(innerWidth * dpr, innerHeight * dpr)
    water.visible = false
    scene.overrideMaterial = material
    gl.setRenderTarget(rt)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    water.visible = true
    scene.overrideMaterial = null
  })

  return { depthTexture: rt.depthTexture as Texture }

}


export {
  useDepthTexturePers
}