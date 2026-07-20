// Named area labels shown on the map (toggleable). Each entry is a rough
// center point for that zone — these don't need pixel precision like the
// calibration landmarks, just "somewhere in the middle of the area."
//
// Positions estimated from a reference map layout rather than measured
// in-game — good enough for general orientation, but nudge any of these
// if they look off once you see them live.
const POI_DATA = [
  { name: "Canyon", x: -288854.5, y: -83413.1 },
  { name: "Triple Rocks", x: -55305.6, y: -91847.8 },
  { name: "Party Plains", x: 31751.4, y: -31751.4 },
  { name: "Valley", x: 61276.3, y: -156901.1 },
  { name: "Swamp", x: 56402.9, y: 133162.4 },
  { name: "Mage Forest", x: 210473.9, y: 19678.2 },
  { name: "Hermit Hill", x: 288573.7, y: -310822.5 },
  { name: "Paradise", x: 371139.5, y: -144932.3 },
  { name: "Sanctuary", x: 390900.9, y: -305.1 },

  // Measured directly in-game — exact.
  { name: "Radio Tower", x: 78339.631, y: -240810.336 },
];
