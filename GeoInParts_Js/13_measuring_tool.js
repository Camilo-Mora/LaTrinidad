
    // ============================================================================
    // [SECTION: JS_MEASURING_TOOL]
    // ============================================================================
    /* ======================================================
       MEASURING TOOL (DISTANCES & AREAS ON TRUE FIELD CANVAS)
       ====================================================== */
    function toggleMeasureTool(force) {
      const btn = document.getElementById("btn-measure-tool");
      const group = document.querySelector(".btn-measure-group");
      const hud = document.getElementById("measure-hud");
      const next = typeof force === "boolean" ? force : !state.measureTool.active;

      state.measureTool.active = next;
      if (btn) btn.classList.toggle("active", next);
      if (group) group.classList.toggle("active", next);
      if (hud) hud.style.display = next ? "block" : "none";

      if (next) {
        // If anchor mode or user polygon drawing was active, set to pan mode
        if (state.toolMode === "anchor") setToolMode("pan");
        if (state.userPolygon && state.userPolygon.drawMode) {
          state.userPolygon.drawMode = false;
          updatePolygonButtonStates();
        }
        updateStatus("📏 Measuring Tool active — click sequentially on field canvas to measure segments and areas. Esc to clear.");
        trueCanvas.style.cursor = "crosshair";
      } else {
        state.measureTool.points = [];
        state.measureTool.cursorPt = null;
        state.measureTool.closed = false;
        state.currentSnapTarget = null;
        trueCanvas.style.cursor = "grab";
        updateStatus("Measuring Tool closed.");
      }
      updateMeasureHUD();
      redrawTrueCanvas();
    }

    function clearMeasureTool() {
      state.measureTool.points = [];
      state.measureTool.cursorPt = null;
      state.measureTool.closed = false;
      state.currentSnapTarget = null;
      updateMeasureHUD();
      redrawTrueCanvas();
      updateStatus("Measurement cleared. Click to start a new measurement.");
    }

    function updateMeasureHUD() {
      const ptsCountEl = document.getElementById("measure-pts-count");
      const totalDistEl = document.getElementById("measure-total-dist");
      const areaRowEl = document.getElementById("measure-area-row");
      const areaM2El = document.getElementById("measure-area-m2");
      const areaPlazasEl = document.getElementById("measure-area-plazas");
      if (!ptsCountEl) return;

      const pts = state.measureTool.points;
      const n = pts.length;
      ptsCountEl.textContent = n;

      if (n < 2) {
        totalDistEl.textContent = "0.00 m";
        if (areaRowEl) areaRowEl.style.display = "none";
        return;
      }

      // Calculate total trajectory distance
      let totalDist = 0;
      for (let i = 0; i < n - 1; i++) {
        totalDist += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      }
      if (state.measureTool.closed && n >= 3) {
        totalDist += Math.hypot(pts[0].x - pts[n - 1].x, pts[0].y - pts[n - 1].y);
      }
      totalDistEl.textContent = `${totalDist.toFixed(2)} m`;

      // Calculate area if >= 3 points
      if (n >= 3) {
        let signedArea = 0;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          signedArea += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
        }
        const areaM2 = Math.abs(signedArea) / 2;
        const plazas = areaM2 / 6400;
        const ha = areaM2 / 10000;
        if (areaM2El) areaM2El.textContent = areaM2 >= 10000 ? `${areaM2.toLocaleString('en-US', {maximumFractionDigits:1})} m²` : `${areaM2.toFixed(1)} m²`;
        if (areaPlazasEl) areaPlazasEl.textContent = `${plazas.toFixed(2)} pl (${ha.toFixed(2)} ha)`;
        if (areaRowEl) areaRowEl.style.display = "block";
      } else {
        if (areaRowEl) areaRowEl.style.display = "none";
      }
    }

    // Attach listeners for Measuring Tool button, clear HUD button, and snap checkboxes
    const btnMeasureTool = document.getElementById("btn-measure-tool");
    const btnClearMeasure = document.getElementById("btn-clear-measure");
    const chkMeasureSnap = document.getElementById("chk-measure-snap");
    const chkMeasureHudSnap = document.getElementById("chk-measure-hud-snap");

    function syncMeasureSnap(val) {
      state.measureTool.snapEnabled = !!val;
      if (chkMeasureSnap) chkMeasureSnap.checked = !!val;
      if (chkMeasureHudSnap) chkMeasureHudSnap.checked = !!val;
      if (!state.measureTool.snapEnabled) state.currentSnapTarget = null;
      updateStatus(state.measureTool.snapEnabled ? "🧲 Measuring vertex snapping enabled." : "🧲 Measuring vertex snapping disabled.");
      redrawTrueCanvas();
    }

    if (btnMeasureTool) {
      btnMeasureTool.addEventListener("click", () => toggleMeasureTool());
    }
    if (btnClearMeasure) {
      btnClearMeasure.addEventListener("click", () => clearMeasureTool());
    }
    if (chkMeasureSnap) {
      chkMeasureSnap.addEventListener("change", (e) => syncMeasureSnap(e.target.checked));
    }
    if (chkMeasureHudSnap) {
      chkMeasureHudSnap.addEventListener("change", (e) => syncMeasureSnap(e.target.checked));
    }

    // [/SECTION: JS_MEASURING_TOOL]
