# Thenyaw Map

A live coordinate map for The Isle. Paste your position from the in-game TAB menu and it drops a pin on the map, with an arrow showing which way you're facing.

## Using it

1. Open the site.
2. Copy your coordinates from TAB in-game.
3. Paste them into the box and hit **Locate**.
4. Drag to pan, scroll to zoom, drop pins to mark spots you want to remember.

Coordinates can be pasted in pretty much any format — labeled (`X=... Y=... Z=... Yaw=...`) or a bare comma-separated list.

## Running it locally

No build step, no dependencies. Just serve the folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

- `index.html`, `style.css`, `app.js` — the app
- `calibration.js` / `calibration-data.js` — maps in-game coordinates to pixel positions on `map.jpg`
- `map.jpg` — the map image
