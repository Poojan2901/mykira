import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, HueSaturation, Noise, Vignette } from '@react-three/postprocessing'
import { smooth, fx } from './progress'
import { band } from '../content/chapters'

export default function Effects() {
  const bloom = useRef()
  const sat = useRef()
  const vignette = useRef()

  useFrame(() => {
    const cold = fx.cold
    if (bloom.current) {
      bloom.current.intensity =
        (0.6 + 1.6 * band(smooth.p, 0.05, 0.2)) * (1 - 0.45 * cold) + 0.5 * fx.rise
    }
    if (sat.current) sat.current.saturation = -0.4 * cold + 0.08 * fx.rise
    if (vignette.current) vignette.current.darkness = 0.85 + 0.12 * cold - 0.2 * fx.rise
  })

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        ref={bloom}
        mipmapBlur
        luminanceThreshold={0.85}
        luminanceSmoothing={0.2}
        intensity={0.6}
        radius={0.8}
      />
      <HueSaturation ref={sat} saturation={0} />
      <Noise premultiply opacity={0.035} />
      <Vignette ref={vignette} offset={0.25} darkness={0.85} />
    </EffectComposer>
  )
}