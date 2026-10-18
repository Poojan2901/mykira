import { useFrame } from '@react-three/fiber'
import { smooth, fx } from './progress'
import { band } from '../content/chapters'

export default function MoodDirector() {
  useFrame(() => {
    const p = smooth.p

    // Hurt
    const hurt = band(p, 0.4, 0.44) * (1 - band(p, 0.5, 0.535))
    fx.cold = hurt
    fx.warmth = 1 - 0.9 * hurt
    fx.sunDim = 1 - 0.55 * hurt
    fx.crack = band(p, 0.415, 0.46) * (1 - band(p, 0.505, 0.54))

    // Become the Sun
    fx.inside = band(p, 0.528, 0.565)

    // Night sky
    fx.night = band(p, 0.665, 0.7) * (1 - band(p, 0.93, 0.975))

    // Sunrise
    fx.dawn = band(p, 0.93, 0.97)
    fx.rise = band(p, 0.945, 0.995)
  })

  return null
}