// ---------- what the host tells other devices (v0.11) ----------
// The game runs on one device (the host). Messages, sounds and effects meant for players on other devices are
// queued here as {to, kind, args} (to = a player id, or '*' for everyone) and sent by the network code (src/net/).
// While nobody plays online the bus is off and nothing is kept.
// role (v0.12): 'off' (alone), 'host' (others joined this game) or 'client' (playing in someone else's game: the
// world comes from the host, and player actions go to it through bus.cmd).
export const bus={on:false,out:[],role:'off',cmd:null};
export function send(to,kind,args){if(bus.on)bus.out.push({to,kind,args:args||[]});}
export const isClient=()=>bus.role==='client';
