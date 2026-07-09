import './CloudBackground.css'

// Atmospheric drift behind the broadcast globes (Atlas + Matchup Sandbox). Purely
// decorative - soft tonal masses on the studio-black ground that breathe slowly
// so the globe reads with depth and altitude, the way a broadcast weather map
// sits a graphic over moving atmosphere. It is NOT a competing surface.
//
// Stays strictly inside DESIGN.md's broadcast-desk system: only the neutral
// surface tones (card / elevated / overlay) at low opacity - no new hue, no
// gradient fill, no glow. Softness comes from a static blur, not a light bleed.
// Motion is compositor-only transform (no per-frame JS, no three.js), each mass
// drifting on its own slow, eased, alternating cycle so nothing pulses in lockstep.
//
// It renders as the FIRST child of a `position: relative` globe stage and sits at
// z-index 0; the globe canvas above it is opaque, so the clouds can only ever fill
// the negative space around the sphere - never obscure the silhouette. Frozen flat
// under prefers-reduced-motion. Decorative, so aria-hidden.

export default function CloudBackground({ className = '' }) {
  return (
    <div className={`clouds ${className}`.trim()} aria-hidden="true">
      <span className="clouds__c clouds__c1" />
      <span className="clouds__c clouds__c2" />
      <span className="clouds__c clouds__c3" />
      <span className="clouds__c clouds__c4" />
      <span className="clouds__c clouds__c5" />
    </div>
  )
}
