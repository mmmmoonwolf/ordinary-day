// ---------- shelter (v0.6) ----------
// PLACEHOLDERS for enterable buildings and their doors.
export const WALL_T=.3;          // wall thickness (m)
export const DOOR_W=1.6;         // doorway width (m)
export const DOOR_HP=120;        // a closed door takes this much zombie damage before it breaks (Tyrant breaks it in one hit)
export const HEAR_WALL=2.5;      // zombies notice a player on the other side of a wall within this distance (m)
export const INDOOR_NOISE=.5;    // noise made inside a building with its door closed carries this far, relative to outside
export const STUB_H=1;           // height of the cut-away walls while the player is inside (m)
// v0.7 scent: hiding in one building all night stops being safe. After SCENT_AFTER in-game minutes in the same building,
// at night, every SCENT_EVERY minutes the nearest zombies within SCENT_RANGE come to it; one more per 2 hours, up to SCENT_MAX
// v0.7 planks (PLACEHOLDERS): each plank on a closed door adds PLANK_HP up to DOOR_MAX; a broken door is rebuilt with
// REBUILD_PLANKS planks at REBUILT_HP. Hammering is loud (HAMMER_NOISE m, halved behind a closed door like any indoor noise)
export const PLANK_HP=40,DOOR_MAX=200,REBUILD_PLANKS=2,REBUILT_HP=60,HAMMER_NOISE=18;
export const SCENT_AFTER=90,SCENT_EVERY=45,SCENT_RANGE=40,SCENT_MAX=3;
