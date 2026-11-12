// ---------- what E / the pick button does ----------
// One answer for player p, from what updatePlayer() found near them (p.near, p.nearDoor, ...; on a friend's device the
// same fields come with the snapshot). The button on screen (ui/prompts.js) and the action itself (systems/actions.js)
// both ask here, so they cannot disagree: before, each had its own order, and by a ladder next to a door the button
// said "open the door" while pressing it climbed the ladder.
// k: 'out' leave the car · 'help' a downed or dead friend (q) · 'full' the bag is full for what lies here (d) ·
//    'pick' take it (d) · 'ladder' · 'door' · 'box' search it · 'car' get in; id is the ladder, door, box or car
export function useOf(p){
  if(!p||!p.alive)return null;
  if(p.zed)return p.nearDoor>=0?{k:'door',id:p.nearDoor}:null;   // a zombie player only works doors (v0.51)
  if(p.car>=0)return {k:'out',id:p.car};
  if(p.nearDown)return {k:'help',q:p.nearDown};
  if(p.full)return {k:'full',d:p.full};
  if(p.near)return {k:'pick',d:p.near};
  if(p.nearLadder>=0)return {k:'ladder',id:p.nearLadder};
  if(p.nearDoor>=0)return {k:'door',id:p.nearDoor};
  if(p.nearBox>=0)return {k:'box',id:p.nearBox};
  if(p.nearCar>=0)return {k:'car',id:p.nearCar};
  return null;
}
