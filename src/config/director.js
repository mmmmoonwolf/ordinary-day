// ---------- the director (v0.52) ----------
// PLACEHOLDERS. Like Left 4 Dead's: every `every` s (real) on the host it looks at the players. Nothing has chased
// anyone for `calm` s and they are well (average HP over `wellHp`): it sends a small wave from out of sight
// (`wave` zombies, `dist` m off, already heading for them). They are hurt (average HP under `hurtHp`) or `swarm`
// zombies are on them: no wave, and the next night spawn waits `breathe` in-game minutes. Survival only (not PvP).
export const DIRECTOR={every:10,calm:50,wellHp:.7,hurtHp:.35,swarm:6,wave:[3,6],dist:[28,38],breathe:30,night:{zombie:55,sprinter:45},day:{zombie:1}};
// v0.52 blood night: the last night before the army camp opens. Night spawns every `spawnEvery` in-game minutes
// (45 other nights) with `extra` more each time, a horde at each of `hordes` (minutes after midnight, negative =
// before), a red sky. PLACEHOLDERS
export const BLOOD={spawnEvery:15,extra:1,hordes:[-120,120],size:26};
// v0.52 the mega horde: one afternoon a pack of `size` walks slowly across the town (survival, day `day` at `at`)
export const MEGA={day:2,at:15*60,size:55,cap:150};
