import { useEffect, useState } from 'react'
import * as THREE from 'three'

// Loads a texture if the file exists and `enabled` is true.
// Missing file = null, no crash.
export default function useOptionalTexture(url, enabled = true) {
  const [tex, setTex] = useState(null)

  useEffect(() => {
    if (!url || !enabled) return
    let alive = true
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (!alive) return t.dispose()
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        setTex(t)
      },
      undefined,
      () => {}
    )
    return () => {
      alive = false
    }
  }, [url, enabled])

  useEffect(() => () => tex?.dispose(), [tex])

  return tex
}