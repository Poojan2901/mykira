import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth, fx } from '../progress'
import { band, local } from '../../content/chapters'
import { BEATS } from '../../content/story'
import { shardVertex, shardFragment } from '../shaders/shard'

const SUN_RADIUS = 3

// One big shard per honest line. side = opposite the caption.
const HEROES = [
  { beat: 'hurt-2', side: 1 },
  { beat: 'hurt-3', side: -1 },
  { beat: 'hurt-4', side: 1 },
  { beat: 'hurt-5', side: -1 },
].map((h) => {
  const b = BEATS.find((x) => x.id === h.beat)
  return { ...h, win: [b.from - 0.008, b.to + 0.008] }
})

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const ease = (t) => t * t * (3 - 2 * t)

const _dummy = new THREE.Object3D()
const _start = new THREE.Vector3()
const _ctrl = new THREE.Vector3()
const _target = new THREE.Vector3()
const _hold = new THREE.Vector3()
const _pos = new THREE.Vector3()
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _sunView = new THREE.Vector3()

function bezier(out, a, c, b, t) {
  _a.lerpVectors(a, c, t)
  _b.lerpVectors(c, b, t)
  return out.lerpVectors(_a, _b, t)
}

export default function Shards() {
  const mesh = useRef()
  const camera = useThree((s) => s.camera)
  const isTouch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const count = isTouch ? 40 : 70

  // Faceted thin crystal
  const geometry = useMemo(() => {
    const g = new THREE.OctahedronGeometry(1, 0).toNonIndexed()
    g.computeVertexNormals()
    return g
  }, [])

  const data = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const hero = i < HEROES.length ? HEROES[i] : null

      // Cloud position around her, keeping the centre view clear
      const target = new THREE.Vector3()
      do {
        target.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -12 + Math.random() * 16)
      } while (Math.abs(target.x) < 1.8 && Math.abs(target.y) < 1.4 && target.z < 0)

      arr.push({
        hero,
        seed: Math.random(),
        dir: new THREE.Vector3().randomDirection(),
        target,
        scale: new THREE.Vector3(
          0.25 + Math.random() * 0.35,
          0.6 + Math.random() * 0.8,
          0.05 + Math.random() * 0.04
        ).multiplyScalar(hero ? 2.2 : 1),
        axis: new THREE.Vector3().randomDirection(),
        spin: (Math.random() - 0.5) * 0.6,
      })
    }
    return arr
  }, [count])

  const attrs = useMemo(() => {
    const seed = new Float32Array(count)
    const bright = new Float32Array(count).fill(1)
    data.forEach((d, i) => (seed[i] = d.seed))
    return {
      seed: new THREE.InstancedBufferAttribute(seed, 1),
      bright: new THREE.InstancedBufferAttribute(bright, 1),
    }
  }, [data, count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shardVertex,
        fragmentShader: shardFragment,
        uniforms: {
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uSunDir: { value: new THREE.Vector3(0, 0, -1) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useFrame((state) => {
    const p = smooth.p
    const visible = p > 0.395 && p < 0.54
    mesh.current.visible = visible
    if (!visible) return

    const t = state.clock.elapsedTime
    const k = local(p, 'hurt')

    material.uniforms.uTime.value = t
    material.uniforms.uOpacity.value = band(p, 0.4, 0.42) * (1 - band(p, 0.52, 0.54))
    _sunView.copy(fx.sunPos).applyMatrix4(camera.matrixWorldInverse).normalize()
    material.uniforms.uSunDir.value.copy(_sunView)

    const halfW =
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 5 * Math.max(camera.aspect, 0.5)
    const portrait = camera.aspect < 1
    const heal = ease(clamp01((k - 0.82) / 0.18)) // drift back home at the end

    data.forEach((d, i) => {
      // Staggered break-off from the sun surface
      const br = ease(clamp01(k * 2.2 - d.seed * 0.8))

      _start.copy(d.dir).multiplyScalar(SUN_RADIUS).add(fx.sunPos)

      // Slow orbit of the cloud around her
      const ang = t * 0.02 + d.seed * 0.5
      _target.copy(d.target)
      _target.x = d.target.x * Math.cos(ang) - d.target.z * Math.sin(ang) * 0.15
      _target.y += Math.sin(t * 0.3 + d.seed * 10) * 0.25

      // Hero shard: hold beside her during its line
      let heroW = 0
      if (d.hero) {
        const ht = (p - d.hero.win[0]) / (d.hero.win[1] - d.hero.win[0])
        if (ht > 0 && ht < 1) heroW = Math.pow(Math.sin(Math.PI * ht), 2)
        _hold.set(portrait ? 0 : d.hero.side * Math.min(3, halfW * 0.5), portrait ? 1.2 : 0.2, -5)
        _target.lerp(_hold, heroW)
      }

      _ctrl.lerpVectors(_start, _target, 0.5)
      _ctrl.y += 2 + d.seed * 2
      bezier(_pos, _start, _ctrl, _target, br)
      _pos.lerp(_start, heal)

      // Hero turns to face her while held
      const spin = d.seed * 10 + t * d.spin * (1 - heroW * 0.8)
      _q.setFromAxisAngle(d.axis, spin)

      _dummy.position.copy(_pos)
      _dummy.quaternion.copy(_q)
      _dummy.scale.copy(d.scale).multiplyScalar(br * (1 - heal * 0.7) + 0.0001)
      _dummy.updateMatrix()
      mesh.current.setMatrixAt(i, _dummy.matrix)

      attrs.bright.array[i] = 1 + heroW * 1.5
    })

    mesh.current.instanceMatrix.needsUpdate = true
    attrs.bright.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} visible={false}>
      <primitive object={attrs.seed} attach="geometry-attributes-aSeed" />
      <primitive object={attrs.bright} attach="geometry-attributes-aBright" />
    </instancedMesh>
  )
}