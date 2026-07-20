(() => {
  const els = {
    coordInput: document.getElementById("coordInput"),
    locateBtn: document.getElementById("locateBtn"),
    clearInputBtn: document.getElementById("clearInputBtn"),
    parseStatus: document.getElementById("parseStatus"),
    roX: document.getElementById("roX"),
    roY: document.getElementById("roY"),
    roZ: document.getElementById("roZ"),
    roYaw: document.getElementById("roYaw"),
    pinBtn: document.getElementById("pinBtn"),
    followBtn: document.getElementById("followBtn"),
    clearMarkerBtn: document.getElementById("clearMarkerBtn"),
    pinList: document.getElementById("pinList"),
    pinCount: document.getElementById("pinCount"),
    clearPinsBtn: document.getElementById("clearPinsBtn"),
    viewport: document.getElementById("viewport"),
    canvas: document.getElementById("canvas"),
    mapImage: document.getElementById("mapImage"),
    markerLayer: document.getElementById("markerLayer"),
    poiLayer: document.getElementById("poiLayer"),
    poiToggle: document.getElementById("poiToggle"),
    zoomIn: document.getElementById("zoomIn"),
    zoomOut: document.getElementById("zoomOut"),
    zoomReset: document.getElementById("zoomReset"),
  };

  const PRIMARY_IMAGE = "map.jpg";

  let imageKey = PRIMARY_IMAGE;
  let calibration = null;
  let current = null; // { x, y, z, yaw }
  let pins = [];

  const view = { scale: 1, tx: 0, ty: 0, minScale: 0.1, maxScale: 8 };
  let dragging = false;
  let dragStart = null;

  // ---------- image loading ----------

  function loadImage() {
    els.mapImage.onload = onImageReady;
    els.mapImage.src = PRIMARY_IMAGE;
  }

  function onImageReady() {
    calibration = Calibration.load(imageKey);
    fitToViewport();
    applyTransform();
    loadPins();
    renderPins();
    renderPoiLabels();
    if (!calibration) {
      setStatus(els.parseStatus, "This map image has no calibration data — positions can't be shown.", "error");
    }
  }

  function fitToViewport() {
    const vw = els.viewport.clientWidth;
    const vh = els.viewport.clientHeight;
    const iw = els.mapImage.naturalWidth || 1000;
    const ih = els.mapImage.naturalHeight || 1000;
    const scale = Math.min(vw / iw, vh / ih) * 0.95;
    view.scale = clamp(scale, view.minScale, view.maxScale);
    view.tx = (vw - iw * view.scale) / 2;
    view.ty = (vh - ih * view.scale) / 2;
  }

  function applyTransform() {
    els.canvas.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
    updatePoiLabelSizes();
  }

  // Area labels stay a fixed on-screen size regardless of zoom. The text
  // itself is rendered at a fixed, crisp font-size (see .poi-label-text)
  // and resized purely via a CSS transform scale to counter the canvas's
  // own zoom — shrinking the actual font-size instead would rasterize it
  // at near-invisible sizes at high zoom (sub-2px), which browsers render
  // as an illegible blur even after scaling back up.
  const POI_FIXED_PX = 22;
  const POI_BASE_FONT_PX = 14;
  const POI_OFFSET_SCREEN_PX = 6;

  function updatePoiLabelSizes() {
    const labelScale = POI_FIXED_PX / (POI_BASE_FONT_PX * view.scale);
    const offsetLocalPx = POI_OFFSET_SCREEN_PX / view.scale;
    els.poiLayer.querySelectorAll(".poi-label-text").forEach((el) => {
      el.style.transform = `translateX(${offsetLocalPx}px) scale(${labelScale})`;
    });
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- pan & zoom ----------

  els.viewport.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".marker")) return;
    e.preventDefault();
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    els.viewport.classList.add("grabbing");
    els.viewport.setPointerCapture(e.pointerId);
  });

  // Belt and suspenders against the browser's native "drag this image"
  // gesture hijacking a long pan (draggable="false" isn't always enough).
  els.mapImage.addEventListener("dragstart", (e) => e.preventDefault());

  els.viewport.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    view.tx = dragStart.tx + (e.clientX - dragStart.x);
    view.ty = dragStart.ty + (e.clientY - dragStart.y);
    applyTransform();
  });

  function endDrag(e) {
    dragging = false;
    els.viewport.classList.remove("grabbing");
  }
  els.viewport.addEventListener("pointerup", endDrag);
  els.viewport.addEventListener("pointercancel", endDrag);

  els.viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = els.viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = clamp(view.scale * factor, view.minScale, view.maxScale);
    const ratio = newScale / view.scale;
    view.tx = cx - (cx - view.tx) * ratio;
    view.ty = cy - (cy - view.ty) * ratio;
    view.scale = newScale;
    applyTransform();
  }, { passive: false });

  els.zoomIn.addEventListener("click", () => zoomAtCenter(1.3));
  els.zoomOut.addEventListener("click", () => zoomAtCenter(1 / 1.3));
  els.zoomReset.addEventListener("click", () => { fitToViewport(); applyTransform(); });

  function zoomAtCenter(factor) {
    const rect = els.viewport.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = clamp(view.scale * factor, view.minScale, view.maxScale);
    const ratio = newScale / view.scale;
    view.tx = cx - (cx - view.tx) * ratio;
    view.ty = cy - (cy - view.ty) * ratio;
    view.scale = newScale;
    applyTransform();
  }

  function centerOn(px, py) {
    const rect = els.viewport.getBoundingClientRect();
    view.tx = rect.width / 2 - px * view.scale;
    view.ty = rect.height / 2 - py * view.scale;
    applyTransform();
  }

  // ---------- coordinate parsing ----------

  function matchNumber(text, patterns) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  }

  function parseCoords(text) {
    let t = String(text || "").trim();
    if (!t) return null;

    // Strip thousands-separator commas (comma immediately followed by a
    // digit, e.g. "56,786.561" -> "56786.561") without touching commas used
    // to separate fields (which are followed by a space), e.g. the TAB
    // menu's "56,786.561, 133,412.084, -29,981.839".
    t = t.replace(/(\d),(?=\d)/g, "$1");

    let x = matchNumber(t, [/\bX\s*[:=]\s*(-?[0-9.]+)/i]);
    let y = matchNumber(t, [/\bY\s*[:=]\s*(-?[0-9.]+)/i]);
    let z = matchNumber(t, [/\bZ\s*[:=]\s*(-?[0-9.]+)/i]);
    let yaw = matchNumber(t, [
      /\bYaw\s*[:=]\s*(-?[0-9.]+)/i,
      /\bRot(?:ation)?\s*[:=]\s*(-?[0-9.]+)/i,
      /\bR\s*[:=]\s*(-?[0-9.]+)/i,
    ]);

    if (x === null || y === null) {
      // fall back to a bare "num, num, num[, num]" style paste
      const nums = t.match(/-?\d+(?:\.\d+)?/g);
      if (nums && nums.length >= 2) {
        x = Number(nums[0]);
        y = Number(nums[1]);
        z = nums.length >= 3 ? Number(nums[2]) : z;
        yaw = nums.length >= 4 ? Number(nums[3]) : yaw;
      }
    }

    if (x === null || y === null) return null;
    return { x, y, z: z ?? null, yaw: yaw ?? null };
  }

  function setStatus(el, msg, kind) {
    el.textContent = msg || "";
    el.classList.remove("error", "ok");
    if (kind) el.classList.add(kind);
  }

  els.locateBtn.addEventListener("click", handleLocate);
  els.coordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleLocate();
  });

  function handleLocate() {
    const parsed = parseCoords(els.coordInput.value);
    if (!parsed) {
      setStatus(els.parseStatus, "Couldn't find X/Y in that text. Paste the full coordinate line from TAB.", "error");
      return;
    }
    if (!calibration) {
      setStatus(els.parseStatus, "This map image has no calibration data — positions can't be shown.", "error");
      return;
    }
    current = parsed;
    setStatus(els.parseStatus, "Position found.", "ok");
    updateReadout(parsed);
    placeCurrentMarker(parsed);
    els.pinBtn.disabled = false;
    els.followBtn.disabled = false;
    els.clearMarkerBtn.disabled = false;
  }

  // Paste anywhere on the page (not just in the textarea) to drop the
  // coordinates straight in and locate — no click required first.
  document.addEventListener("paste", (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (!text) return;
    e.preventDefault();
    els.coordInput.value = text;
    handleLocate();
  });

  els.clearInputBtn.addEventListener("click", () => {
    els.coordInput.value = "";
    setStatus(els.parseStatus, "", null);
  });

  els.clearMarkerBtn.addEventListener("click", () => {
    current = null;
    if (currentMarkerEl) {
      currentMarkerEl.remove();
      currentMarkerEl = null;
    }
    updateReadout({ x: null, y: null, z: null, yaw: null });
    els.pinBtn.disabled = true;
    els.followBtn.disabled = true;
    els.clearMarkerBtn.disabled = true;
    setStatus(els.parseStatus, "", null);
  });

  function updateReadout(p) {
    els.roX.textContent = p.x === null ? "—" : fmtNum(p.x);
    els.roY.textContent = p.y === null ? "—" : fmtNum(p.y);
    els.roZ.textContent = p.z === null ? "—" : fmtNum(p.z);
    els.roYaw.textContent = p.yaw === null ? "—" : fmtNum(p.yaw) + "°";
  }

  function fmtNum(n) {
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  // ---------- markers ----------

  let currentMarkerEl = null;

  function placeCurrentMarker(p) {
    const { x: px, y: py } = Calibration.worldToPixel(calibration, p.x, p.y);

    if (!currentMarkerEl) {
      currentMarkerEl = document.createElement("div");
      currentMarkerEl.className = "marker current";
      currentMarkerEl.innerHTML = `<div class="heading"></div><div class="dot"></div>`;
      els.markerLayer.appendChild(currentMarkerEl);
    }
    currentMarkerEl.style.left = px + "px";
    currentMarkerEl.style.top = py + "px";

    const heading = currentMarkerEl.querySelector(".heading");
    if (p.yaw !== null) {
      heading.style.display = "";
      // In-game Yaw: 0 = +X axis (east), increases clockwise when viewed from above.
      // The marker's arrow SVG points "up" by default, so rotate by yaw + 90.
      heading.style.transform = `rotate(${p.yaw + 90}deg)`;
    } else {
      heading.style.display = "none";
    }
  }

  // ---------- pins ----------

  function pinsStorageKey() { return "isleMap.pins." + imageKey; }

  function loadPins() {
    try {
      const raw = localStorage.getItem(pinsStorageKey());
      pins = raw ? JSON.parse(raw) : [];
    } catch (e) {
      pins = [];
    }
  }

  function savePins() {
    localStorage.setItem(pinsStorageKey(), JSON.stringify(pins));
  }

  els.pinBtn.addEventListener("click", () => {
    if (!current) return;
    const pin = { ...current, id: Date.now(), label: `Pin ${pins.length + 1}` };
    pins.push(pin);
    savePins();
    renderPins();
  });

  els.followBtn.addEventListener("click", () => {
    if (!current || !calibration) return;
    const { x: px, y: py } = Calibration.worldToPixel(calibration, current.x, current.y);
    centerOn(px, py);
  });

  els.clearPinsBtn.addEventListener("click", () => {
    pins = [];
    savePins();
    renderPins();
  });

  function renderPins() {
    els.pinList.innerHTML = "";
    els.markerLayer.querySelectorAll(".marker.pin").forEach((n) => n.remove());
    els.pinCount.textContent = pins.length ? `(${pins.length})` : "";

    for (const pin of pins) {
      const li = document.createElement("li");
      li.innerHTML = `
        <button class="pin-goto">${escapeHtml(pin.label)}</button>
        <button class="pin-remove" title="Remove">✕</button>
      `;
      li.querySelector(".pin-goto").addEventListener("click", () => {
        if (!calibration) return;
        const { x: px, y: py } = Calibration.worldToPixel(calibration, pin.x, pin.y);
        centerOn(px, py);
      });
      li.querySelector(".pin-remove").addEventListener("click", () => {
        pins = pins.filter((p) => p.id !== pin.id);
        savePins();
        renderPins();
      });
      els.pinList.appendChild(li);

      if (calibration) {
        const { x: px, y: py } = Calibration.worldToPixel(calibration, pin.x, pin.y);
        const m = document.createElement("div");
        m.className = "marker pin";
        m.style.left = px + "px";
        m.style.top = py + "px";
        m.innerHTML = `<div class="dot"></div><div class="label">${escapeHtml(pin.label)}</div>`;
        els.markerLayer.appendChild(m);
      }
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---------- area name labels ----------

  function renderPoiLabels() {
    if (!calibration) return;
    els.poiLayer.innerHTML = "";
    const data = typeof POI_DATA !== "undefined" ? POI_DATA : [];

    for (const poi of data) {
      const { x: px, y: py } = Calibration.worldToPixel(calibration, poi.x, poi.y);
      const el = document.createElement("div");
      el.className = "poi-label";
      el.style.left = px + "px";
      el.style.top = py + "px";
      el.innerHTML = `<span class="poi-label-text">${escapeHtml(poi.name)}</span>`;
      els.poiLayer.appendChild(el);
    }
    updatePoiLabelSizes();
  }

  const POI_VISIBLE_KEY = "isleMap.poiVisible";

  function loadPoiToggleState() {
    const saved = localStorage.getItem(POI_VISIBLE_KEY);
    const visible = saved === null ? true : saved === "true";
    els.poiToggle.checked = visible;
    els.poiLayer.classList.toggle("hidden", !visible);
  }

  els.poiToggle.addEventListener("change", () => {
    els.poiLayer.classList.toggle("hidden", !els.poiToggle.checked);
    localStorage.setItem(POI_VISIBLE_KEY, els.poiToggle.checked);
  });

  // ---------- init ----------

  window.addEventListener("resize", () => {
    if (!dragging) { fitToViewport(); applyTransform(); }
  });

  loadPoiToggleState();
  loadImage();
})();
