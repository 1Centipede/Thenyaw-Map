// Coordinate calibration: maps in-game world (X,Y) -> native map-image pixel (px,py)
// via an affine transform:
//   px = a*X + b*Y + c
//   py = d*X + e*Y + f

const Calibration = (() => {
  function load(imageKey) {
    if (typeof DEFAULT_CALIBRATIONS !== "undefined" && DEFAULT_CALIBRATIONS[imageKey]) {
      return DEFAULT_CALIBRATIONS[imageKey];
    }
    return null;
  }

  function worldToPixel(calibration, worldX, worldY) {
    return {
      x: calibration.a * worldX + calibration.b * worldY + calibration.c,
      y: calibration.d * worldX + calibration.e * worldY + calibration.f,
    };
  }

  return { load, worldToPixel };
})();
