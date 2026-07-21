// Migration zones — world-space axis-aligned rectangles, drawn as boxes on
// the map (toggleable). Each is { name, x1, y1, x2, y2 } in in-game world
// coordinates (the two opposite corners).
//
// These are ESTIMATED from a 3D perspective screenshot of the zone volumes
// in the engine, anchored to the swamp (whose exact position is known).
// They're rough — for pixel-exact boxes, read each volume's min/max X/Y
// from the Unreal editor and drop the numbers straight in here.
const MIGRATION_DATA = [
  { name: "North",     x1: -330000, y1: -270000, x2: -20000, y2: 270000 },
  { name: "Southwest", x1: -20000,  y1: -290000, x2: 270000, y2: 40000 },
  { name: "Southeast", x1: -20000,  y1: 40000,   x2: 270000, y2: 330000 },
];
