import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import worldLines from '../data/worldLines.json'
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
// Palette is the app's own (studio black ground, neutral land, blue flight arc) —
// intentionally a broadcast data-globe, not a photo-textured Earth.

const R = 1 // globe radius in world units
const COL = {
  ocean: 0x121417, // sphere fill, just above studio-black
  land: 0x3d4045, // coastlines — border-strong-ish neutral
  grat: 0x24262b, // graticule, very faint
  marker: 0xa8a8a8, // ink-secondary
  markerHot: 0xf6f6f6, // ink — active/endpoint
  arc: 0x439bf7, // american-blue — the prediction/flight channel
  plane: 0xf6f6f6,
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

// Faint graticule every 30° — reads as an analyst/broadcast globe.
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

// --- Atlas flag-fill (Part A) -------------------------------------------------
// A hovered country's real landmass fills with its flag. FLAG_LIFT floats the
// mesh just above the coastline lines (R*1.002) so it never z-fights them, and
// stays below the marker dots (R*1.01) so the point stays visible on top.
const FLAG_LIFT = R * 1.006
// Chords of a flat triangle sink toward the sphere centre; subdividing every
// edge below this angular length keeps the filled mesh hugging the sphere, so
// wide countries (Argentina, Australia) don't sink through the surface.
const MAX_EDGE_DEG = 2.5

// Build a flag-fill geometry for one country shape ({ bbox, polys }): triangulate
// each ring in lng/lat space, subdivide long edges, project to the sphere, and
// UV-map the flag across the country's bounding box so the pattern stretches to
// fill the true silhouette (Argentina's bands run north–south across the shape).
function buildFlagGeometry(shape) {
  const [minLng, minLat, maxLng, maxLat] = shape.bbox
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
    const [x, y, z] = llToXYZ(lat, lng, FLAG_LIFT)
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

// Rasterize a flag (SVG or raster URL) to a fixed-size CanvasTexture — reliable
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

function GlobeHero({
  mode = 'interactive',
  markers = [],
  flight = null,
  autoRotate = true,
  countryShapes = null,
  onFlightProgress,
  onFlightComplete,
  onCountryClick,
  onCountryHover,
  className = '',
  ariaLabel = 'Interactive globe',
}) {
  const mountRef = useRef(null)
  const eng = useRef(null)
  // Keep the latest callbacks reachable from the animation loop without re-init.
  const cbs = useRef({})
  cbs.current = { onFlightProgress, onFlightComplete, onCountryClick, onCountryHover }
  // Latest country boundary data, read live by the pointermove hit test.
  const shapesRef = useRef(null)
  shapesRef.current = countryShapes

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

    // Subtle form-giving light — a globe needs to read as a sphere. Kept low and
    // matte (roughness 1) so it's shape, not gloss or glow.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(-1.5, 1.2, 2)
    scene.add(key)

    const globe = new THREE.Group()
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshStandardMaterial({ color: COL.ocean, roughness: 1, metalness: 0 }),
    )
    globe.add(sphere)
    const land = buildLand()
    const grat = buildGraticule()
    globe.add(grat)
    globe.add(land)
    scene.add(globe)

    const markerGroup = new THREE.Group()
    globe.add(markerGroup)
    const arcGroup = new THREE.Group()
    globe.add(arcGroup)
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
      scene, camera, renderer, globe, sphere, markerGroup, arcGroup, flagGroup, controls, raycaster, pointer,
      markerMeshes: [], flight: null, raf: 0, disposed: false, lastHost: undefined, mode,
      // Atlas flag-fill state: caches + the currently shown country.
      flagGeo: new Map(), flagTex: new Map(), hoverName: null, hoverMesh: null, hoverPaused: false,
      testFreeze: false,
    }

    // --- Interaction: click a marker ---
    const onClick = (e) => {
      const E = eng.current
      if (!E || E.mode !== 'interactive') return
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
    const showFlag = (name) => {
      const E = eng.current
      if (!E || name === E.hoverName) return
      const shapes = shapesRef.current
      E.hoverName = name
      // Fade out + dispose whatever's currently shown.
      if (E.hoverMesh) {
        const prev = E.hoverMesh
        E.hoverMesh = null
        gsap.killTweensOf(prev.material)
        gsap.to(prev.material, {
          opacity: 0, duration: reduceMotion ? 0 : 0.22, ease: 'power2.out',
          onComplete: () => { E.flagGroup.remove(prev); prev.material.dispose() },
        })
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
    }

    const onPointerMove = (e) => {
      const E = eng.current
      if (!E || E.mode !== 'interactive' || !shapesRef.current) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
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
    // live hover/flag state — the hover path itself runs unmodified.
    if (import.meta.env.DEV) {
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
      controls.autoRotate = E.mode === 'interactive' ? autoRotate && !E.hoverPaused && !E.testFreeze : false
      controls.autoRotateSpeed = 0.35
      controls.update()

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
        }
      }
      renderer.render(scene, camera)
    }
    tick()

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
      cancelAnimationFrame(E.raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      E.flagGeo.forEach((g) => g.dispose())
      E.flagTex.forEach((t) => t.dispose())
      if (import.meta.env.DEV && window.__atlas) delete window.__atlas
      controls.dispose()
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose())
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
    for (const mk of markers) {
      const mat = new THREE.MeshBasicMaterial({ color: mk.hot ? COL.markerHot : COL.marker })
      const mesh = new THREE.Mesh(geo.clone(), mat)
      const [x, y, z] = llToXYZ(mk.lat, mk.lng, R * 1.01)
      mesh.position.set(x, y, z)
      mesh.userData.payload = mk
      E.markerGroup.add(mesh)
      E.markerMeshes.push(mesh)
    }
  }, [markers])

  // --- Start a flight when `flight.id` changes ---
  useEffect(() => {
    const E = eng.current
    if (!E || !flight || !flight.from || !flight.to) return
    // Clear any previous arc/plane.
    while (E.arcGroup.children.length) {
      const c = E.arcGroup.children.pop()
      c.geometry?.dispose()
      c.material?.dispose?.()
      E.arcGroup.remove(c)
    }
    const points = greatCircleArc(flight.from, flight.to, R, 128)
    const arcGeo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])))
    arcGeo.setDrawRange(0, 1)
    const arcLine = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: COL.arc, transparent: true, opacity: 0.95 }))
    E.arcGroup.add(arcLine)

    const plane = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, 0.052, 10),
      new THREE.MeshBasicMaterial({ color: COL.plane }),
    )
    plane.rotation.x = Math.PI / 2
    E.arcGroup.add(plane)

    E.lastHost = undefined
    E.flight = { points, arcLine, plane, t: 0, speed: 1 / (flight.durationFrames || 150), done: false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight?.id])

  return <div ref={mountRef} className={`globe-hero ${className}`} role="img" aria-label={ariaLabel} />
}

export default GlobeHero
