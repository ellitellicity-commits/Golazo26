import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import worldLines from '../data/worldLines.json'
import { llToXYZ, xyzToLL, greatCircleArc, hostAtPoint } from '../lib/geo'
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

function GlobeHero({
  mode = 'interactive',
  markers = [],
  flight = null,
  autoRotate = true,
  onFlightProgress,
  onFlightComplete,
  onCountryClick,
  className = '',
  ariaLabel = 'Interactive globe',
}) {
  const mountRef = useRef(null)
  const eng = useRef(null)
  // Keep the latest callbacks reachable from the animation loop without re-init.
  const cbs = useRef({})
  cbs.current = { onFlightProgress, onFlightComplete, onCountryClick }

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
      scene, camera, renderer, globe, markerGroup, arcGroup, controls, raycaster, pointer,
      markerMeshes: [], flight: null, raf: 0, disposed: false, lastHost: undefined, mode,
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

    // --- Render loop ---
    const tmp = new THREE.Vector3()
    const tick = () => {
      const E = eng.current
      if (!E || E.disposed) return
      E.raf = requestAnimationFrame(tick)
      controls.autoRotate = E.mode === 'interactive' ? autoRotate : false
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
