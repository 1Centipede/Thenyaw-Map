// Named area labels shown on the map (toggleable). Each entry is a rough
// center point for that zone — these don't need pixel precision like the
// calibration landmarks, just "somewhere in the middle of the area."
//
// Positions estimated from a reference map layout rather than measured
// in-game — good enough for general orientation, but nudge any of these
// if they look off once you see them live.
const POI_DATA = [
  { name: "Canyon", x: -277150.3, y: -96894.6 },
  { name: "Triple Rocks", x: -37626.2, y: -119922.3 },
  { name: "Party Point", x: 27880.0, y: -42062.3 },
  { name: "Valley", x: 61021.5, y: -175031.0 },
  { name: "Swamp", x: 56402.9, y: 133162.4 },
  { name: "Mage Forest", x: 205186.7, y: 12561.1 },
  { name: "Hermit Hill", x: 280523.0, y: -338608.5 },
  { name: "Paradise", x: 360324.7, y: -162363.1 },
  { name: "Sanctuary", x: 379456.6, y: -8699.8 },

  // Measured directly in-game — exact.
  { name: "Radio Tower", x: 78339.631, y: -240810.336 },
];
