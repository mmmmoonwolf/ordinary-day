// ---------- what the host tells other devices (v0.11) ----------
// The game runs on one device (the host). Messages, sounds and effects meant for players on other devices are
// queued here as {to, kind, args} (to = a player id, or '*' for everyone) and sent by the network code (phase 4).
// While nobody plays online the bus is off and nothing is kept.
export const bus={on:false,out:[]};
export function send(to,kind,args){if(bus.on)bus.out.push({to,kind,args:args||[]});}
