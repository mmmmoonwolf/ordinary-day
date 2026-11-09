// ---------- stealth (v0.7) ----------
// PLACEHOLDERS. Sneaking (hold C, or push the joystick only a little) is slow, and zombies that are not already
// chasing notice the player only within SNEAK_SENSE of their usual range. A thrown bottle breaks where it lands
// (or on the first wall) and makes a THROW_NOISE m noise there, like a gunshot that pulls zombies away.
export const SNEAK_SPEED=1.7,SNEAK_SENSE=.5;
export const THROW_RANGE=12,THROW_NOISE=22;
// v0.50 PLACEHOLDERS. A melee blow on an ordinary zombie (not Boomer, Armor Walker or Tyrant) from behind, while sneaking
// or before it has noticed the player, kills it at once and quietly (BACKSTAB.arc: how far behind, as a cosine).
export const BACKSTAB={arc:.3,kinds:['walker','zombie','sprinter']};
// v0.50 standing still for LISTEN.after s the player hears what moves within LISTEN.range m, walls or not (shown as glows)
export const LISTEN={after:1.2,range:24};
// v0.50 the flashlight (T / 🔦): at night a zombie notices a player with it on from × on further, with it off × off
export const LIGHT={on:1.25,off:.8};
