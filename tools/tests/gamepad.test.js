// A gamepad (standard mapping): the left stick walks, RT fires, and the two buttons that open screens also close them
// in a game alone, where an open bag or pause menu stops the simulation.
import { els, errs, step, T, P, finish } from './setup.js';

const fail = m => errs.push('gamepad: ' + m);
const button = () => ({ pressed: false, value: 0 });
const padState = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, button) };
navigator.getGamepads = () => [padState];
const press = (i, frames = 2) => { padState.buttons[i] = { pressed: true, value: 1 }; step(frames); padState.buttons[i] = button(); step(2); };

els.bStart.fire('click'); T.G.running = true; step(2); const me = T.player; me.inv = 1e9; for (const a of T.agents) a.gone = true; step(2);
// Y: the bag, open and shut again while the game is stopped by it
press(3); if (els.bag.hidden || !T.G.paused) fail('Y did not open the bag (hidden ' + els.bag.hidden + ', paused ' + T.G.paused + ')');
const m0 = T.G.min; step(20); if (T.G.min !== m0) fail('the game went on behind the open bag');
press(3); if (!els.bag.hidden || T.G.paused) fail('Y did not close the bag again');
// Menu: the pause screen, and back
press(9); if (els.pause.hidden || !T.G.paused) fail('Menu did not pause');
press(9); if (!els.pause.hidden || T.G.paused) fail('Menu did not resume');
// Menu also shuts an open bag
press(3); press(9); if (!els.bag.hidden || T.G.paused || !els.pause.hidden) fail('Menu did not shut the open bag');
// the stick walks, the trigger fires
const x0 = me.pos.x, z0 = me.pos.z; padState.axes[0] = 1; step(40); padState.axes[0] = 0; step(2);
const walked = Math.hypot(me.pos.x - x0, me.pos.z - z0); if (!(walked > .5)) fail('the left stick walked ' + walked.toFixed(2) + ' m');
me.gear.eq.secondary = { id: 'pistol_c', mag: 12 }; me.gear.active = 'secondary'; step(2);
press(7, 6); if (me.gear.eq.secondary.mag !== 11) fail('RT fired ' + (12 - me.gear.eq.secondary.mag) + ' shots, wanted 1');
console.log('gamepad: Y and Menu open and close their screens in a game alone, the stick walked ' + walked.toFixed(1) + ' m, RT fired once');
finish('gamepad');
