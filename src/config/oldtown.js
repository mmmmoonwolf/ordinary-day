// ---------- an old European town, abandoned (v0.34) ----------
// How much of each thing world/oldtown.js puts in the city, and the words on the boards, posters and walls. PLACEHOLDER:
// every number here is a first guess at what looks right, not tuned. Shop names and people on the posters are made up.
export const OLD={
  signP:.45,boardP:.1,sprayP:.09,sprayMax:30,markP:.06,posterP:.25,   // per ground-floor bay / bay border of a building
  hangP:.35,balconyP:.2,sheetP:.03,sheetMax:8,                         // per street face / per upper window
  columns:8,bags:18,cases:30,barriers:12,sandbags:6,memorials:5,
  colors:{
    iron:'#1b1c1c',column:'#2c3a30',bag:['#141615','#23251f','#2b2e2a'],sheet:'#b3ad9f',
    case:['#4a3426','#1e1f22','#5a1f1c','#3a4448','#6b5a3e'],stripe:['#9a2a22','#cfc8b8'],sand:'#8a7a5a',
    candle:['#d8d0b8','#8a1a14'],flower:['#a83a3a','#d8c050','#e0e0d8','#7a3a6a'],
  },
};
// shop boards over the shopfronts: [name, line under it, board, letters]
export const OLD_SIGNS=[
  ['BOULANGERIE','PAIN · PÂTISSERIE','#2c3a2e','#d8c27a'],
  ['BUTCHER','FINEST MEATS · EST. 1908','#5a1e1a','#e8dcc0'],
  ['APOTHEKE','','#1e3a2a','#e6e0c8'],
  ['TAILOR','BESPOKE · ALTERATIONS','#22252e','#c9b27a'],
  ['CAFÉ CENTRAL','','#3a2418','#e8c68a'],
  ['HOTEL EUROPA','','#1c2430','#d8c27a'],
  ['BOOKS','ANTIQUARIAT','#3a3226','#e0d6b8'],
  ['WATCHMAKER','REPAIRS','#1e1e1e','#c8a860'],
  ['TABAC','','#5a1a18','#e8d070'],
  ['PAWNBROKER','GOLD BOUGHT','#2a2a22','#d8c27a'],
  ['BARBER','','#283240','#e8e0d0'],
  ['WINE & SPIRITS','','#3a1420','#d8c27a'],
  ['HABERDASHERY','BUTTONS · THREAD · LACE','#2e3a3a','#e0d6b8'],
  ['FLORIST','','#2a3a22','#e6dcc0'],
  ['PHOTO STUDIO','PORTRAITS','#202020','#d0c8b0'],
  ['TO LET','ENQUIRE WITHIN','#d8d2c0','#3a2a20'],
];
// small boards hanging off iron brackets: [words, board, letters]
export const OLD_HANG=[['HOTEL','#1c2430','#d8c27a'],['CAFÉ','#3a2418','#e8c68a'],['BIER','#2c2a1e','#e0c060'],['PHARMACIE','#e6e0d0','#1d6a3a'],['INN','#3a1e1a','#e0d0a0'],['ZIMMER FREI','#22302a','#e0d8c0'],['TABAC','#5a1a18','#e8d070'],['BREAD','#2c3a2e','#d8c27a']];
// paper on the walls and the advertising columns: [kind, headline, lines...]
export const OLD_POSTERS=[
  ['notice','QUARANTINE','THIS DISTRICT IS CLOSED','STAY INDOORS','BY ORDER OF THE MAYOR'],
  ['missing','MISSING','HAVE YOU SEEN ANNA?','LAST SEEN AT THE STATION'],
  ['missing','MISSING','TOMAS, AGE 8','PLEASE CALL'],
  ['notice','EVACUATION','BUSES LEAVE THE','TOWN SQUARE AT 06:00','BRING NOTHING'],
  ['show','CIRCUS ROMA','ONE WEEK ONLY','LIONS · ACROBATS'],
  ['notice','CURFEW','NOBODY ON THE STREETS','AFTER 18:00'],
  ['show','GRAND BALL','TOWN HALL','SATURDAY 8 PM'],
  ['notice','WARNING','DO NOT APPROACH','THE SICK'],
];
// spray paint: [words, paint]
export const OLD_SPRAY=[["DON'T OPEN · DEAD INSIDE",'#a01810'],['QUARANTINE','#151515'],['HELP US','#a01810'],['X','#b01810']];
