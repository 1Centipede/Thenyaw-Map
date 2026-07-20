// Key = the image filename in use (see PRIMARY_IMAGE in app.js).
const DEFAULT_CALIBRATIONS = {
  // map.jpg is a downscaled (3000x3000, from a 16129x16129 source) export
  // of a genuinely orthographic, origin-centered map capture. World (0,0)
  // lands within ~0.3% of dead center, matching the "perfectly zeroed" claim
  "map.jpg": {
    nativeWidth: 3000,
    nativeHeight: 3000,
    a: -0.000004948255473372414,
    b: 0.003024542516694982,
    c: 1496.9238490765902,
    d: 0.0030391314470357466,
    e: -0.000009614919900074261,
    f: 1506.0646521394106,
  },
};
