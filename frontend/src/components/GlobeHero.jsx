import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import worldLines from '../data/worldLines.json'
import hostSubdivisions from '../data/hostSubdivisions.json'
import { llToXYZ, xyzToLL, greatCircleArc, hostAtPoint } from '../lib/geo'
import { countryAt } from '../lib/countryHitTest'
import './GlobeHero.css'

// The 3D broadcast globe. One WebGL scene, built once on mount and driven by
// props thereafter (no React re-render touches Three.js). Two modes:
//   - 'flight'      : plays a great-circle arc from `flight.from` to `flight.to`
//                     once, flying a marker along it. Reports the marker's live
//                     lat/lng + host-country crossing via onFlightProgress, and
//                     fires onFlightComplete at the end.
//   - 'interactive' : free orbit/zoom; clicking a plotted marker calls
//                     onCountryClick with that marker's payload.
// Palette is the app's own (studio black ground, neutral land, blue flight arc) -
// intentionally a broadcast data-globe, not a photo-textured Earth.

const R = 1 // globe radius in world units
const COL = {
  ocean: 0x121417, // sphere fill, just above studio-black
  land: 0x3d4045, // coastlines - border-strong-ish neutral
  grat: 0x24262b, // graticule, very faint
  marker: 0xa8a8a8, // ink-secondary
  markerHot: 0xf6f6f6, // ink - active/endpoint
  arc: 0x439bf7, // american-blue - the prediction/flight channel
  plane: 0xf6f6f6,
}

// --- Paper globe (Matchup Sandbox only) --------------------------------------
// A deliberate, self-contained departure from the broadcast-black palette above,
// reusing the exact parchment hexes already established as the app's one
// sanctioned "paper" motif in the pregame Cutscene chart (Cutscene.css
// --cut-parchment/--cut-ink/--cut-line/--cut-route) so the two paper surfaces
// read as one consistent idea rather than two competing ones.
const PAPER = {
  parchment: 0xe7d7b4,
  parchmentDeep: 0xd6c093,
  ink: 0x3a2c17,
  line: 0x5c4424, // --cut-line's rgb, applied via low opacity below
  route: 0xa23b1e,
}

// Build one LineSegments geometry from all coastline rings, on the sphere.
function buildLand() {
  const positions = []
  for (const ring of worldLines) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = llToXYZ(ring[i][1], ring[i][0], R * 1.002)
      const b = llToXYZ(ring[i + 1][1], ring[i + 1][0], R * 1.002)
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2])
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: COL.land, transparent: true, opacity: 0.9 }))
}

// Faint graticule every 30° - reads as an analyst/broadcast globe.
function buildGraticule() {
  const positions = []
  const push = (lat1, lng1, lat2, lng2) => {
    const a = llToXYZ(lat1, lng1, R * 1.001)
    const b = llToXYZ(lat2, lng2, R * 1.001)
    positions.push(a[0], a[1], a[2], b[0], b[1], b[2])
  }
  for (let lat = -60; lat <= 60; lat += 30) for (let lng = -180; lng < 180; lng += 6) push(lat, lng, lat, lng + 6)
  for (let lng = -180; lng < 180; lng += 30) for (let lat = -90; lat < 90; lat += 6) push(lat, lng, lat + 6, lng)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: COL.grat, transparent: true, opacity: 0.5 }))
}

// Province/state borders for the three 2026 hosts only (paper globe) - built the
// same way as buildLand but from hostSubdivisions.json's admin-1 rings, sitting
// just under the coastline layer and reading finer + fainter so it stays clearly
// subordinate to the dominant, single-weight country outline.
function buildProvinceBorders() {
  const positions = []
  for (const host of Object.values(hostSubdivisions)) {
    for (const sub of host.subs) {
      for (const ring of sub.rings) {
        for (let i = 0; i < ring.length - 1; i++) {
          const a = llToXYZ(ring[i][1], ring[i][0], R * 1.0015)
          const b = llToXYZ(ring[i + 1][1], ring[i + 1][0], R * 1.0015)
          positions.push(a[0], a[1], a[2], b[0], b[1], b[2])
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: PAPER.line, transparent: true, opacity: 0.35 }))
}

// Hex int (0xrrggbb) → "r,g,b" for rgba() strings - keeps the canvas texture
// derived from the one PAPER palette instead of duplicating literal hexes.
const rgbOf = (hex) => `${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255}`

// Small tileable parchment texture: a warm cream base plus fine fiber/grain
// noise, drawn once to a canvas and repeat-wrapped across the sphere - cheap
// (no per-frame cost) and deliberately not photorealistic, per the brief.
function buildPaperTexture() {
  const size = 256
  const cvs = document.createElement('canvas')
  cvs.width = size; cvs.height = size
  const ctx = cvs.getContext('2d')
  ctx.fillStyle = `#${PAPER.parchment.toString(16).padStart(6, '0')}`
  ctx.fillRect(0, 0, size, size)
  // Soft mottled blotches - cheap seeded pseudo-random via a fixed LCG so the
  // texture is deterministic across reloads (no visible "shimmer" on refresh).
  const deepRgb = rgbOf(PAPER.parchmentDeep)
  let seed = 1337
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  for (let i = 0; i < 90; i++) {
    const x = rand() * size, y = rand() * size, r = 8 + rand() * 26
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const deep = rand() > 0.5
    g.addColorStop(0, deep ? `rgba(${deepRgb},0.35)` : 'rgba(255,250,235,0.3)')
    g.addColorStop(1, `rgba(${rgbOf(PAPER.parchment)},0)`)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  // Fine grain - individual low-alpha ink specks, the "fiber" of the sheet.
  const inkRgb = rgbOf(PAPER.ink)
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(${inkRgb},${(0.03 + rand() * 0.05).toFixed(3)})`
    ctx.fillRect(rand() * size, rand() * size, 1, 1)
  }
  const tex = new THREE.CanvasTexture(cvs)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(6, 3)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// --- Crumple/unfold (paper globe only) ---------------------------------------
// A small hand-rolled deterministic pseudo-noise (a few summed sines - no
// library, no per-call allocation) evaluated purely from a point's own base
// position. Applying the same function to every layer's own base coordinates
// is what makes the ocean, coastlines, province borders, and markers crumple
// together "as one sheet" without sharing vertex indices across geometry types.
function crumpleNoise(x, y, z) {
  return (
    Math.sin(x * 6.1 + y * 3.7 + 1.3) * 0.5 +
    Math.sin(y * 5.3 - z * 4.9 + 2.7) * 0.3 +
    Math.sin(z * 7.7 + x * 2.1 - 0.6) * 0.2
  )
}

// t: 0 = flat sphere, 1 = fully crumpled. Radially crushes each point toward a
// smaller, irregular ball and adds noise-driven bump + a slight tangential
// swirl for a wrinkled (not merely lumpy) read. Pure function of (x,y,z,t).
const crumpleOut = [0, 0, 0]
function crumpleVertex(x, y, z, t) {
  if (t <= 0) { crumpleOut[0] = x; crumpleOut[1] = y; crumpleOut[2] = z; return crumpleOut }
  const len = Math.hypot(x, y, z) || 1
  const nx = x / len, ny = y / len, nz = z / len
  const n1 = crumpleNoise(nx * 2.2, ny * 2.2, nz * 2.2)
  const n2 = crumpleNoise(nx * 5.1 + 9, ny * 5.1 + 9, nz * 5.1 + 9)
  const crush = 1 - t * 0.62
  const bump = 1 + t * 0.22 * n1 + t * 0.1 * n2
  const scale = crush * bump
  const swirl = t * 0.18 * n2 * len
  crumpleOut[0] = x * scale + ny * swirl
  crumpleOut[1] = y * scale + nz * swirl
  crumpleOut[2] = z * scale + nx * swirl
  return crumpleOut
}

// --- Atlas flag-fill (Part A) -------------------------------------------------
// A hovered country's real landmass fills with its flag. FLAG_LIFT floats the
// mesh just above the coastline lines (R*1.002) so it never z-fights them, and
// stays below the marker dots (R*1.01) so the point stays visible on top.
const FLAG_LIFT = R * 1.006
// Hovered country pops radially off the surface (G2) - the globe's answer to a
// card hover-lift. Scaling the flag mesh about the globe centre lifts it outward
// and grows the silhouette ~4%; subtle, not dramatic.
const HOVER_LIFT_SCALE = 1.04
// The three 2026 hosts rise higher and more slowly on hover - a monumental,
// weighted lift versus the quick page-turn pop the other 45 nations get.
const HOST_LIFT_SCALE = 1.09
// Chords of a flat triangle sink toward the sphere centre; subdividing every
// edge below this angular length keeps the filled mesh hugging the sphere, so
// wide countries (Argentina, Australia) don't sink through the surface.
const MAX_EDGE_DEG = 2.5

// UV basis for the flag = the bounding box of the country's *largest* landmass,
// not shape.bbox (which spans every polygon). A distant overseas territory blows
// the full bbox out so far that the mainland maps into a single flag stripe:
// France's metropolitan shape fell entirely inside the tricolour's right band and
// filled solid red (its bbox reached French Guiana at lng −54.5); the USA's did
// the same via Alaska. Mapping across the dominant polygon restores the true fill.
// Single-landmass nations are unaffected - their main bbox equals shape.bbox.
function mainBBox(shape) {
  let best = null
  let bestArea = -1
  for (const poly of shape.polys) {
    let a = 0
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1])
    }
    a = Math.abs(a / 2)
    if (a <= bestArea) continue
    let mnx = 180, mny = 90, mxx = -180, mxy = -90
    for (const [x, y] of poly) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y }
    best = [mnx, mny, mxx, mxy]
    bestArea = a
  }
  return best || shape.bbox
}

// Build a flag-fill geometry for one country shape ({ bbox, polys }): triangulate
// each ring in lng/lat space, subdivide long edges, project to the sphere, and
// UV-map the flag across the main-landmass bounding box so the pattern stretches
// to fill the true silhouette (Argentina's bands run north-south across the shape).
function buildFlagGeometry(shape, lift = FLAG_LIFT) {
  const [minLng, minLat, maxLng, maxLat] = mainBBox(shape)
  const w = maxLng - minLng || 1
  const h = maxLat - minLat || 1
  const verts = [] // [lng,lat]
  let tris = [] // [i,i,i]
  for (const poly of shape.polys) {
    const base = verts.length
    const contour = poly.map((p) => new THREE.Vector2(p[0], p[1]))
    for (const p of poly) verts.push([p[0], p[1]])
    for (const f of THREE.ShapeUtils.triangulateShape(contour, [])) {
      tris.push([base + f[0], base + f[1], base + f[2]])
    }
  }
  // Midpoint subdivision, welded per undirected edge so shared edges don't crack.
  const midCache = new Map()
  const midpoint = (a, b) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`
    let m = midCache.get(key)
    if (m === undefined) {
      m = verts.length
      verts.push([(verts[a][0] + verts[b][0]) / 2, (verts[a][1] + verts[b][1]) / 2])
      midCache.set(key, m)
    }
    return m
  }
  const edgeDeg = (a, b) => Math.hypot(verts[a][0] - verts[b][0], verts[a][1] - verts[b][1])
  for (let pass = 0; pass < 6; pass++) {
    let changed = false
    const next = []
    for (const [a, b, c] of tris) {
      if (Math.max(edgeDeg(a, b), edgeDeg(b, c), edgeDeg(c, a)) > MAX_EDGE_DEG) {
        const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a)
        next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca])
        changed = true
      } else next.push([a, b, c])
    }
    tris = next
    if (!changed) break
  }
  const positions = new Float32Array(verts.length * 3)
  const uvs = new Float32Array(verts.length * 2)
  for (let i = 0; i < verts.length; i++) {
    const [lng, lat] = verts[i]
    const [x, y, z] = llToXYZ(lat, lng, lift)
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z
    uvs[i * 2] = (lng - minLng) / w
    uvs[i * 2 + 1] = (lat - minLat) / h
  }
  const index = new Uint32Array(tris.length * 3)
  for (let i = 0; i < tris.length; i++) { index[i * 3] = tris[i][0]; index[i * 3 + 1] = tris[i][1]; index[i * 3 + 2] = tris[i][2] }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(new THREE.BufferAttribute(index, 1))
  return geo
}

// Rasterize a flag (SVG or raster URL) to a fixed-size CanvasTexture - reliable
// across browsers that won't texture an unsized <img> SVG directly.
function loadFlagTexture(url, onReady) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const cvs = document.createElement('canvas')
    cvs.width = 512; cvs.height = 384
    cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height)
    const tex = new THREE.CanvasTexture(cvs)
    tex.colorSpace = THREE.SRGBColorSpace
    onReady(tex)
  }
  img.onerror = () => onReady(null)
  img.src = url
}

// A small broadcast-white airliner built from primitives (B1) - fuselage, swept
// wings, tail fin + tailplane, nose cone. Nose points along +Z: Object3D.lookAt
// aims a non-camera object's +Z at its target (verified against three@0.185), so
// after the flight loop's lookAt(nextPoint) the nose leads the direction of
// travel. Tail assembly sits at -Z.
export function buildPlane() {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: COL.plane, roughness: 0.5, metalness: 0.1 })
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.06, 12), mat)
  fuselage.rotation.x = Math.PI / 2 // cylinder Y-axis → Z (fore/aft)
  g.add(fuselage)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02, 12), mat)
  nose.rotation.x = Math.PI / 2 // cone apex → +Z (forward)
  nose.position.z = 0.04
  g.add(nose)
  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.004, 0.018), mat)
  wings.position.z = -0.002
  g.add(wings)
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.003, 0.011), mat)
  tailplane.position.z = -0.027
  g.add(tailplane)
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.016, 0.014), mat)
  fin.position.set(0, 0.008, -0.027)
  g.add(fin)
  return g
}

// --- Atlas camera choreography (Part 1) --------------------------------------
// flyTo swings the camera so a given lat/lng faces the viewer, at `zoom` world
// units from the globe centre. It resolves the country's CURRENT world position
// (globe.localToWorld, so the live auto-rotation is accounted for) then eases the
// camera along a power3 curve, holding the look at the origin each frame so
// OrbitControls stays consistent and the user can still drag afterward. Callers
// freeze auto-rotate for the duration (E.flyFreeze) so the target doesn't drift
// out from under the camera. No glow, no dolly tricks - a weighted broadcast push.
function flyTo(E, lat, lng, zoom = 1.9, duration = 1.4) {
  const [lx, ly, lz] = llToXYZ(lat, lng, 1)
  const world = E.globe.localToWorld(new THREE.Vector3(lx, ly, lz)).normalize().multiplyScalar(zoom)
  gsap.killTweensOf(E.camera.position)
  gsap.to(E.camera.position, {
    x: world.x, y: world.y, z: world.z,
    duration, ease: 'power3.inOut',
    onUpdate: () => { E.camera.lookAt(0, 0, 0); E.controls.update() },
  })
}

// Settle back to the default framing when a nation is deselected.
function flyHome(E, duration = 1.15) {
  gsap.killTweensOf(E.camera.position)
  gsap.to(E.camera.position, {
    x: 0, y: 0.6, z: 3.2,
    duration, ease: 'power3.inOut',
    onUpdate: () => { E.camera.lookAt(0, 0, 0); E.controls.update() },
  })
}

function GlobeHero({
  mode = 'interactive',
  markers = [],
  flight = null,
  autoRotate = true,
  countryShapes = null,
  hostTints = null,
  focus = null,
  paper = false,
  crumpleTrigger = null,
  onFlightProgress,
  onFlightComplete,
  onCountryClick,
  onCountryHover,
  onCrumpleLock,
  className = '',
  ariaLabel = 'Interactive globe',
}) {
  const mountRef = useRef(null)
  const eng = useRef(null)
  // Keep the latest callbacks reachable from the animation loop without re-init.
  const cbs = useRef({})
  cbs.current = { onFlightProgress, onFlightComplete, onCountryClick, onCountryHover, onCrumpleLock }
  // Latest country boundary data, read live by the pointermove hit test.
  const shapesRef = useRef(null)
  shapesRef.current = countryShapes
  // The three host nation names (keys of hostTints), read live so the hover
  // path can give hosts the heavier "monumental rise" treatment (Part 1b).
  const hostNamesRef = useRef(null)
  hostNamesRef.current = hostTints ? Object.keys(hostTints) : null

  // --- One-time scene setup ---
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const width = mount.clientWidth || 640
    const height = mount.clientHeight || 480

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 0.6, 3.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    // Subtle form-giving light - a globe needs to read as a sphere. Kept low and
    // matte (roughness 1) so it's shape, not gloss or glow.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(-1.5, 1.2, 2)
    scene.add(key)

    const globe = new THREE.Group()
    const sphereGeo = new THREE.SphereGeometry(R, paper ? 48 : 64, paper ? 48 : 64)
    const sphere = new THREE.Mesh(
      sphereGeo,
      paper
        ? new THREE.MeshStandardMaterial({ map: buildPaperTexture(), roughness: 0.95, metalness: 0 })
        : new THREE.MeshStandardMaterial({ color: COL.ocean, roughness: 1, metalness: 0 }),
    )
    globe.add(sphere)
    const land = buildLand()
    if (paper) land.material.color.setHex(PAPER.ink)
    globe.add(land)
    let provinceBorders = null
    if (paper) {
      provinceBorders = buildProvinceBorders()
      globe.add(provinceBorders)
    } else {
      globe.add(buildGraticule())
    }
    scene.add(globe)

    // Crumple base-position cache (paper globe only) - captured once, right
    // after each layer is built, so the crumple tween always displaces from the
    // true rest shape regardless of how many times it's played.
    const crumpleBase = paper
      ? {
          sphere: sphereGeo.attributes.position.array.slice(),
          land: land.geometry.attributes.position.array.slice(),
          borders: provinceBorders.geometry.attributes.position.array.slice(),
        }
      : null

    const markerGroup = new THREE.Group()
    globe.add(markerGroup)
    const arcGroup = new THREE.Group()
    globe.add(arcGroup)
    // Persistent host-nation tint layer (B3) - the three 2026 hosts always
    // wear their national colour; sits just under the hover flag layer.
    const hostGroup = new THREE.Group()
    globe.add(hostGroup)
    // Flag-fill layer (Atlas hover). One country shows at a time; geometry and
    // textures are cached per country so re-hovering is instant.
    const flagGroup = new THREE.Group()
    globe.add(flagGroup)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.5
    controls.minDistance = 1.5
    controls.maxDistance = 6
    controls.enablePan = false

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    eng.current = {
      scene, camera, renderer, globe, sphere, land, provinceBorders, markerGroup, arcGroup, hostGroup, flagGroup, controls, raycaster, pointer,
      markerMeshes: [], flight: null, raf: 0, disposed: false, running: false, inView: true, lastHost: undefined, mode,
      // Atlas flag-fill state: caches + the currently shown country.
      flagGeo: new Map(), flagTex: new Map(), hoverName: null, hoverMesh: null, hoverPaused: false,
      testFreeze: false,
      // Part 1: camera focus + host-rise state.
      flyFreeze: false, hostMeshByName: new Map(), raisedHost: null,
      // Paper globe crumple state.
      paper, crumpleBase, crumpleTween: null,
    }

    // --- Paper globe crumple/unfold ------------------------------------------
    // One symmetric GSAP tween 0→1→0 (yoyo) drives crumpleVertex across the
    // sphere, land, province-border, and marker layers every frame of the
    // ~quarter-second window - each layer reads its own cached base positions,
    // so everything crumples "as one sheet" without any shared indexing.
    const runCrumple = (duration, onLock) => {
      const E = eng.current
      if (!E || !E.paper || !E.crumpleBase) return
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (reduce) { onLock?.(); return }
      gsap.killTweensOf(E.crumpleTween || {})
      const state = { t: 0 }
      const { sphere: sBase, land: lBase, borders: bBase } = E.crumpleBase
      const sPos = E.sphere.geometry.attributes.position.array
      const lPos = E.land.geometry.attributes.position.array
      const bPos = E.provinceBorders.geometry.attributes.position.array
      const apply = () => {
        const t = state.t
        for (let i = 0; i < sBase.length; i += 3) {
          const p = crumpleVertex(sBase[i], sBase[i + 1], sBase[i + 2], t)
          sPos[i] = p[0]; sPos[i + 1] = p[1]; sPos[i + 2] = p[2]
        }
        for (let i = 0; i < lBase.length; i += 3) {
          const p = crumpleVertex(lBase[i], lBase[i + 1], lBase[i + 2], t)
          lPos[i] = p[0]; lPos[i + 1] = p[1]; lPos[i + 2] = p[2]
        }
        for (let i = 0; i < bBase.length; i += 3) {
          const p = crumpleVertex(bBase[i], bBase[i + 1], bBase[i + 2], t)
          bPos[i] = p[0]; bPos[i + 1] = p[1]; bPos[i + 2] = p[2]
        }
        E.sphere.geometry.attributes.position.needsUpdate = true
        E.land.geometry.attributes.position.needsUpdate = true
        E.provinceBorders.geometry.attributes.position.needsUpdate = true
        for (const m of E.markerMeshes) {
          const base = m.userData.basePos
          if (!base) continue
          const p = crumpleVertex(base[0], base[1], base[2], t)
          m.position.set(p[0], p[1], p[2])
        }
      }
      E.crumpleTween = gsap.to(state, {
        t: 1,
        duration: duration / 2,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: 1,
        onUpdate: apply,
        onRepeat: () => onLock?.(),
        onComplete: () => {
          E.sphere.geometry.attributes.position.needsUpdate = true
          E.sphere.geometry.computeVertexNormals()
        },
      })
    }

    // --- Interaction: click a marker ---
    const onClick = (e) => {
      const E = eng.current
      // Marker clicks fire in both modes - the Atlas opens a country, the
      // Matchup globe selects a venue (B2). Callers gate by app state as needed.
      if (!E) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(E.markerMeshes, false)[0]
      if (hit && cbs.current.onCountryClick) cbs.current.onCountryClick(hit.object.userData.payload)
    }
    renderer.domElement.addEventListener('click', onClick)

    // --- Atlas flag-fill on hover -------------------------------------------
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const localPt = new THREE.Vector3()

    // Swap the shown flag to `name` (or none). Fades the outgoing mesh out and
    // the incoming one in over 0.3s power2.out; no-ops when already showing it,
    // so sweeping within one country never re-triggers or flickers.
    // Restore a raised host tint mesh back to its resting opacity (0.5). Called
    // whenever the hover leaves a host, so the national colour settles with weight.
    const settleHostTint = () => {
      const E = eng.current
      if (!E || !E.raisedHost) return
      const m = E.hostMeshByName.get(E.raisedHost)
      E.raisedHost = null
      if (!m) return
      gsap.killTweensOf(m.material)
      gsap.to(m.material, { opacity: 0.5, duration: reduceMotion ? 0 : 0.55, ease: 'power2.inOut' })
    }

    const showFlag = (name) => {
      const E = eng.current
      if (!E || name === E.hoverName) return
      const shapes = shapesRef.current
      E.hoverName = name
      const isHost = !!(name && hostNamesRef.current && hostNamesRef.current.includes(name))
      // Any host tint raised by a previous hover settles back down first.
      settleHostTint()
      // Fade out + dispose whatever's currently shown.
      if (E.hoverMesh) {
        const prev = E.hoverMesh
        E.hoverMesh = null
        gsap.killTweensOf(prev.material)
        gsap.killTweensOf(prev.scale)
        gsap.to(prev.material, {
          opacity: 0, duration: reduceMotion ? 0 : 0.22, ease: 'power2.out',
          onComplete: () => { E.flagGroup.remove(prev); prev.material.dispose() },
        })
        // Settle the extrusion back to the surface as it fades.
        if (!reduceMotion) gsap.to(prev.scale, { x: 1, y: 1, z: 1, duration: 0.22, ease: 'power2.out' })
      }
      if (!name || !shapes || !shapes[name]) return
      // Geometry cache (built once per country).
      let geo = E.flagGeo.get(name)
      if (!geo) { geo = buildFlagGeometry(shapes[name]); E.flagGeo.set(name, geo) }
      const mat = new THREE.MeshBasicMaterial({
        transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
      })
      const mesh = new THREE.Mesh(geo, mat)
      E.flagGroup.add(mesh)
      E.hoverMesh = mesh
      const apply = (tex) => { if (tex && E.hoverMesh === mesh) { mat.map = tex; mat.needsUpdate = true } }
      const cached = E.flagTex.get(name)
      if (cached) apply(cached)
      else if (shapes[name].flag) loadFlagTexture(shapes[name].flag, (tex) => { if (tex) { E.flagTex.set(name, tex); apply(tex) } })
      gsap.to(mat, { opacity: 1, duration: reduceMotion ? 0 : 0.3, ease: 'power2.out' })
      // Part 1b - the rise. Hosts rise higher and slower (monumental, weighted);
      // the 45 others get the quick page-turn pop. No emissive glow (DESIGN.md):
      // the host's national colour instead *builds* via its persistent tint layer,
      // whose opacity swells 0.5 → 0.9 as the silhouette lifts.
      const lift = isHost ? HOST_LIFT_SCALE : HOVER_LIFT_SCALE
      if (reduceMotion) {
        mesh.scale.setScalar(lift)
      } else if (isHost) {
        gsap.to(mesh.scale, { x: lift, y: lift, z: lift, duration: 0.65, ease: 'power3.out' })
      } else {
        gsap.to(mesh.scale, { x: lift, y: lift, z: lift, duration: 0.2, ease: 'back.out(1.7)' })
      }
      if (isHost) {
        const tintMesh = E.hostMeshByName.get(name)
        if (tintMesh) {
          E.raisedHost = name
          gsap.killTweensOf(tintMesh.material)
          gsap.to(tintMesh.material, { opacity: 0.9, duration: reduceMotion ? 0 : 0.65, ease: 'power3.out' })
        }
      }
    }

    // Perf (P8): pointermove can fire ~120×/s, but the sphere raycast + point-in-
    // polygon hit test only needs to resolve once per rendered frame. Coalesce to
    // one rAF - latest cursor position wins - so fast hovers don't queue redundant
    // hit tests. No perceptible latency (still resolves every frame).
    let pendingPointer = null
    let pointerScheduled = false
    const processPointer = () => {
      pointerScheduled = false
      const E = eng.current
      if (!E || E.disposed || E.mode !== 'interactive' || !shapesRef.current || !pendingPointer) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((pendingPointer.x - rect.left) / rect.width) * 2 - 1
      pointer.y = -((pendingPointer.y - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObject(E.sphere, false)[0]
      if (!hit) { E.hoverPaused = false; showFlag(null); if (cbs.current.onCountryHover) cbs.current.onCountryHover(null); return }
      // World hit → globe-local (the globe spins) → lat/lng → owning country.
      localPt.copy(hit.point); E.globe.worldToLocal(localPt)
      const [lat, lng] = xyzToLL([localPt.x, localPt.y, localPt.z])
      const name = countryAt(lat, lng, shapesRef.current)
      // Pause the idle auto-rotate while a country is held, so the flagged
      // silhouette doesn't drift out from under the cursor.
      E.hoverPaused = !!name
      if (name !== E.hoverName) {
        showFlag(name)
        if (cbs.current.onCountryHover) cbs.current.onCountryHover(name)
      }
    }
    const onPointerMove = (e) => {
      pendingPointer = { x: e.clientX, y: e.clientY }
      if (!pointerScheduled) { pointerScheduled = true; requestAnimationFrame(processPointer) }
    }
    const onPointerLeave = () => {
      const E = eng.current
      if (!E) return
      E.hoverPaused = false
      showFlag(null)
      if (cbs.current.onCountryHover) cbs.current.onCountryHover(null)
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)

    // --- DEV-only test seam (stripped from production builds) -----------------
    // The globe is one WebGL canvas with an orbiting camera, so Playwright can't
    // aim at a country by DOM ref. These helpers let a test face a known point,
    // project a lat/lng to screen px (to drive a real mouse), and read back the
    // live hover/flag state - the hover path itself runs unmodified.
    if (import.meta.env.DEV) {
      window.__eng = () => eng.current
      window.__atlas = {
        face: (lat, lng) => {
          const E = eng.current; if (!E) return
          E.testFreeze = true
          const dist = E.camera.position.length()
          const [x, y, z] = llToXYZ(lat, lng, 1)
          E.camera.position.set(x * dist, y * dist, z * dist)
          E.camera.lookAt(0, 0, 0)
          E.controls.update()
        },
        project: (lat, lng) => {
          const E = eng.current; if (!E) return null
          const world = E.globe.localToWorld(new THREE.Vector3(...llToXYZ(lat, lng, R * 1.01)))
          const center = E.globe.getWorldPosition(new THREE.Vector3())
          const front = world.clone().sub(center).normalize().dot(E.camera.position.clone().sub(world).normalize()) > 0.12
          if (!front) return null
          const ndc = world.clone().project(E.camera)
          const rect = E.renderer.domElement.getBoundingClientRect()
          return { x: rect.left + (ndc.x * 0.5 + 0.5) * rect.width, y: rect.top + (-ndc.y * 0.5 + 0.5) * rect.height }
        },
        state: () => {
          const E = eng.current; const m = E?.hoverMesh
          return { name: E?.hoverName ?? null, opacity: m ? m.material.opacity : 0, hasTexture: !!(m && m.material.map) }
        },
      }
    }

    // --- Render loop ---
    const tmp = new THREE.Vector3()
    const tick = () => {
      const E = eng.current
      if (!E || E.disposed) return
      E.raf = requestAnimationFrame(tick)
      controls.autoRotate = E.mode === 'interactive' ? autoRotate && !E.hoverPaused && !E.testFreeze && !E.flyFreeze : false
      controls.autoRotateSpeed = 0.35
      controls.update()

      // Staggered venue-dot pulse (Part 5g) - a soft breathing scale, 1 → ~1.22.
      if (!reduceMotion && E.markerMeshes.length) {
        const pt = performance.now() * 0.0028
        for (const m of E.markerMeshes) {
          if (m.userData.pulse) m.scale.setScalar(1 + 0.22 * (0.5 + 0.5 * Math.sin(pt + m.userData.phase)))
        }
      }

      const fl = E.flight
      if (fl) {
        fl.t = Math.min(1, fl.t + fl.speed)
        const idx = Math.min(fl.points.length - 1, Math.floor(fl.t * (fl.points.length - 1)))
        const p = fl.points[idx]
        fl.plane.position.set(p[0], p[1], p[2])
        // Orient the plane along its heading.
        const nxt = fl.points[Math.min(fl.points.length - 1, idx + 1)]
        tmp.set(nxt[0] - p[0], nxt[1] - p[1], nxt[2] - p[2])
        if (tmp.lengthSq() > 1e-9) fl.plane.lookAt(tmp.add(fl.plane.position))
        // Grow the trailing arc up to the plane.
        fl.arcLine.geometry.setDrawRange(0, idx + 1)
        // Report progress + host crossing.
        const [lat, lng] = xyzToLL([p[0], p[1], p[2]])
        const host = hostAtPoint([lat, lng])
        if (cbs.current.onFlightProgress) cbs.current.onFlightProgress({ lat, lng, host, t: fl.t })
        if (host !== E.lastHost) {
          E.lastHost = host
        }
        if (fl.t >= 1 && !fl.done) {
          fl.done = true
          if (cbs.current.onFlightComplete) cbs.current.onFlightComplete()
          // Flight finished: if the globe is off-screen, drop back to the idle
          // pause the viewport observer would otherwise have applied already.
          if (!E.inView) stop()
        }
      }
      renderer.render(scene, camera)
    }
    // `running` guards against double-scheduling when the viewport observer
    // re-enters; tick() itself keeps the frame chain alive via E.raf.
    const start = () => {
      const E = eng.current
      if (!E || E.disposed || E.running) return
      E.running = true
      tick()
    }
    const stop = () => {
      const E = eng.current
      if (!E || !E.running) return
      E.running = false
      cancelAnimationFrame(E.raf)
    }
    // Exposed so the flight effect can resume the loop if a flight starts while
    // the globe is paused off-screen (a flight advances inside tick()).
    eng.current.start = start
    eng.current.runCrumple = runCrumple
    start()

    // Paper globe: crumple up and unfold once on load. Deferred to the next
    // animation frame so it runs after the markers effect below has populated
    // markerGroup (both effects fire synchronously on mount, in declaration
    // order, but the rAF guarantees the marker rebuild has already landed).
    if (paper) requestAnimationFrame(() => runCrumple(0.46))

    // Pause the render loop while the globe is scrolled out of view. A raw rAF
    // loop keeps firing full-speed off-screen otherwise - the browser only
    // throttles it when the whole tab is hidden, not when the canvas is simply
    // below the fold. This mirrors FloatingShapes' IntersectionObserver gate and
    // is the biggest mobile win: the Atlas/Simulator globes stop burning GPU the
    // moment they leave the viewport.
    const io = new IntersectionObserver(
      ([entry]) => {
        const E = eng.current
        if (!E) return
        E.inView = entry.isIntersecting
        // Keep rendering through an active flight even off-screen, so its arc,
        // pin drop, and onFlightComplete still land; otherwise pause when idle.
        if (entry.isIntersecting) start()
        else if (!E.flight) stop()
      },
      { threshold: 0 },
    )
    io.observe(mount)

    // --- Resize ---
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth || width
      const h = mount.clientHeight || height
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(mount)

    return () => {
      const E = eng.current
      E.disposed = true
      E.running = false
      cancelAnimationFrame(E.raf)
      io.disconnect()
      ro.disconnect()
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      E.flagGeo.forEach((g) => g.dispose())
      E.flagTex.forEach((t) => t.dispose())
      if (import.meta.env.DEV && window.__atlas) delete window.__atlas
      E.crumpleTween?.kill()
      controls.dispose()
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose(); m.dispose() })
      })
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep mode/autoRotate live without re-init.
  useEffect(() => {
    if (eng.current) eng.current.mode = mode
  }, [mode])

  // --- Rebuild markers when they change ---
  useEffect(() => {
    const E = eng.current
    if (!E) return
    for (const m of E.markerMeshes) {
      E.markerGroup.remove(m)
      m.geometry.dispose()
      m.material.dispose()
    }
    E.markerMeshes = []
    const geo = new THREE.SphereGeometry(0.016, 12, 12)
    let venueN = 0
    for (const mk of markers) {
      const hotColor = E.paper ? PAPER.route : COL.markerHot
      const restColor = E.paper ? PAPER.ink : COL.marker
      const mat = new THREE.MeshBasicMaterial({ color: mk.hot ? hotColor : restColor })
      const mesh = new THREE.Mesh(geo.clone(), mat)
      const [x, y, z] = llToXYZ(mk.lat, mk.lng, R * 1.01)
      mesh.position.set(x, y, z)
      mesh.userData.payload = mk
      mesh.userData.basePos = [x, y, z]
      // Part 5g - venue dots breathe with a gentle, staggered pulse (each offset
      // by a phase so they never pulse in unison). Country markers stay steady.
      if (mk.kind === 'venue') { mesh.userData.pulse = true; mesh.userData.phase = venueN++ * 0.7 }
      E.markerGroup.add(mesh)
      E.markerMeshes.push(mesh)
    }
  }, [markers])

  // --- Persistent host-nation tint (B3) ---
  useEffect(() => {
    const E = eng.current
    if (!E) return
    while (E.hostGroup.children.length) {
      const c = E.hostGroup.children.pop()
      c.geometry?.dispose()
      c.material?.dispose?.()
    }
    E.hostMeshByName = new Map()
    E.raisedHost = null
    if (!hostTints || !countryShapes) return
    for (const [name, color] of Object.entries(hostTints)) {
      const shape = countryShapes[name]
      if (!shape) continue
      // Slightly under the hover flag layer so hovering a host still shows its flag.
      const geo = buildFlagGeometry(shape, R * 1.0045)
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
      const mesh = new THREE.Mesh(geo, mat)
      E.hostGroup.add(mesh)
      // Keyed so the hover path can swell this host's national colour on rise.
      E.hostMeshByName.set(name, mesh)
    }
  }, [hostTints, countryShapes])

  // --- Part 1: fly the camera to a selected host (or home when cleared) ---
  // `focus` is { lat, lng, zoom } while a host nation is open, else null. Freezing
  // auto-rotate holds the target still under the camera for the whole push.
  useEffect(() => {
    const E = eng.current
    if (!E) return
    if (focus) {
      E.flyFreeze = true
      flyTo(E, focus.lat, focus.lng, focus.zoom ?? 1.9)
    } else {
      E.flyFreeze = false
      flyHome(E)
    }
  }, [focus])

  // --- Start a flight when `flight.id` changes ---
  useEffect(() => {
    const E = eng.current
    if (!E || !flight || !flight.from || !flight.to) return
    // Clear any previous arc/plane.
    while (E.arcGroup.children.length) {
      const c = E.arcGroup.children.pop()
      c.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.() })
      E.arcGroup.remove(c)
    }
    const points = greatCircleArc(flight.from, flight.to, R, 128)
    const arcGeo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])))
    arcGeo.setDrawRange(0, 1)
    const arcLine = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: COL.arc, transparent: true, opacity: 0.95 }))
    E.arcGroup.add(arcLine)

    const plane = buildPlane()
    E.arcGroup.add(plane)

    E.lastHost = undefined
    E.flight = { points, arcLine, plane, t: 0, speed: 1 / (flight.durationFrames || 150), done: false }
    // If the globe was paused off-screen, resume so the flight actually advances.
    E.start?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight?.id])

  // --- Paper globe: fast crumple-unfold on venue selection --------------------
  // `crumpleTrigger` bumps (same pattern as flight.id) whenever the caller wants
  // a transition beat. onCrumpleLock fires at the crumple's fully-scrunched
  // peak, before the unfold - callers use it to swap the destination/marker
  // state while the sheet is balled up, so the change "locks in" hidden rather
  // than snapping visibly on a flat, open globe.
  useEffect(() => {
    const E = eng.current
    if (!E || !crumpleTrigger || !E.paper) return
    E.runCrumple?.(0.28, () => cbs.current.onCrumpleLock?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crumpleTrigger])

  return <div ref={mountRef} className={`globe-hero ${className}`} role="img" aria-label={ariaLabel} />
}

export default GlobeHero
