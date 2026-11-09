// ---------- what the player did before (v0.58) ----------
// PLACEHOLDERS. Picked in the character panel on the start screen (ui/creator.js), kept with the name and clothes and
// sent to the room like them. Each starts a new game with a few things (`kit`: [item id, count]) and has one or two
// small edges. None of them touches the confirmed numbers (zombie HP, weapon damage and fire rate, how much medicine heals).
export const JOBS={
  none:{name:'พลเรือน',hint:'',kit:[]},
  soldier:{name:'ทหารผ่านศึก',hint:'ปืนพก · รีโหลดไว',kit:[['pistol_c',1],['a9',18]],reload:.75},            // reloads faster
  medic:{name:'แพทย์',hint:'ผ้าพันแผล · ช่วยเพื่อนไว',kit:[['bandage',2],['painkiller',1]],revive:.55,bleed:.6},      // helps a friend up / brings them back faster; wounds bleed less
  mechanic:{name:'ช่าง',hint:'เศษวัสดุ · ของทนกว่า',kit:[['tape',2],['nails',3],['cloth',2]],wear:.5,fuel:.6},  // melee weapons wear half as fast; cars use less fuel
  runner:{name:'นักวิ่ง',hint:'วิ่งเร็วขึ้น',kit:[['bandage',1]],speed:1.08},                             // runs and walks a little faster
};
export const JOB_IDS=Object.keys(JOBS);
export const cleanJob=j=>JOBS[j]?j:'none';
export const jobOf=p=>JOBS[p&&p.job]||JOBS.none;
