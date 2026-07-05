import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Procedural 3D stadium (B2). One parameterized builder drives all 16 host
// venues from their spec in lib/stadiumInfo.js — plan (footprint), tiers (bowl
// height), roof variant, and neutral tone — so each reads as a distinct
// silhouette rather than one model reused with a label swap. Interim stylized
// geometry (Spline has no headless export in this environment), grounded loosely
// in each real stadium's roof/shape. Rendered in a small always-on canvas with a
// slow turntable rotation, mirroring CountryEmblem's self-contained scene setup.

const PITCH = 0x2f6f47 // natural turf green — literal pitch colour, not a data channel

// Footprint point at parameter t∈[0,1). `corner` < 1 bulges the ellipse toward a
// rectangle (squared stands); aspect elongates one axis (oval vs round).
function footprint(plan, t, r) {
  const a = t * Math.PI * 2
  const c = Math.cos(a), s = Math.sin(a)
  const aspect = plan === 'oval' ? 1.45 : plan === 'rect' ? 1.28 : 1.12
  const corner = plan === 'rect' ? 0.68 : 1
  const sgnPow = (v) => Math.sign(v) * Math.pow(Math.abs(v), corner)
  return [aspect * r * sgnPow(c), r * sgnPow(s)]
}

// True when angle-parameter t is inside the built portion of the bowl. `oneSide`
// keeps a single long stand; `openEnd` cuts a gap at one end (BBVA's mountain view).
function inBowl(spec, t) {
  const deg = t * 360
  if (spec.oneSide) return deg > 20 && deg < 160 // one long side only
  if (spec.openEnd) return !(deg > 335 || deg < 25) // gap at one end
  return true
}

function buildBowl(spec) {
  const g = new THREE.Group()
  const N = 96
  const rIn = 1.0
  const rOut = 1.52
  const baseH = 0.16 * spec.tiers
  const mat = new THREE.MeshStandardMaterial({ color: spec.tone, roughness: 0.82, metalness: 0.05, side: THREE.DoubleSide })
  const seat = []
  const wall = []
  const heightAt = (t) => (spec.asym ? baseH * (0.6 + 0.8 * Math.max(0, Math.sin(t * Math.PI * 2))) : baseH)
  for (let i = 0; i <= N; i++) {
    const t = i / N
    if (!inBowl(spec, t)) { seat.push(null); wall.push(null); continue }
    const [xi, zi] = footprint(spec.plan, t, rIn)
    const [xo, zo] = footprint(spec.plan, t, rOut)
    const h = heightAt(t)
    seat.push([xi, 0.02, zi, xo, h, zo]) // inner-bottom, outer-top (raked seating)
    wall.push([xo, h, zo, xo, 0, zo]) // outer facade wall
  }
  const pushBand = (rows, arr) => {
    const pos = []
    for (let i = 0; i < rows.length - 1; i++) {
      const A = rows[i], B = rows[i + 1]
      if (!A || !B) continue
      const [ax1, ay1, az1, ax2, ay2, az2] = A
      const [bx1, by1, bz1, bx2, by2, bz2] = B
      // two triangles: (A1,A2,B2) (A1,B2,B1)
      pos.push(ax1, ay1, az1, ax2, ay2, az2, bx2, by2, bz2)
      pos.push(ax1, ay1, az1, bx2, by2, bz2, bx1, by1, bz1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.computeVertexNormals()
    arr.add(new THREE.Mesh(geo, mat))
  }
  pushBand(seat, g)
  pushBand(wall, g)
  // Tier step lines — thin darker rings partway up the rake, one per tier.
  for (let k = 1; k < spec.tiers; k++) {
    const frac = k / spec.tiers
    const pts = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      if (!inBowl(spec, t)) continue
      const [xi, , zi] = footprint(spec.plan, t, rIn + (rOut - rIn) * frac)
      pts.push(new THREE.Vector3(xi, 0.02 + heightAt(t) * frac, zi))
    }
    if (pts.length > 1) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2b2f34 })))
  }
  return { group: g, baseH, rOut }
}

function buildRoof(spec, baseH, rOut) {
  const g = new THREE.Group()
  const y = baseH + 0.02
  const steel = new THREE.MeshStandardMaterial({ color: 0xd7dbe0, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide })
  const glass = new THREE.MeshStandardMaterial({ color: 0xeef2f7, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  const ringPoints = (r) => { const p = []; for (let i = 0; i <= 96; i++) { const [x, z] = footprint(spec.plan, i / 96, r); p.push(new THREE.Vector3(x, y, z)) } return p }

  if (spec.roof === 'ring') {
    // Flat cover annulus over the back rows, open centre.
    const shape = new THREE.Shape(); const hole = new THREE.Path()
    for (let i = 0; i <= 96; i++) { const [x, z] = footprint(spec.plan, i / 96, rOut); if (i) shape.lineTo(x, z); else shape.moveTo(x, z) }
    for (let i = 0; i <= 96; i++) { const [x, z] = footprint(spec.plan, i / 96, rOut * 0.72); if (i) hole.lineTo(x, z); else hole.moveTo(x, z) }
    shape.holes.push(hole)
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), steel); m.rotation.x = -Math.PI / 2; m.position.y = y
    g.add(m)
  } else if (spec.roof === 'canopy') {
    // Large translucent disc floating above the bowl (SoFi/Akron).
    const disc = new THREE.Mesh(new THREE.CircleGeometry(rOut * 1.28, 64), glass)
    disc.rotation.x = -Math.PI / 2; disc.position.y = y + 0.12
    disc.scale.set(spec.plan === 'oval' ? 1.45 : 1.1, 1, 1)
    g.add(disc)
  } else if (spec.roof === 'retract') {
    // Two panels leaving a centre slit.
    for (const sgn of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(rOut * 2.4, rOut * 0.72), steel)
      p.rotation.x = -Math.PI / 2; p.position.set(0, y + 0.04, sgn * rOut * 0.5)
      g.add(p)
    }
  } else if (spec.roof === 'pinwheel') {
    // Radial triangular panels around an aperture (Mercedes-Benz).
    const n = 8
    for (let i = 0; i < n; i++) {
      const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(rOut * 1.15, 0.28); tri.lineTo(rOut * 1.15, -0.28); tri.closePath()
      const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), steel)
      m.rotation.x = -Math.PI / 2
      const a = (i / n) * Math.PI * 2
      m.position.set(Math.cos(a) * rOut * 0.42, y + 0.05, Math.sin(a) * rOut * 0.42)
      m.rotation.z = -a + 0.35
      g.add(m)
    }
  } else if (spec.roof === 'sides') {
    // Roof strips over the long sides only (open ends).
    const sides = spec.oneSide ? [1] : [-1, 1]
    for (const sgn of sides) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(rOut * 2.0, rOut * 0.5), steel)
      strip.rotation.x = -Math.PI / 2; strip.position.set(0, y, sgn * rOut * 0.78)
      g.add(strip)
    }
  }
  // faint support ring for roofed variants (not the fully open bowls)
  if (spec.roof !== 'open') g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPoints(rOut)), new THREE.LineBasicMaterial({ color: 0x3a3f45 })))
  return g
}

export function buildStadium(spec) {
  const root = new THREE.Group()
  // Pitch.
  const pitch = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), new THREE.MeshStandardMaterial({ color: PITCH, roughness: 1 }))
  pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.01
  pitch.scale.set(spec.plan === 'oval' ? 1.4 : 1.05, 1, 0.82)
  root.add(pitch)
  const { group: bowl, baseH, rOut } = buildBowl(spec)
  root.add(bowl)
  root.add(buildRoof(spec, baseH, rOut))
  root.rotation.x = 0.32 // slight tilt so the bowl reads as 3D on first frame
  return root
}

export default function StadiumModel({ spec, size = 200, className = '' }) {
  const mountRef = useRef(null)
  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !spec) return
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 2.15, 3.15)
    camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(size, size)
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const key = new THREE.DirectionalLight(0xffffff, 1.05)
    key.position.set(-2, 3, 2.5)
    scene.add(key)

    const stadium = buildStadium(spec)
    scene.add(stadium)

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf = 0, disposed = false
    const tick = () => {
      if (disposed) return
      raf = requestAnimationFrame(tick)
      if (!reduce) stadium.rotation.y += 0.004
      renderer.render(scene, camera)
    }
    tick()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()) })
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [spec, size])

  return <div className={`stadium-model ${className}`} ref={mountRef} aria-hidden="true" style={{ width: size, height: size }} />
}
