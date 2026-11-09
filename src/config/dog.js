// ---------- the dog (v0.60) ----------
// PLACEHOLDERS. A stray somewhere in town; the first player to come within `tame` m of it is its owner from then on.
// It keeps close, barks at zombies it notices within `notice` m (a small noise; not while the owner sneaks), runs at
// those within `chase` m of its owner and bites them; zombies right by it hurt it. Hurt, it comes back to heel to heal.
export const DOG={hp:60,tame:2.6,follow:2.4,lost:40,speed:5.4,walk:3.2,notice:14,chase:9,bite:12,biteEvery:.8,reach:.95,
  hurtBy:7,heal:1.2,flee:.3,barkEvery:4,barkNoise:12,far:[30,60]};
