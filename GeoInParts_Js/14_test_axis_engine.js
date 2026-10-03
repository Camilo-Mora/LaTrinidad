
    // ============================================================================
    // [SECTION: JS_TEST_AXIS_ENGINE]
    // ============================================================================
    /* ============================================================================
       PARAMETRIC 1D TEST AXIS ENGINE (HYPOTHESIS TESTING)
       Allows defining manual test axes with draggable handles A & B.
       Anchors placed near an axis dynamically snap and couple parametrically:
       moving the axis handles carries the anchors along!
       ============================================================================ */

    function computeAxisBearing(p1, p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    }

    function computeAxisGeometry(axis) {
      const dx = axis.p2.x - axis.p1.x;
      const dy = axis.p2.y - axis.p1.y;
      const len = Math.hypot(dx, dy);
      const safeLen = len > 1e-6 ? len : 1e-6;
      const u = { x: dx / safeLen, y: dy / safeLen };
      const n = { x: -u.y, y: u.x };
      const bearing = computeAxisBearing(axis.p1, axis.p2);
      return { len, u, n, bearing };
    }

    function projectPointOnAxis(pt, axis) {
      const vx = axis.p2.x - axis.p1.x;
      const vy = axis.p2.y - axis.p1.y;
      const L2 = vx * vx + vy * vy;
      if (L2 < 1e-8) {
        return { projPt: { ...axis.p1 }, t: 0, dist: Math.hypot(pt.x - axis.p1.x, pt.y - axis.p1.y) };
      }
      const t = ((pt.x - axis.p1.x) * vx + (pt.y - axis.p1.y) * vy) / L2;
      const projPt = { x: axis.p1.x + t * vx, y: axis.p1.y + t * vy };
      const dist = Math.hypot(pt.x - projPt.x, pt.y - projPt.y);
      return { projPt, t, dist };
    }

    function findNearestTestAxis(worldPt, vp, maxScreenPx = 18) {
      const axes = (state.testAxes || []).filter(a => a.visible !== false);
      if (axes.length === 0) return null;
      let best = null;
      let bestScreenDist = Infinity;
      for (const ax of axes) {
        const pr = projectPointOnAxis(worldPt, ax);
        const sDist = pr.dist * vp.scale;
        if (sDist <= maxScreenPx && sDist < bestScreenDist) {
          bestScreenDist = sDist;
          best = { axis: ax, projPt: pr.projPt, t: pr.t, screenDist: sDist };
        }
      }
      return best;
    }

    function findTestAxisHandleAt(sx, sy, vp, canvasH, hitRadiusPx = 12) {
      const axes = (state.testAxes || []).filter(a => a.visible !== false);
      for (let i = axes.length - 1; i >= 0; i--) {
        const ax = axes[i];
        const s1 = worldToScreenGIS(ax.p1, vp, canvasH);
        if (Math.hypot(sx - s1.x, sy - s1.y) <= hitRadiusPx) {
          return { axis: ax, handle: 'p1' };
        }
        const s2 = worldToScreenGIS(ax.p2, vp, canvasH);
        if (Math.hypot(sx - s2.x, sy - s2.y) <= hitRadiusPx) {
          return { axis: ax, handle: 'p2' };
        }
      }
      return null;
    }

    function syncTestAxisCounter() {
      const maxId = (state.testAxes || []).reduce((max, a) => Math.max(max, Number(a.id) || 0), 0);
      state.testAxisCounter = Math.max(state.testAxisCounter || 0, maxId);
      return state.testAxisCounter;
    }

    function ensureUniqueTestAxisIds() {
      const seen = new Set();
      let nextId = 1;
      (state.testAxes || []).forEach(ax => {
        const numId = Number(ax.id);
        if (!numId || isNaN(numId) || seen.has(numId)) {
          while (seen.has(nextId) || (state.testAxes || []).some(other => other !== ax && Number(other.id) === nextId)) {
            nextId++;
          }
          const oldId = ax.id;
          ax.id = nextId;
          if (oldId != null) {
            (state.anchors || []).forEach(anc => {
              if (anc.axisId === oldId) anc.axisId = ax.id;
            });
          }
          if (!ax.name || /^Axis\s+\d+$/i.test(ax.name)) {
            ax.name = `Axis ${ax.id}`;
          }
        }
        seen.add(Number(ax.id));
      });
      syncTestAxisCounter();
    }

    function updateAnchorsOnAxis(axis) {
      const vx = axis.p2.x - axis.p1.x;
      const vy = axis.p2.y - axis.p1.y;
      let changed = false;
      (state.anchors || []).forEach(anc => {
        if (anc.axisId === axis.id && typeof anc.axisT === "number") {
          anc.dst = {
            x: axis.p1.x + anc.axisT * vx,
            y: axis.p1.y + anc.axisT * vy
          };
          changed = true;
        }
      });
      if (changed) {
        redrawAll();
      }
    }

    function addTestAxis(p1, p2) {
      ensureUniqueTestAxisIds();
      const id = syncTestAxisCounter() + 1;
      state.testAxisCounter = id;
      const colors = ["#e040fb", "#00e5ff", "#ffd600", "#ff6d00", "#76ff03", "#d500f9"];
      const color = colors[(id - 1) % colors.length];
      const ax = {
        id,
        name: `Axis ${id}`,
        p1: { x: p1.x, y: p1.y },
        p2: { x: p2.x, y: p2.y },
        color,
        visible: true
      };
      state.testAxes.push(ax);
      renderTestAxesList();
      redrawTrueCanvas();
      const geom = computeAxisGeometry(ax);
      updateStatus(`📐 Created ${ax.name}: ${geom.len.toFixed(1)}m at ${geom.bearing.toFixed(1)}°. Drag handles A or B to reposition.`);
      return ax;
    }

    function deleteTestAxis(id) {
      const idx = (state.testAxes || []).findIndex(a => a.id === id);
      if (idx < 0) return;
      const ax = state.testAxes[idx];
      state.testAxes.splice(idx, 1);
      // Detach any anchors bound to this axis
      let detached = 0;
      (state.anchors || []).forEach(anc => {
        if (anc.axisId === id) {
          anc.axisId = null;
          anc.axisT = null;
          detached++;
        }
      });
      renderTestAxesList();
      updateAnalyticsUI();
      redrawAll();
      updateStatus(`Deleted ${ax.name}${detached > 0 ? ` (detached ${detached} anchor(s))` : ''}.`);
    }

    function startAddTestAxis() {
      state.creatingTestAxis = true;
      state.testAxisDrawStart = null;
      state.testAxisCursorPt = null;
      const btnAdd = document.getElementById("btn-add-test-axis");
      const btnCancel = document.getElementById("btn-cancel-test-axis");
      if (btnAdd) {
        btnAdd.style.background = "rgba(224,64,251,0.35)";
        btnAdd.textContent = "📍 Click Point A...";
      }
      if (btnCancel) btnCancel.style.display = "inline-flex";
      updateStatus("📐 Click Point A on the Field Survey map to start the test axis.");
      trueCanvas.style.cursor = "crosshair";
    }

    function cancelAddTestAxis() {
      state.creatingTestAxis = false;
      state.testAxisDrawStart = null;
      state.testAxisCursorPt = null;
      const btnAdd = document.getElementById("btn-add-test-axis");
      const btnCancel = document.getElementById("btn-cancel-test-axis");
      if (btnAdd) {
        btnAdd.style.background = "";
        btnAdd.textContent = "➕ Add Axis";
      }
      if (btnCancel) btnCancel.style.display = "none";
      updateStatus("Test axis creation cancelled.");
      trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
      redrawTrueCanvas();
    }

    function renderTestAxesList() {
      const container = document.getElementById("test-axes-list");
      const countBadge = document.getElementById("test-axes-count-badge");
      const optAxisBadge = document.getElementById("opt-axis-count-badge");
      const axes = state.testAxes || [];

      if (countBadge) countBadge.textContent = axes.length;
      if (optAxisBadge) {
        const boundAnchors = (state.anchors || []).filter(a => a.axisId != null && a.active !== false).length;
        optAxisBadge.textContent = `${axes.length} axis (${boundAnchors} anc)`;
      }

      if (!container) return;
      container.innerHTML = "";

      if (axes.length === 0) {
        container.innerHTML = `<div style="font-size:0.68rem;color:var(--text-muted);font-style:italic;padding:3px 2px;">No test axes defined yet.</div>`;
        return;
      }

      axes.forEach(ax => {
        const geom = computeAxisGeometry(ax);
        const boundAnchors = (state.anchors || []).filter(a => a.axisId === ax.id);
        const row = document.createElement("div");
        row.style.cssText = `display:flex;align-items:center;justify-content:space-between;gap:5px;padding:3px 6px;border-radius:4px;background:rgba(255,255,255,0.03);border:1px solid ${hexToRgba(ax.color, 0.35)};font-size:0.71rem;`;
        if (ax.visible === false) row.style.opacity = "0.55";

        // Dot & Checkbox
        const leftWrap = document.createElement("div");
        leftWrap.style.cssText = "display:flex;align-items:center;gap:4px;min-width:0;flex:1;";

        const dot = document.createElement("span");
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${ax.color};box-shadow:0 0 6px ${ax.color};flex-shrink:0;`;

        const chkVis = document.createElement("input");
        chkVis.type = "checkbox";
        chkVis.checked = (ax.visible !== false);
        chkVis.title = ax.visible !== false ? "Visible on canvas (uncheck to hide)" : "Hidden (check to show)";
        chkVis.style.cssText = `accent-color:${ax.color};cursor:pointer;margin:0;flex-shrink:0;`;
        chkVis.addEventListener("change", () => {
          ax.visible = chkVis.checked;
          renderTestAxesList();
          redrawTrueCanvas();
        });

        const nameInp = document.createElement("input");
        nameInp.type = "text";
        nameInp.value = ax.name;
        nameInp.title = "Click to rename axis";
        nameInp.style.cssText = "background:transparent;border:none;color:inherit;font-size:0.71rem;font-weight:600;min-width:45px;flex:1;padding:1px 2px;";
        nameInp.addEventListener("change", e => {
          ax.name = e.target.value.trim() || `Axis ${ax.id}`;
          updateAnalyticsUI();
          redrawTrueCanvas();
        });

        leftWrap.appendChild(dot);
        leftWrap.appendChild(chkVis);
        leftWrap.appendChild(nameInp);

        // Right details: Bearing / Len badge & Anchors attached
        const rightWrap = document.createElement("div");
        rightWrap.style.cssText = "display:flex;align-items:center;gap:4px;flex-shrink:0;";

        const badgeGeom = document.createElement("span");
        badgeGeom.style.cssText = "font-family:monospace;font-size:0.62rem;color:var(--text-muted);";
        badgeGeom.textContent = `${geom.len.toFixed(0)}m ${geom.bearing.toFixed(0)}°`;
        badgeGeom.title = `Length: ${geom.len.toFixed(2)}m • Bearing: ${geom.bearing.toFixed(1)}°`;

        if (boundAnchors.length > 0) {
          const badgeAnc = document.createElement("span");
          badgeAnc.style.cssText = `font-family:monospace;font-size:0.60rem;background:${hexToRgba(ax.color, 0.25)};color:${ax.color};padding:0 3px;border-radius:2px;font-weight:700;`;
          badgeAnc.textContent = boundAnchors.map(a => `#${a.id}`).join(",");
          badgeAnc.title = `Coupled Anchors: ${boundAnchors.map(a => `#${a.id}`).join(", ")}`;
          rightWrap.appendChild(badgeAnc);
        }

        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "custom-poly-btn-icon custom-poly-btn-del";
        btnDel.title = `Delete ${ax.name}`;
        btnDel.innerHTML = "✕";
        btnDel.style.cssText = "padding:0 4px;font-size:0.68rem;cursor:pointer;";
        btnDel.addEventListener("click", () => deleteTestAxis(ax.id));

        rightWrap.appendChild(badgeGeom);
        rightWrap.appendChild(btnDel);

        row.appendChild(leftWrap);
        row.appendChild(rightWrap);
        container.appendChild(row);
      });
    }

    function drawTestAxesGIS(ctx, vp, canvasH) {
      const axes = (state.testAxes || []).filter(a => a.visible !== false);

      // 1. Draw defined test axes
      axes.forEach(ax => {
        const geom = computeAxisGeometry(ax);
        const s1 = worldToScreenGIS(ax.p1, vp, canvasH);
        const s2 = worldToScreenGIS(ax.p2, vp, canvasH);

        // Extended guideline (dashed ray extending ±150m along axis direction)
        const extDist = Math.max(150, geom.len * 1.5);
        const pExt1 = { x: ax.p1.x - extDist * geom.u.x, y: ax.p1.y - extDist * geom.u.y };
        const pExt2 = { x: ax.p2.x + extDist * geom.u.x, y: ax.p2.y + extDist * geom.u.y };
        const sExt1 = worldToScreenGIS(pExt1, vp, canvasH);
        const sExt2 = worldToScreenGIS(pExt2, vp, canvasH);

        ctx.save();
        // Faint extended guideline
        ctx.beginPath();
        ctx.moveTo(sExt1.x, sExt1.y);
        ctx.lineTo(sExt2.x, sExt2.y);
        ctx.strokeStyle = hexToRgba(ax.color, 0.35);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.stroke();

        // Core solid line between A and B
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.strokeStyle = ax.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.shadowColor = ax.color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Metric distance tickmarks along axis (every 5m sub-tick, 10m labeled tick)
        const tickStep = (geom.len >= 60) ? 10 : 5;
        const tickSpan = Math.ceil(geom.len / tickStep) * tickStep;
        ctx.font = "9px monospace";
        ctx.fillStyle = ax.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let d = 0; d <= tickSpan; d += tickStep) {
          const tPt = { x: ax.p1.x + d * geom.u.x, y: ax.p1.y + d * geom.u.y };
          const sTick = worldToScreenGIS(tPt, vp, canvasH);
          const tickLen = (d % 10 === 0) ? 6 : 3.5;

          // Perpendicular tick
          const tx = -geom.n.x * tickLen;
          const ty = geom.n.y * tickLen; // Screen Y is inverted
          ctx.beginPath();
          ctx.moveTo(sTick.x - tx, sTick.y - ty);
          ctx.lineTo(sTick.x + tx, sTick.y + ty);
          ctx.strokeStyle = ax.color;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Numeric label at 10m intervals
          if (d % 10 === 0 && d > 0 && d < geom.len) {
            ctx.fillText(`${d}m`, sTick.x + geom.n.x * 12, sTick.y - geom.n.y * 12);
          }
        }

        // Handles A and B
        function drawHandle(sPt, label) {
          ctx.beginPath();
          ctx.arc(sPt.x, sPt.y, 6.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = ax.color;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(sPt.x, sPt.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = ax.color;
          ctx.fill();

          // Label
          ctx.font = "bold 9px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "rgba(0,0,0,0.85)";
          ctx.lineWidth = 2.5;
          ctx.strokeText(label, sPt.x + 9, sPt.y - 7);
          ctx.fillText(label, sPt.x + 9, sPt.y - 7);
        }
        drawHandle(s1, "A");
        drawHandle(s2, "B");

        // Connected Anchors markers on axis
        (state.anchors || []).forEach(anc => {
          if (anc.axisId === ax.id && anc.dst) {
            const sAnc = worldToScreenGIS(anc.dst, vp, canvasH);
            ctx.beginPath();
            ctx.arc(sAnc.x, sAnc.y, 10, 0, Math.PI * 2);
            ctx.strokeStyle = ax.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.font = "bold 8px monospace";
            ctx.fillStyle = ax.color;
            ctx.fillText(`⚓ #${anc.id}`, sAnc.x, sAnc.y + 14);
          }
        });

        ctx.restore();
      });

      // 2. Draw active creation rubber-band
      if (state.creatingTestAxis && state.testAxisDrawStart && state.testAxisCursorPt) {
        const sA = worldToScreenGIS(state.testAxisDrawStart, vp, canvasH);
        const sB = worldToScreenGIS(state.testAxisCursorPt, vp, canvasH);
        const dx = state.testAxisCursorPt.x - state.testAxisDrawStart.x;
        const dy = state.testAxisCursorPt.y - state.testAxisDrawStart.y;
        const len = Math.hypot(dx, dy);
        const bearing = computeAxisBearing(state.testAxisDrawStart, state.testAxisCursorPt);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.strokeStyle = "#e040fb";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();

        // Point A handle
        ctx.beginPath();
        ctx.arc(sA.x, sA.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#e040fb";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Midpoint badge
        const midX = (sA.x + sB.x) / 2;
        const midY = (sA.y + sB.y) / 2;
        const label = `${len.toFixed(1)}m • ${bearing.toFixed(1)}°`;
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#e040fb";
        ctx.strokeStyle = "#0f1420";
        ctx.lineWidth = 3;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.strokeText(label, midX, midY - 6);
        ctx.fillText(label, midX, midY - 6);

        ctx.restore();
      }
    }

    // Attach button listeners for Test Axes
    const btnAddTestAxis = document.getElementById("btn-add-test-axis");
    const btnCancelTestAxis = document.getElementById("btn-cancel-test-axis");
    const chkSnapAnchorAxis = document.getElementById("chk-snap-anchor-axis");
    const chkOptAlongAxis = document.getElementById("chk-opt-along-axis");

    if (btnAddTestAxis) {
      btnAddTestAxis.addEventListener("click", () => {
        if (state.creatingTestAxis) cancelAddTestAxis();
        else startAddTestAxis();
      });
    }
    if (btnCancelTestAxis) {
      btnCancelTestAxis.addEventListener("click", cancelAddTestAxis);
    }
    if (chkSnapAnchorAxis) {
      chkSnapAnchorAxis.addEventListener("change", e => {
        state.snapNewAnchorsToAxis = e.target.checked;
      });
    }
    if (chkOptAlongAxis) {
      chkOptAlongAxis.addEventListener("change", e => {
        state.optAlongAxisOnly = e.target.checked;
      });
    }
    const chkOptCdsOnly = document.getElementById("chk-opt-casa-del-sol-only");
    if (chkOptCdsOnly) {
      chkOptCdsOnly.addEventListener("change", e => {
        state.optCasaDelSolOnly = e.target.checked;
        const balanceSlider = document.getElementById("opt-balance-slider");
        const balanceVal = document.getElementById("opt-balance-val");
        if (balanceSlider) {
          balanceSlider.disabled = e.target.checked;
          balanceSlider.style.opacity = e.target.checked ? "0.45" : "1.0";
        }
        if (balanceVal) {
          if (e.target.checked) {
            balanceVal.textContent = "☀️ Casa del Sol Area Only (100%)";
            balanceVal.style.color = "#ffb300";
          } else {
            const val = state.optBalance;
            if (val === 50) balanceVal.textContent = "Balanced (50/50)";
            else if (val < 50) balanceVal.textContent = `Dist Focus (${100 - val}% / ${val}%)`;
            else balanceVal.textContent = `Area Focus (${100 - val}% / ${val}%)`;
            balanceVal.style.color = "";
          }
        }
        updateStatus(`Optimización de áreas Casa del Sol: ${e.target.checked ? "ACTIVADA (100% peso a lotes Casa del Sol, 0% a distancias y master)" : "DESACTIVADA (ponderación estándar balanceada)"}.`);
      });
    }
    // [/SECTION: JS_TEST_AXIS_ENGINE]
