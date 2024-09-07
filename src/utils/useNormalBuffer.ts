import { useFBO } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useMemo } from "react"
import { MeshNormalMaterial } from "three"

const useNormalBuffer = () => {

  const renderTarget = useFBO(innerWidth, innerHeight, {
    generateMipmaps: false,
    samples: 16
  })

  const material = useMemo(() => new MeshNormalMaterial(), [])

  useFrame((state, delta) => {
    const { scene, gl, camera } = state
    const dpr = gl.getPixelRatio()
    const water = scene.getObjectByName("Water")
    if (!water) return
    renderTarget.setSize(innerWidth * dpr, innerHeight * dpr)
    gl.setRenderTarget(renderTarget)
    scene.overrideMaterial = material
    water.visible = false
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    water.visible = true
    scene.overrideMaterial = null

  })

  return {
    normalTexture: renderTarget.texture
  }

}


export {
  useNormalBuffer
}