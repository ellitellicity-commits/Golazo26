import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './CountryEmblem.css'

// Original animated host-nation emblems — NOT mascots. Each is an extruded 2D
// shape (ExtrudeGeometry) with its own signature motion, shown in a shared fixed
// container so the three read as one broadcast-graphic system. Triggered when a
// flight crosses into a host's airspace; plays ~2.8s, then dismisses via onDone.
//
//   Canada  — a faceted maple leaf scales/unfolds open while slowly rotating,
//             beveled edges catching the key light. Canadian red, light bevel.
//   Mexico  — a sunburst medallion: a gold disc scales in, then green rays sweep
//             outward in staggered sequence like a shutter opening.
//   USA     — a faceted star flies in from off-screen, throws a brief spark burst
//             on arrival, then settles into a slow rotation. American blue.

const DURATION_MS = 2800
const COUNTRY = {
  CA: { label: 'Canada', build: buildCanada },
  MX: { label: 'Mexico', build: buildMexico },
  US: { label: 'United States', build: buildUSA },
}

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const easeOutQuint = (x) => 1 - Math.pow(1 - clamp01(x), 5)

// --- Geometry builders: each returns { group, update(elapsedSeconds) } ---------

function mapleShape() {
  // Right-half profile (stem at bottom centre, apex at top); mirrored for
  // symmetry. A deliberately angular, faceted reading of a maple leaf — lower
  // lobe, a wide lateral lobe, upper points, apex — not the literal flag leaf.
  const R = [
    [0.0, -0.95], [0.09, -0.4], [0.3, -0.48], [0.2, -0.22], [0.58, -0.22], [0.34, 0.0],
    [0.3, 0.12], [0.52, 0.2], [0.28, 0.3], [0.22, 0.42], [0.36, 0.54], [0.12, 0.52], [0.13, 0.8], [0.0, 1.0],
  ]
  const s = new THREE.Shape()
  s.moveTo(R[0][0], R[0][1])
  for (let i = 1; i < R.length; i++) s.lineTo(R[i][0], R[i][1])
  for (let i = R.length - 2; i >= 1; i--) s.lineTo(-R[i][0], R[i][1])
  s.closePath()
  return s
}

function buildCanada() {
  const group = new THREE.Group()
  const geo = new THREE.ExtrudeGeometry(mapleShape(), {
    depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 2,
  })
  geo.center()
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xed4a49, roughness: 0.36, metalness: 0.18 }))
  mesh.scale.setScalar(0.92)
  group.add(mesh)
  group.rotation.x = -0.08
  return {
    group,
    update(t) {
      // Unfold open (scale + a slight upright unfurl), then a gentle frontal sway
      // on Y so the leaf stays readable while the bevels catch the moving light.
      const s = easeOutQuint(t / 0.7)
      group.scale.setScalar(0.3 + 0.82 * s)
      group.rotation.z = (1 - s) * 0.45
      group.rotation.y = Math.sin(t * 1.1) * 0.4
    },
  }
}

function triangleRay() {
  const s = new THREE.Shape()
  s.moveTo(-0.085, 0)
  s.lineTo(0.085, 0)
  s.lineTo(0, 0.58)
  s.closePath()
  return s
}

function buildMexico() {
  const group = new THREE.Group()
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.18, 40),
    new THREE.MeshStandardMaterial({ color: 0xecc94a, roughness: 0.3, metalness: 0.35 }),
  )
  disc.rotation.x = Math.PI / 2
  group.add(disc)
  const rayGeo = new THREE.ExtrudeGeometry(triangleRay(), { depth: 0.14, bevelEnabled: false })
  const N = 12
  const rays = []
  for (let i = 0; i < N; i++) {
    const pivot = new THREE.Group()
    const m = new THREE.Mesh(rayGeo, new THREE.MeshStandardMaterial({ color: 0x35c26d, roughness: 0.5 }))
    m.position.y = 0.44
    pivot.add(m)
    pivot.rotation.z = (i / N) * Math.PI * 2
    group.add(pivot)
    rays.push(pivot)
  }
  return {
    group,
    update(t) {
      disc.scale.setScalar(easeOutQuint(t / 0.4))
      rays.forEach((p, i) => {
        const delay = 0.2 + (i / N) * 0.7
        p.scale.setScalar(easeOutQuint((t - delay) / 0.5))
      })
      group.rotation.z = t * 0.22
    },
  }
}

function starShape(spikes = 5, outer = 0.62, inner = 0.27) {
  const s = new THREE.Shape()
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

function buildUSA() {
  const group = new THREE.Group()
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape(), { depth: 0.24, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x439bf7, roughness: 0.4, metalness: 0.2 }),
  )
  star.geometry.center()
  group.add(star)
  // Spark burst — small points scattered on unit-ish directions, expanded and
  // faded on arrival.
  const n = 44
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(0.55 + Math.random() * 0.25)
    pos[i * 3] = v.x
    pos[i * 3 + 1] = v.y
    pos[i * 3 + 2] = v.z * 0.4
  }
  const pgeo = new THREE.BufferGeometry()
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const sparks = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xf6f6f6, size: 0.06, transparent: true }))
  group.add(sparks)
  return {
    group,
    update(t) {
      const flyIn = easeOutQuint(t / 0.32)
      star.position.x = (1 - flyIn) * 2.6
      const bt = clamp01((t - 0.32) / 0.55)
      sparks.scale.setScalar(0.3 + bt * 1.7)
      sparks.material.opacity = bt < 1 ? 1 - bt : 0
      if (t > 0.5) star.rotation.y = (t - 0.5) * 0.7
    },
  }
}

// --- Component -----------------------------------------------------------------

function CountryEmblem({ country, onDone }) {
  const mountRef = useRef(null)
  const [leaving, setLeaving] = useState(false)
  const def = COUNTRY[country]

  // Lifecycle: hold, then trigger the exit transition, then unmount.
  useEffect(() => {
    const exit = setTimeout(() => setLeaving(true), DURATION_MS - 460)
    const done = setTimeout(() => onDone && onDone(), DURATION_MS)
    return () => {
      clearTimeout(exit)
      clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country])

  // Three.js scene for the emblem geometry + its signature motion.
  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !def) return
    const size = 200
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0, 2.7)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(size, size)
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1)
    keyLight.position.set(-1.4, 1.6, 2.2)
    scene.add(keyLight)

    const { group, update } = def.build()
    scene.add(group)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    let raf = 0
    let disposed = false
    const tick = () => {
      if (disposed) return
      raf = requestAnimationFrame(tick)
      const t = reduce ? 1 : (performance.now() - start) / 1000
      update(t)
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose())
      })
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [def])

  if (!def) return null
  return (
    <div className={`emblem emblem--${country}${leaving ? ' is-leaving' : ''}`} data-country={country} role="status" aria-live="polite">
      <div className="emblem__stage" ref={mountRef} aria-hidden="true" />
      <p className="emblem__label">
        <span className="emblem__label-kicker">Now entering</span>
        <span className="emblem__label-country">{def.label}</span>
      </p>
    </div>
  )
}

export default CountryEmblem
