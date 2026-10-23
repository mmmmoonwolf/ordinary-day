// ---------- single props that change (v0.23) ----------
// Most models are baked together and never change (world/prop-models.js setTown). These are drawn one by one so the game
// can hide them: gas cylinders that blow up, window boards on a building's shell. Each entry:
// {id, size, axis (the size is along: 0 x, 1 y, 2 z), at ([0..1] anchor), x, y, z, ry, group (where the model goes),
//  fallback (a plain mesh shown on "low" graphics and while loading, or null), gone (hidden for good, e.g. blown up), model}
export const live=[];
