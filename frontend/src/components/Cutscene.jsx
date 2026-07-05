import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { buildPlane } from './GlobeHero'
import { buildStadium } from './StadiumModel'
import './Cutscene.css'

// Pregame broadcast cutscene (B4) — an EA-Sports-FC-style intro, not a travel
// montage. One gsap.timeline() runs five sequenced beats so they never race:
//   1 VS card clash → 2 plane arrival → 3 stadium flyover → 4 hype text →
//   5 whistle countdown → hard cut, then onComplete() reveals the result.
// The plane (buildPlane, B1) and stadium model (buildStadium, B2) are reused as
// the beat-2 and beat-3 subjects. data-beat on the root exposes the active beat
// for tests. Skippable; degrades to an instant reveal under reduced motion.

export default function Cutscene({ match, onComplete }) {
  const { home, away, homeFlag, awayFlag, homeCode, awayCode, venue, hype } = match
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const tlRef = useRef(null)
  const doneRef = useRef(false)
  const [beat, setBeat] = useState('vs')

  const finish = () => { if (!doneRef.current) { doneRef.current = true; onComplete?.() } }

  useEffect(() => {
    const root = rootRef.current
    const mount = canvasRef.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const q = gsap.utils.selector(root)

    // --- Three.js scene: plane (beat 2) + stadium (beat 3) ---
    const W = mount.clientWidth || window.innerWidth
    const H = mount.clientHeight || window.innerHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    mount.appendChild(renderer.domElement)
    scene.add(new THREE.AmbientLight(0xffffff, 0.72))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15)
    keyLight.position.set(-2, 3, 2.5)
    scene.add(keyLight)

    const plane = buildPlane()
    plane.scale.setScalar(7)
    plane.rotation.y = Math.PI * 0.5 // nose to the right, flying across
    scene.add(plane)
    const planeMat = plane.children[0].material
    planeMat.transparent = true
    planeMat.opacity = 0

    const stadium = buildStadium(venue.spec)
    stadium.visible = false
    scene.add(stadium)

    // Tweened view state applied every frame.
    const view = { planeX: -3.4, planeOpacity: 0, stadScale: 0, camAngle: -0.5, camHeight: 2.6, camDist: 3.9 }
    let raf = 0, disposed = false
    const render = () => {
      if (disposed) return
      raf = requestAnimationFrame(render)
      plane.position.set(view.planeX, 0.35, 0)
      planeMat.opacity = view.planeOpacity
      stadium.visible = view.stadScale > 0.01
      stadium.scale.setScalar(view.stadScale)
      camera.position.set(Math.sin(view.camAngle) * view.camDist, view.camHeight, Math.cos(view.camAngle) * view.camDist)
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }
    render()

    const cleanup = () => {
      disposed = true
      cancelAnimationFrame(raf)
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()) })
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }

    if (reduce) {
      // Reduced motion: hold the VS card briefly, then reveal — no motion.
      const t = setTimeout(finish, 700)
      return () => { clearTimeout(t); cleanup() }
    }

    // --- The five-beat timeline ---
    const tl = gsap.timeline({ onComplete: finish })
    tlRef.current = tl

    // Beat 1 — VS card clash.
    setBeat('vs')
    tl.fromTo(q('.cut__side--home'), { xPercent: -160, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power4.out' }, 0)
    tl.fromTo(q('.cut__side--away'), { xPercent: 160, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'power4.out' }, 0)
    tl.fromTo(q('.cut__vs-badge'), { scale: 0, rotate: -35 }, { scale: 1, rotate: 0, duration: 0.34, ease: 'back.out(2.4)' }, 0.26)
    tl.to(q('.cut__vs-badge'), { scale: 1.12, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.6)
    tl.to(q('.cut__vs'), { autoAlpha: 0, scale: 1.14, duration: 0.34, ease: 'power2.in' }, '+=0.9')

    // Beat 2 — plane arrival (establishing shot).
    tl.add(() => setBeat('arrival'))
    tl.set(q('.cut__stage'), { autoAlpha: 1 }, '<')
    tl.fromTo(q('.cut__caption'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '<')
    tl.to(view, { planeOpacity: 1, duration: 0.3 }, '<')
    tl.to(view, { planeX: 3.4, duration: 1.5, ease: 'none' }, '<')
    tl.to(q('.cut__caption'), { opacity: 0, duration: 0.3 }, '>-0.25')

    // Beat 3 — stadium flyover.
    tl.add(() => setBeat('flyover'))
    tl.to(view, { planeOpacity: 0, duration: 0.3 }, '<')
    tl.set(view, { stadScale: 0.02 }, '<')
    tl.to(view, { stadScale: 1, duration: 0.7, ease: 'back.out(1.5)' }, '<')
    tl.fromTo(q('.cut__caption--venue'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, '<0.15')
    tl.to(view, { camAngle: 0.95, camHeight: 1.05, camDist: 2.7, duration: 1.9, ease: 'sine.inOut' }, '<')
    tl.to(q('.cut__caption--venue'), { opacity: 0, duration: 0.3 }, '>-0.2')

    // Beat 4 — hype text.
    tl.add(() => setBeat('hype'))
    tl.fromTo(q('.cut__hype-line'), { opacity: 0, x: -48, skewX: -10 }, { opacity: 1, x: 0, skewX: 0, duration: 0.42, stagger: 0.5, ease: 'power3.out' }, '<0.1')
    tl.to({}, { duration: 0.7 })
    tl.to(q('.cut__hype'), { autoAlpha: 0, duration: 0.3 }, '+=0')

    // Beat 5 — whistle countdown + hard cut.
    tl.add(() => setBeat('count'))
    for (const n of ['3', '2', '1']) {
      tl.add(() => { const el = q('.cut__count')[0]; if (el) el.textContent = n })
      tl.fromTo(q('.cut__count'), { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'power2.out' })
      tl.to(q('.cut__count'), { opacity: 0, duration: 0.18, ease: 'power2.in' }, '+=0.22')
    }
    tl.to(q('.cut__flash'), { opacity: 1, duration: 0.14, ease: 'power2.in' })

    return () => { tl.kill(); cleanup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skip = () => { tlRef.current?.kill(); finish() }

  return (
    <div className="cutscene" ref={rootRef} data-beat={beat} role="dialog" aria-label="Pregame sequence">
      <div className="cut__stage" ref={canvasRef} aria-hidden="true" />

      <p className="cut__caption cut__caption--venue">{venue.name}</p>
      <p className="cut__caption">Arriving · {venue.city}</p>

      <div className="cut__vs">
        <div className="cut__side cut__side--home">
          {homeFlag && <img className="cut__flag" src={homeFlag} alt="" width="120" height="90" />}
          <span className="cut__code">{homeCode}</span>
          <span className="cut__team display">{home}</span>
        </div>
        <span className="cut__vs-badge display">VS</span>
        <div className="cut__side cut__side--away">
          {awayFlag && <img className="cut__flag" src={awayFlag} alt="" width="120" height="90" />}
          <span className="cut__code">{awayCode}</span>
          <span className="cut__team display">{away}</span>
        </div>
      </div>

      <div className="cut__hype">
        {hype.map((line, i) => <p className="cut__hype-line" key={i}>{line}</p>)}
      </div>

      <div className="cut__count display" aria-hidden="true" />
      <div className="cut__flash" aria-hidden="true" />
      <button className="cut__skip" type="button" onClick={skip}>Skip ›</button>
    </div>
  )
}
