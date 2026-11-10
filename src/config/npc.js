// ---------- people with guns (v0.62) ----------
// PLACEHOLDERS. Survivors: a few armed people about town once the outbreak starts; they shoot zombies they can see, and
// the first player to walk up to one gets a companion who follows and covers them (at most `follow` with each player).
// Bandits (from day `from`, one of the DAILY events): a small armed group guarding a stash; they shoot players in sight.
// Both are people: zombies bite them (`hp` first, then they turn), bandits can be shot, stabbed and blown up, and leave
// their gun and some ammo when they die.
export const NPC={
  survivors:3,far:[40,120],tame:2.6,follow:1,keep:3,lost:45,
  hp:80,sight:16,every:.9,hit:.55,dmg:14,walk:3.4,run:5.2,
  colors:{survivor:{shirt:'#3f5b46',pants:'#2b2f36'},bandit:{shirt:'#5a1a1a',pants:'#1f2329'}},
};
export const BANDIT={from:2,group:[2,3],sight:20,every:1.1,hit:.4,dmg:9,back:5,stash:3,noise:30};
