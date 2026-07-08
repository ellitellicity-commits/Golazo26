import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import './FloatingShapes.css'

// Low-poly geometric shapes drifting behind the home hero — the FIFA 26
// "unify / amplify" language extended into 3D. Raw three.js (the project has no
// R3F; this mirrors GlobeHero's renderer setup) with GSAP driving every drift and
// spin, and rendering pinned to GSAP's ticker so the two never fight.
//
// Colours come from the FIFA multicolour brand palette (tokens.css) — designated
// "brand chrome, never a data encoding," so it stays clear of the role-locked
// green/red/blue/gold. Opacity is deliberately low: this is atmosphere behind the
// text, never a competing surface, and never a neon glow.
//
// Lazy-loaded by Home so three.js never lands in the initial home bundle; the
// canvas simply fades in once the chunk arrives.

// Brand-chrome hues (no purple/teal — those are DESIGN.md hard stops).
const HUES = [0x304fff, 0x00c752, 0xff3d00, 0x2196f2, 0xb0eb00, 0x1a247d, 0xedff42]

// Each shape: a low-poly primitive, a spot in space, a size. Hand-placed so they
// spread across the hero and cluster toward the edges, leaving the centre (where
// the copy sits) quieter.
const SHAPES = [
  { geo: 'ico', x: -3.4, y: 1.6, z: -1.5, s: 0.62 },
  { geo: 'tetra', x: 3.7, y: 1.9, z: -2.2, s: 0.8 },
  { geo: 'octa', x: 4.3, y: -1.4, z: -1.0, s: 0.55 },
  { geo: 'dodeca', x: -4.1, y: -1.7, z: -2.6, s: 0.7 },
  { geo: 'ico', x: 2.2, y: 2.4, z: -3.4, s: 0.4 },
  { geo: 'torus', x: -2.6, y: -0.4, z: -3.0, s: 0.5 },
  { geo: 'tetra', x: 0.6, y: -2.3, z: -2.8, s: 0.46 },
  { geo: 'octa', x: -1.1, y: 2.7, z: -3.8, s: 0.34 },
]

function makeGeometry(kind, s) {
  switch (kind) {
    case 'tetra':
      return new THREE.TetrahedronGeometry(s)
    case 'octa':
      return new THREE.OctahedronGeometry(s)
    case 'dodeca':
      return new THREE.DodecahedronGeometry(s)
    case 'torus':
      return new THREE.TorusGeometry(s, s * 0.4, 8, 20)
    case 'ico':
    default:
      return new THREE.IcosahedronGeometry(s)
  }
}

export default function FloatingShapes({ className = '' }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let width = mount.clientWidth || 1200
    let height = mount.clientHeight || 600

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return // No WebGL — the hero just keeps its flat ground, no error.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.set(0, 0, 6)

    // Low matte light — enough to face the facets, never enough to gloss or glow.
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.DirectionalLight(0xffffff, 0.7)
    key.position.set(-2, 3, 4)
    scene.add(key)

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const meshes = []
    const tweens = []

    SHAPES.forEach((spec, i) => {
      const geo = makeGeometry(spec.geo, spec.s)
      const mat = new THREE.MeshStandardMaterial({
        color: HUES[i % HUES.length],
        roughness: 0.85,
        metalness: 0,
        flatShading: true,
        transparent: true,
        opacity: 0.12,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(spec.x, spec.y, spec.z)
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      scene.add(mesh)
      meshes.push(mesh)

      if (!reduce) {
        // Continuous slow spin + a gentle vertical bob. Every value is small and
        // long-period so the field breathes rather than churns.
        tweens.push(
          gsap.to(mesh.rotation, {
            y: mesh.rotation.y + Math.PI * 2,
            x: mesh.rotation.x + Math.PI * 2,
            duration: 34 + i * 5,
            ease: 'none',
            repeat: -1,
          }),
          gsap.to(mesh.position, {
            y: spec.y + (i % 2 ? -0.45 : 0.45),
            duration: 6 + i,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          }),
        )
      }
    })

    const render = () => renderer.render(scene, camera)

    if (reduce) {
      render() // one static frame, no ticker
    } else {
      // Pin rendering to GSAP's ticker so the scene redraws exactly when GSAP
      // advances the tweens — one clock, no drift.
      gsap.ticker.add(render)
    }

    // Fade the whole canvas in once it's live, so there's no hard pop.
    gsap.fromTo(renderer.domElement, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.out' })

    const onResize = () => {
      width = mount.clientWidth || width
      height = mount.clientHeight || height
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      if (reduce) render()
    }
    window.addEventListener('resize', onResize)

    // Pause the ticker work when the tab is hidden (and when the hero scrolls out
    // of view) — no point burning GPU on shapes nobody can see.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (reduce) return
        if (entry.isIntersecting) gsap.ticker.add(render)
        else gsap.ticker.remove(render)
      },
      { threshold: 0 },
    )
    io.observe(mount)

    return () => {
      window.removeEventListener('resize', onResize)
      io.disconnect()
      gsap.ticker.remove(render)
      tweens.forEach((t) => t.kill())
      meshes.forEach((m) => {
        m.geometry.dispose()
        m.material.dispose()
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className={`floating-shapes ${className}`.trim()} aria-hidden="true" />
}
