import './CloudBackground.css'

// Deep-space nebula drift behind the broadcast globes (Atlas + Matchup Sandbox).
// Purely decorative - wispy, luminous gas/dust masses on the studio-black ground,
// the way a deep-sky exposure sits structure into empty space. It is NOT a
// competing surface; it fills the negative space around the sphere with depth.
//
// Stays strictly inside DESIGN.md's broadcast-desk system: only the cool
// hue-250 surface tones (card / elevated / overlay) at low opacity - no new hue.
// Each mass is a multi-lobe radial-gradient fading tone -> transparent, so it
// reads as a soft nebula core with organic falloff rather than a flat blurred
// blob, and its edges dissolve before the container ever clips them (no boxy
// silhouette). This is opacity-only density falloff, not a light-bleed glow.
// A sparse static star-field sits behind the clouds to seat the space read.
//
// Motion is compositor-only transform (translate + subtle scale, no per-frame JS,
// no three.js), each mass drifting on its own slow eased alternating cycle so
// nothing pulses in lockstep and the layers parallax past one another.
//
// It renders as the FIRST child of a `position: relative` globe stage and sits at
// z-index 0; the globe canvas above it is opaque, so the clouds can only ever fill
// the negative space around the sphere - never obscure the silhouette. Frozen flat
// under prefers-reduced-motion. Decorative, so aria-hidden.

export default function CloudBackground({ className = '' }) {
  return (
    <div className={`clouds ${className}`.trim()} aria-hidden="true">
      <span className="clouds__stars" />
      <span className="clouds__c clouds__c1" />
      <span className="clouds__c clouds__c2" />
      <span className="clouds__c clouds__c3" />
      <span className="clouds__c clouds__c4" />
      <span className="clouds__c clouds__c5" />
      <span className="clouds__c clouds__c6" />
    </div>
  )
}
