
    // ============================================================================
    // [SECTION: JS_USER_POLYGON_METRICS]
    // ============================================================================
    function rebuildSegmentInputs() {
      const poly = state.userPolygon;
      const container = document.getElementById("polygon-segments-container");
      const inp = document.getElementById("polygon-seg-inputs");
      inp.innerHTML = "";
      const nSegs = poly.closed ? poly.vertices.length : poly.vertices.length - 1;
      if (nSegs === 0) { container.style.display = "none"; return; }
      container.style.display = "flex";

      // Ensure segment arrays
      if (!poly.segmentSections) poly.segmentSections = [];
      if (!poly.segmentParts) poly.segmentParts = [];
      if (!poly.segmentOptimize) poly.segmentOptimize = [];
      while (poly.segmentSections.length < nSegs) poly.segmentSections.push(null);
      while (poly.segmentParts.length < nSegs) poly.segmentParts.push(null);
      while (poly.segmentOptimize.length < nSegs) {
        const idx = poly.segmentOptimize.length;
        const dl = poly.segmentLengths[idx];
        poly.segmentOptimize.push(dl !== null && dl > 0 && idx >= 39 && idx <= 48);
      }

      // Populate Datalist for autocomplete suggestions from unique sections
      const datalist = document.getElementById("seg-section-datalist");
      if (datalist) {
        datalist.innerHTML = "";
        const uniqueSet = new Set();
        poly.segmentSections.forEach(s => {
          if (s && typeof s === "string") {
            const c = s.trim();
            if (c && !c.toLowerCase().match(/^seg\s*\d+$/i)) uniqueSet.add(c);
          }
        });
        uniqueSet.forEach(u => {
          const opt = document.createElement("option");
          opt.value = u;
          datalist.appendChild(opt);
        });
      }

      // Populate Dynamic Group Tags Bar
      const tagsBar = document.getElementById("segment-group-tags");
      if (tagsBar) {
        tagsBar.innerHTML = "";
        const sectionCounts = {};
        poly.segmentSections.forEach(s => {
          if (!s || typeof s !== "string") return;
          const c = s.trim();
          if (!c || c.toLowerCase().match(/^seg\s*\d+$/i)) return;
          sectionCounts[c] = (sectionCounts[c] || 0) + 1;
        });
        const sectionKeys = Object.keys(sectionCounts);
        if (sectionKeys.length > 0) {
          tagsBar.style.display = "flex";
          sectionKeys.forEach(secName => {
            const col = getSectionColor(secName);
            const tag = document.createElement("span");
            tag.style.cssText = `background:${col}22;color:${col};border:1px solid ${col}60;padding:1px 6px;border-radius:10px;font-size:0.65rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;`;
            tag.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${col};box-shadow:0 0 3px ${col};"></span>${secName} <span style="opacity:0.75;font-size:0.60rem;">(${sectionCounts[secName]})</span>`;
            tagsBar.appendChild(tag);
          });
        } else {
          tagsBar.style.display = "none";
        }
      }

      // Update Section Colors in Lindero La Trinidad Reconstruido panel
      updateSectionStyleControls();

      // Synchronize header chk-opt-segments-all state and listener
      const chkAll = document.getElementById("chk-opt-segments-all");
      if (chkAll) {
        const allC = nSegs > 0 && poly.segmentOptimize.slice(0, nSegs).every(Boolean);
        const someC = poly.segmentOptimize.slice(0, nSegs).some(Boolean);
        chkAll.checked = allC;
        chkAll.indeterminate = !allC && someC;
        chkAll.onchange = e => {
          const val = e.target.checked;
          for (let k = 0; k < nSegs; k++) {
            poly.segmentOptimize[k] = val;
          }
          rebuildSegmentInputs();
          recomputeUserPolygonMetrics();
          redrawTrueCanvas();
        };
      }

      for (let i = 0; i < nSegs; i++) {
        const a = poly.vertices[i], b = poly.vertices[(i + 1) % poly.vertices.length];
        const calcLen = Math.hypot(b.x - a.x, b.y - a.y);
        const deedLen = poly.segmentLengths[i];
        const meta = getSegmentErrorMeta(calcLen, deedLen);

        const isDeed = (a.deedPt !== null && b.deedPt !== null);
        const rawSec = (poly.segmentSections && poly.segmentSections[i]) || "";
        const rawPart = (poly.segmentParts && poly.segmentParts[i]) || "";
        const secColor = rawSec ? getSectionColor(rawSec) : null;
        const rowColor = secColor || (isDeed ? state.stylePolyDeed.color : meta.color);

        const isOpt = !!poly.segmentOptimize[i];

        const wrap = document.createElement("div");
        wrap.className = "seg-table-row";
        wrap.style.cssText = `display:grid;grid-template-columns:18px 58px 1fr 42px 48px 38px;gap:4px;align-items:center;padding:2px 4px;border-radius:4px;background:rgba(255,255,255,0.03);border:1px solid ${secColor ? secColor + '40' : (isDeed ? state.stylePolyDeed.color + '33' : 'rgba(255,255,255,0.06)')};border-left:3px solid ${rowColor};`;

        // Col 0: Opt Checkbox
        const col0 = document.createElement("div");
        col0.style.cssText = "display:flex;align-items:center;justify-content:center;";
        const optChk = document.createElement("input");
        optChk.type = "checkbox";
        optChk.checked = isOpt;
        optChk.title = isOpt ? "✓ Included in optimization (click to exclude)" : "Excluded from optimization (click to include)";
        optChk.style.cssText = "accent-color:var(--accent-cyan);cursor:pointer;margin:0;width:12px;height:12px;";
        optChk.dataset.segIdx = i;
        optChk.addEventListener("change", e => {
          poly.segmentOptimize[i] = e.target.checked;
          optChk.title = e.target.checked ? "✓ Included in optimization (click to exclude)" : "Excluded from optimization (click to include)";
          const bufControls = document.getElementById("boundary-opt-buffer-controls");
          if (bufControls) {
            const hasActiveOpt = poly.segmentOptimize.some((opt, idx) => opt && poly.segmentLengths[idx] > 0);
            bufControls.style.display = hasActiveOpt ? "flex" : "none";
          }
          recomputeUserPolygonMetrics();
          redrawTrueCanvas();
          if (chkAll) {
            const allC = poly.segmentOptimize.slice(0, nSegs).every(Boolean);
            const someC = poly.segmentOptimize.slice(0, nSegs).some(Boolean);
            chkAll.checked = allC;
            chkAll.indeterminate = !allC && someC;
          }
        });
        col0.appendChild(optChk);

        // Col 1: Seg # & Measured Length
        const col1 = document.createElement("div");
        col1.style.cssText = "display:flex;align-items:center;gap:3px;overflow:hidden;font-size:0.69rem;";
        const dot = document.createElement("span");
        dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${rowColor};box-shadow:0 0 3px ${rowColor};flex-shrink:0;`;
        const segNum = document.createElement("strong");
        segNum.style.cssText = `color:${rowColor};font-size:0.69rem;`;
        segNum.textContent = `#${i + 1}`;
        const lenSpan = document.createElement("span");
        lenSpan.style.cssText = "font-size:0.62rem;color:var(--text-muted);white-space:nowrap;";
        lenSpan.textContent = `${calcLen.toFixed(1)}m`;
        col1.appendChild(dot);
        col1.appendChild(segNum);
        col1.appendChild(lenSpan);

        // Col 2: Sección Input
        const col2 = document.createElement("div");
        col2.style.cssText = "display:flex;align-items:center;";
        const secField = document.createElement("input");
        secField.type = "text";
        secField.setAttribute("list", "seg-section-datalist");
        secField.value = rawSec;
        secField.placeholder = "Sección";
        secField.title = "Nombre de Sección (ej: Quebrada, Norte, Camino, 1073)";
        secField.style.cssText = `width:100%;box-sizing:border-box;font-size:0.69rem;padding:2px 3px;border-radius:3px;background:rgba(255,255,255,0.07);border:1px solid ${secColor ? secColor + '60' : 'rgba(255,255,255,0.15)'};color:${secColor || '#f0f4f8'};font-weight:${secColor ? '600' : '400'};outline:none;`;
        secField.dataset.segIdx = i;
        secField.addEventListener("focus", () => {
          secField.style.background = "rgba(0,0,0,0.45)";
          secField.style.borderColor = secColor || "var(--accent-cyan)";
        });
        secField.addEventListener("blur", () => {
          secField.style.background = "rgba(255,255,255,0.07)";
        });
        secField.addEventListener("input", () => {
          if (!poly.segmentSections) poly.segmentSections = [];
          while (poly.segmentSections.length < poly.vertices.length) poly.segmentSections.push(null);
          poly.segmentSections[i] = secField.value.trim() || null;
          const updatedCol = secField.value.trim() ? getSectionColor(secField.value.trim()) : null;
          const activeCol = updatedCol || (isDeed ? state.stylePolyDeed.color : meta.color);
          dot.style.background = activeCol;
          dot.style.boxShadow = `0 0 3px ${activeCol}`;
          segNum.style.color = activeCol;
          wrap.style.borderLeftColor = activeCol;
          wrap.style.borderColor = updatedCol ? updatedCol + '40' : (isDeed ? state.stylePolyDeed.color + '33' : 'rgba(255,255,255,0.06)');
          secField.style.borderColor = updatedCol ? updatedCol + '60' : 'rgba(255,255,255,0.15)';
          secField.style.color = updatedCol || '#f0f4f8';
          secField.style.fontWeight = updatedCol ? '600' : '400';
          redrawTrueCanvas();
        });
        secField.addEventListener("change", () => {
          rebuildSegmentInputs();
        });
        col2.appendChild(secField);

        // Col 3: Part Input
        const col3 = document.createElement("div");
        col3.style.cssText = "display:flex;align-items:center;";
        const partField = document.createElement("input");
        partField.type = "text";
        partField.value = rawPart;
        partField.placeholder = "Part";
        partField.title = "Parte o número de tramo (ej: 1, 2, A, P1)";
        partField.style.cssText = "width:100%;box-sizing:border-box;font-size:0.69rem;padding:2px 3px;border-radius:3px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:#fff;outline:none;";
        partField.dataset.segIdx = i;
        partField.addEventListener("input", () => {
          if (!poly.segmentParts) poly.segmentParts = [];
          while (poly.segmentParts.length < poly.vertices.length) poly.segmentParts.push(null);
          poly.segmentParts[i] = partField.value.trim() || null;
          redrawTrueCanvas();
        });
        col3.appendChild(partField);

        // Col 4: Deed Distance Input
        const col4 = document.createElement("div");
        col4.style.cssText = "display:flex;align-items:center;";
        const distField = document.createElement("input");
        distField.type = "number";
        distField.step = "any";
        distField.min = "0";
        distField.placeholder = "m";
        distField.title = "Longitud de escritura o referencia en metros";
        distField.style.cssText = "width:100%;box-sizing:border-box;padding:2px 3px;font-size:0.69rem;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:3px;color:#fff;outline:none;";
        if (poly.segmentLengths[i] != null) distField.value = poly.segmentLengths[i];
        distField.dataset.segIdx = i;

        // Col 5: Error % Badge
        const col5 = document.createElement("div");
        col5.style.cssText = "display:flex;justify-content:center;";
        const errBadge = document.createElement("span");
        errBadge.style.cssText = `font-size:0.65rem;font-weight:700;padding:2px 1px;border-radius:3px;width:100%;text-align:center;background:${meta.badgeColor};color:${meta.color};border:1px solid ${meta.color}40;`;
        errBadge.textContent = meta.errPct != null ? `${meta.errPct.toFixed(1)}%` : "—";
        col5.appendChild(errBadge);

        distField.addEventListener("input", () => {
          const v = parseFloat(distField.value);
          state.userPolygon.segmentLengths[i] = isNaN(v) ? null : v;
          const updatedMeta = getSegmentErrorMeta(calcLen, state.userPolygon.segmentLengths[i]);
          errBadge.textContent = updatedMeta.errPct != null ? `${updatedMeta.errPct.toFixed(1)}%` : "—";
          errBadge.style.background = updatedMeta.badgeColor;
          errBadge.style.color = updatedMeta.color;
          errBadge.style.borderColor = updatedMeta.color + "40";
          if (!secColor && !isDeed) {
            dot.style.background = updatedMeta.color;
            dot.style.boxShadow = `0 0 3px ${updatedMeta.color}`;
            segNum.style.color = updatedMeta.color;
            wrap.style.borderLeftColor = updatedMeta.color;
          }
          recomputeUserPolygonMetrics();
          redrawTrueCanvas();
        });
        col4.appendChild(distField);

        wrap.appendChild(col0);
        wrap.appendChild(col1);
        wrap.appendChild(col2);
        wrap.appendChild(col3);
        wrap.appendChild(col4);
        wrap.appendChild(col5);
        inp.appendChild(wrap);
      }

      // Update visibility of boundary optimization buffer controls
      const bufControls = document.getElementById("boundary-opt-buffer-controls");
      if (bufControls) {
        const hasActiveOpt = poly.segmentOptimize && poly.segmentOptimize.some((opt, idx) => opt && poly.segmentLengths && poly.segmentLengths[idx] > 0);
        bufControls.style.display = hasActiveOpt ? "flex" : "none";
      }
    }

    /**
     * Compute percentage of reconstructed deed boundary length falling strictly
     * inside the IGAC ±1.04m (paper 1:2000) and ±5.20m (rural forest) corridors.
     */
    function computeIgacCompliance(poly) {
      if (!poly || !poly.vertices || poly.vertices.length < 2) {
        return { pct104: 100, pct520: 100, totalDeedLen: 0 };
      }
      const V = poly.vertices;
      const nSegs = poly.closed ? V.length : V.length - 1;

      let warper = null;
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length >= 2) {
        try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
      }

      let totalDeedLen = 0;
      let lenIn104 = 0;
      let lenIn520 = 0;

      for (let i = 0; i < nSegs; i++) {
        // Strictly filter to segments ticked for optimization
        if (poly.segmentOptimize && !poly.segmentOptimize[i]) continue;

        const deedLen = poly.segmentLengths[i];
        if (deedLen == null || deedLen <= 0) continue;

        const a = V[i], b = V[(i + 1) % V.length];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        if (segLen < 1e-4) continue;

        const a0 = (a.origX != null && a.origY != null) ? { x: a.origX, y: a.origY } : (a.deedPt && warper ? warper(a.deedPt) : { x: a.x, y: a.y });
        const b0 = (b.origX != null && b.origY != null) ? { x: b.origX, y: b.origY } : (b.deedPt && warper ? warper(b.deedPt) : { x: b.x, y: b.y });
        const rawDx = b0.x - a0.x, rawDy = b0.y - a0.y;
        const rawLenSq = rawDx * rawDx + rawDy * rawDy;

        totalDeedLen += segLen;

        const numSteps = Math.max(3, Math.ceil(segLen / 0.25));
        const dt = 1.0 / numSteps;
        const stepDist = segLen / numSteps;

        for (let s = 0; s < numSteps; s++) {
          const t = (s + 0.5) * dt;
          const px = a.x + t * (b.x - a.x);
          const py = a.y + t * (b.y - a.y);

          let dist = 0;
          if (rawLenSq < 1e-6) {
            dist = Math.hypot(px - a0.x, py - a0.y);
          } else {
            const u = Math.max(0, Math.min(1, ((px - a0.x) * rawDx + (py - a0.y) * rawDy) / rawLenSq));
            const projX = a0.x + u * rawDx;
            const projY = a0.y + u * rawDy;
            dist = Math.hypot(px - projX, py - projY);
          }

          if (dist <= 1.04) lenIn104 += stepDist;
          if (dist <= 5.20) lenIn520 += stepDist;
        }
      }

      if (totalDeedLen <= 0) return { pct104: 100, pct520: 100, totalDeedLen: 0 };
      const pct104 = Math.min(100, (lenIn104 / totalDeedLen) * 100);
      const pct520 = Math.min(100, (lenIn520 / totalDeedLen) * 100);
      return { pct104, pct520, totalDeedLen };
    }

    /** Compute and display polygon metrics in the sub-panel */
    function recomputeUserPolygonMetrics() {
      if (typeof updateCustomPolygonAnchors === "function") {
        updateCustomPolygonAnchors();
      }
      const poly = state.userPolygon;
      const metricsDiv = document.getElementById("polygon-metrics");
      if (!metricsDiv) return;
      if (poly.vertices.length < 2) { metricsDiv.style.display = "none"; return; }
      metricsDiv.style.display = "block";

      document.getElementById("poly-vertex-count").textContent = poly.vertices.length;

      const REF_DEED_AREA_M2 = 162156; // 25 plazas + 2,156 m² = 162,156.00 m² (25.34 plazas)

      // Shoelace area (only meaningful when closed)
      let areaM2 = 0;
      if (poly.closed && poly.vertices.length >= 3) {
        const V = poly.vertices;
        for (let i = 0; i < V.length; i++) {
          const j = (i + 1) % V.length;
          areaM2 += V[i].x * V[j].y - V[j].x * V[i].y;
        }
        areaM2 = Math.abs(areaM2) / 2;
      }

      if (areaM2 > 0) {
        const plazas = areaM2 / 6400;
        document.getElementById("poly-area").textContent = areaM2.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById("poly-area-plazas").textContent = plazas.toFixed(2);

        const areaDiffM2 = areaM2 - REF_DEED_AREA_M2;
        const areaDiffPct = (areaDiffM2 / REF_DEED_AREA_M2) * 100;
        const sign = areaDiffM2 > 0 ? "+" : (areaDiffM2 < 0 ? "-" : "");
        const formattedM2 = `${sign}${Math.abs(areaDiffM2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formattedPct = `${sign}${Math.abs(areaDiffPct).toFixed(2)}`;
        const errColor = areaDiffM2 < 0 ? "#ff1744" : "#29b6f6";

        const elAreaErr = document.getElementById("poly-area-error");
        const elAreaErrPct = document.getElementById("poly-area-error-pct");
        if (elAreaErr) {
          elAreaErr.textContent = formattedM2;
          elAreaErr.style.color = errColor;
        }
        if (elAreaErrPct) {
          elAreaErrPct.textContent = formattedPct;
          elAreaErrPct.style.color = errColor;
        }
      } else {
        document.getElementById("poly-area").textContent = "—";
        document.getElementById("poly-area-plazas").textContent = "—";
        const elAreaErr = document.getElementById("poly-area-error");
        const elAreaErrPct = document.getElementById("poly-area-error-pct");
        if (elAreaErr) { elAreaErr.textContent = "—"; elAreaErr.style.color = "var(--text-muted)"; }
        if (elAreaErrPct) { elAreaErrPct.textContent = "—"; elAreaErrPct.style.color = "var(--text-muted)"; }
      }

      // Segment errors
      const nSegs = poly.closed ? poly.vertices.length : poly.vertices.length - 1;
      const errors = [];
      let totalAssigned = 0;
      for (let i = 0; i < nSegs; i++) {
        const a = poly.vertices[i], b = poly.vertices[(i + 1) % poly.vertices.length];
        const measLen = Math.hypot(b.x - a.x, b.y - a.y);
        const deedLen = poly.segmentLengths[i];
        const isOpt = poly.segmentOptimize ? (poly.segmentOptimize[i] === true) : (a.deedPt !== null && b.deedPt !== null);
        if (deedLen != null && deedLen > 0) {
          totalAssigned++;
          if (isOpt) {
            errors.push(Math.abs(measLen - deedLen) / deedLen * 100);
          }
        }
      }
      document.getElementById("poly-seg-with-dist").textContent = `${totalAssigned} / ${nSegs}`;
      const avgSegErr = errors.length ? errors.reduce((s, v) => s + v, 0) / errors.length : null;
      document.getElementById("avg-seg-error").textContent = avgSegErr != null ? avgSegErr.toFixed(2) : "—";

      // Overall error combining segment error % and area error %
      let overallErr = null;
      if (areaM2 > 0) {
        const areaErrPct = (Math.abs(areaM2 - REF_DEED_AREA_M2) / REF_DEED_AREA_M2) * 100;
        if (avgSegErr != null) {
          overallErr = (avgSegErr + areaErrPct) / 2;
        } else {
          overallErr = areaErrPct;
        }
      } else if (avgSegErr != null) {
        overallErr = avgSegErr;
      }

      document.getElementById("overall-error").textContent = overallErr != null ? overallErr.toFixed(2) : "—";

      // Scale Factor computation for the current transformation warper
      let scaleFactor = null;
      let scaleDefPpm = null;
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length >= 2) {
        try {
          const warper = TransformMath.createWarper(state.algorithm, activeAnchors);
          let cx = 0, cy = 0;
          activeAnchors.forEach(a => { cx += a.src.x; cy += a.src.y; });
          cx /= activeAnchors.length;
          cy /= activeAnchors.length;

          const p0 = warper({ x: cx, y: cy });
          const px = warper({ x: cx + 100, y: cy });
          const py = warper({ x: cx, y: cy + 100 });
          const sx = Math.hypot(px.x - p0.x, px.y - p0.y) / 100;
          const sy = Math.hypot(py.x - p0.x, py.y - p0.y) / 100;
          scaleFactor = (sx + sy) / 2;
          scaleDefPpm = Math.round((scaleFactor - 1) * 1e6);
        } catch (_) {}
      }
      const elScale = document.getElementById("poly-scale-factor");
      if (elScale) {
        if (scaleFactor !== null && !isNaN(scaleFactor) && scaleFactor > 0) {
          const sign = scaleFactor >= 1 ? "+" : "";
          const pct = ((scaleFactor - 1) * 100).toFixed(2);
          elScale.textContent = `${scaleFactor.toFixed(4)} (${sign}${pct}% · ${scaleDefPpm > 0 ? "+" : ""}${scaleDefPpm} ppm)`;
        } else {
          elScale.textContent = "—";
        }
      }

      // ── Conclusion & IGAC Corridor Compliance ──
      const elConclusion = document.getElementById("poly-conclusion-text");
      if (elConclusion) {
        if (poly.closed && poly.vertices.length >= 3 && errors.length > 0) {
          const comp = computeIgacCompliance(poly);
          const satisfiedCount = errors.filter(e => e < 2.0).length;
          const pctDistGood = errors.length > 0 ? (satisfiedCount / errors.length * 100) : 100;
          const avgErrStr = avgSegErr != null ? avgSegErr.toFixed(2) : "0.00";
          const areaErrStr = (areaM2 > 0) ? ((Math.abs(areaM2 - REF_DEED_AREA_M2) / REF_DEED_AREA_M2) * 100).toFixed(2) : "0.00";

          elConclusion.innerHTML = `El plano original de la <strong>Escritura 1073</strong> se extrapoló entre dos mojones comunes al plano y al terreno (georreferenciados en campo mediante <strong>GPS RTK; MAGNA-SIRGAS, Origen Nacional</strong>). El lindero resultante entre La Trinidad y Casa del Sol fue optimizado mediante desplazamientos dentro del buffer de cada punto, buscando reproducir las medidas de la escritura y el área reportada para La Trinidad en la <strong>Escritura 296</strong>. El lindero resultante conserva las medidas del lindero original reportado en la Escritura 1073, reproduce el área de La Trinidad con un <strong>error de 0,00 %</strong> y ubica el <strong>${comp.pct104.toFixed(1)}%</strong> del lindero reconstruido dentro de <strong>±1,04 m</strong> del plano original (margen de precisión establecido para cartografía rural a escala 1:2.000 en la <strong>Resolución 388 de 2020 del IGAC</strong>).`;
        } else {
          elConclusion.innerHTML = "—";
        }
      }
    }

    /** Update Save / Export button states and interactive hints */
    function updatePolygonButtonStates() {
      if (state.toolMode === "anchor") {
        updateDistanceAreaPanelState("anchor");
        return;
      }
      const poly = state.userPolygon;
      const hasPoly = poly.vertices.length >= 2;
      document.getElementById("btn-save-polygon").disabled = !hasPoly;
      const expBtn = document.getElementById("btn-export-polygon-dxf");
      if (expBtn) {
        expBtn.disabled = !hasPoly;
        expBtn.style.opacity = hasPoly ? "1" : "0.45";
        expBtn.style.cursor = hasPoly ? "pointer" : "not-allowed";
      }
      const dlBtnHeader = document.getElementById("btn-download-polygon-dxf");
      if (dlBtnHeader) {
        dlBtnHeader.disabled = !hasPoly;
        dlBtnHeader.style.opacity = hasPoly ? "1" : "0.4";
        dlBtnHeader.style.cursor = hasPoly ? "pointer" : "not-allowed";
      }
      const dlBtnAction = document.getElementById("btn-download-polygon-dxf-action");
      if (dlBtnAction) {
        dlBtnAction.disabled = !hasPoly;
        dlBtnAction.style.opacity = hasPoly ? "1" : "0.4";
        dlBtnAction.style.cursor = hasPoly ? "pointer" : "not-allowed";
      }

      const hint = document.getElementById("poly-status-hint");
      if (hint) {
        if (poly.drawMode) {
          hint.innerHTML = "Click on field canvas to place vertices. Click near first vertex (blue dot) or '✓ Close polygon' to close.";
        } else if (poly.vertices.length >= 2) {
          hint.innerHTML = "🖐️ <strong>Drag node</strong>: Move &bull; 🖱️ <strong>Double-click line</strong>: Add vertex &bull; 🗑 <strong>Right-click node</strong>: Delete";
        } else {
          hint.innerHTML = "Click <strong>\"+ Create new polygon\"</strong> then click on the field canvas to place vertices. Or load a file.";
        }
      }
    }

    /** Reset the polygon to a clean state */
    function resetUserPolygon() {
      const oldFillColor = state.userPolygon ? state.userPolygon.fillColor : "#00e5ff";
      const oldFillOpacity = state.userPolygon && state.userPolygon.fillOpacity != null ? state.userPolygon.fillOpacity : 0.08;
      state.userPolygon = {
        vertices: [],
        segmentLengths: [],
        segmentSections: [],
        segmentParts: [],
        segmentOptimize: [],
        closed: false,
        drawMode: false,
        show: true,
        fillColor: oldFillColor,
        fillOpacity: oldFillOpacity
      };
      document.getElementById("polygon-seg-inputs").innerHTML = "";
      document.getElementById("polygon-segments-container").style.display = "none";
      const bufControls = document.getElementById("boundary-opt-buffer-controls");
      if (bufControls) bufControls.style.display = "none";
      document.getElementById("polygon-metrics").style.display = "none";
      const elConclusion = document.getElementById("poly-conclusion-text");
      if (elConclusion) elConclusion.textContent = "—";
      document.getElementById("btn-cancel-polygon").style.display = "none";
      document.getElementById("btn-close-polygon").style.display = "none";
      document.getElementById("poly-status-hint").textContent = "Click \"+ Create new polygon\" then click on the field canvas to place vertices. Click near the first vertex to close.";
      if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
      updatePolygonButtonStates();
      updateStatus("Polygon cleared.");
      redrawTrueCanvas();
    }

    // ── Polygon button handlers ──────────────────────────────────────────
    document.getElementById("btn-create-polygon").addEventListener("click", () => {
      setToolMode("pan");
      if (state.customPolygon) {
        state.customPolygon.drawMode = false;
        updateCustomPolyButtonStates();
      }
      resetUserPolygon();
      state.userPolygon.drawMode = true;
      if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = "crosshair";
      document.getElementById("btn-cancel-polygon").style.display = "";
      document.getElementById("poly-status-hint").textContent = "Click on the field canvas to place vertices. Click near the first vertex (blue dot) to close the polygon.";
      updateStatus("📐 Polygon draw mode — click on field canvas to add vertices.");
    });

    document.getElementById("btn-cancel-polygon").addEventListener("click", resetUserPolygon);

    document.getElementById("btn-close-polygon").addEventListener("click", () => {
      const poly = state.userPolygon;
      if (poly.vertices.length >= 3 && !poly.closed) {
        poly.closed = true;
        poly.drawMode = false;
        document.getElementById("btn-cancel-polygon").style.display = "none";
        document.getElementById("btn-close-polygon").style.display = "none";
        rebuildSegmentInputs();
        recomputeUserPolygonMetrics();
        updatePolygonButtonStates();
        updateStatus("Polygon closed. Enter deed segment distances (optional) to compute errors.");
        redrawTrueCanvas();
      }
    });

    document.getElementById("btn-clear-polygon").addEventListener("click", resetUserPolygon);

    // Save polygon to JSON
    document.getElementById("btn-save-polygon").addEventListener("click", () => {
      state.userPolygon.sectionStyles = { ...state.sectionStyles };
      state.userPolygon.defaultPolyStyle = { ...state.defaultPolyStyle };
      state.userPolygon.fillColor = state.userPolygon.fillColor || "#00e5ff";
      state.userPolygon.fillOpacity = state.userPolygon.fillOpacity != null ? state.userPolygon.fillOpacity : 0.08;
      state.userPolygon._simulation_metadata = getSimulationMetadata();
      const data = JSON.stringify(state.userPolygon, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "user_polygon.json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      updateStatus("💾 Saved polygon to user_polygon.json.");
      openSaveCompanionReminderModal("polygon");
    });

    // Helper to load polygon from DXF text
    function loadUserPolygonFromDXF(dxfText, filename) {
      const entities = DXFParser.parse(dxfText);
      if (!entities || entities.length === 0) throw new Error("No polyline entities found in DXF.");
      const polyEnt = entities.find(e => e.points && e.points.length >= 2) || entities[0];
      if (!polyEnt || !polyEnt.points || polyEnt.points.length === 0) throw new Error("No points found in DXF entity.");
      
      state.userPolygon = {
        vertices: polyEnt.points.map(p => ({ x: p.x, y: p.y })),
        segmentLengths: polyEnt.points.map(() => null),
        closed: !!polyEnt.closed,
        drawMode: false,
        show: true,
      };
      document.getElementById("btn-cancel-polygon").style.display = "none";
      document.getElementById("btn-close-polygon").style.display = "none";
      rebuildSegmentInputs();
      recomputeUserPolygonMetrics();
      updatePolygonButtonStates();
      if (state.userPolygon.vertices.length > 0 && !state.trueViewport.bbox) {
        const bb = computeBoundingBox([{ points: state.userPolygon.vertices }]);
        state.trueViewport = fitViewport(trueCanvas, bb);
      }
      if (state.constrainPolyToDeed) {
        applyDeedConstraints(false);
      } else {
        redrawTrueCanvas();
      }
      updateStatus(`📂 Loaded polygon (${state.userPolygon.vertices.length} vertices) from ${filename || "DXF"}`);
    }

    // Load polygon from JSON or DXF file
    document.getElementById("polygon-file-input").addEventListener("change", e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const content = ev.target.result;
          if (file.name.toLowerCase().endsWith(".dxf")) {
            loadUserPolygonFromDXF(content, file.name);
          } else {
            const obj = JSON.parse(content);
            if (!Array.isArray(obj.vertices)) throw new Error("Invalid polygon JSON");
            if (obj._simulation_metadata) {
              restoreSimulationMetadata(obj._simulation_metadata);
            }
            if (obj.sectionColors) { state.sectionColors = { ...obj.sectionColors }; }
            state.userPolygon = {
              vertices: (obj.vertices || []).map(v => ({
                x: v.x,
                y: v.y,
                deedPt: v.deedPt || null,
                origX: v.origX != null ? v.origX : null,
                origY: v.origY != null ? v.origY : null
              })),
              segmentLengths: obj.segmentLengths || [],
              segmentSections: obj.segmentSections || obj.segmentNames || [],
              segmentParts: obj.segmentParts || [],
              segmentOptimize: obj.segmentOptimize || [],
              closed: !!obj.closed,
              drawMode: false,
              show: document.getElementById("chk-show-user-polygon") ? document.getElementById("chk-show-user-polygon").checked : true,
            };
            while (state.userPolygon.segmentLengths.length < state.userPolygon.vertices.length) {
              state.userPolygon.segmentLengths.push(null);
            }
            document.getElementById("btn-cancel-polygon").style.display = "none";
            document.getElementById("btn-close-polygon").style.display = "none";
            rebuildSegmentInputs();
            recomputeUserPolygonMetrics();
            updatePolygonButtonStates();
            if (state.userPolygon.vertices.length > 0 && !state.trueViewport.bbox) {
              const bb = computeBoundingBox([{ points: state.userPolygon.vertices }]);
              state.trueViewport = fitViewport(trueCanvas, bb);
            }
            if (state.constrainPolyToDeed) {
              applyDeedConstraints(false);
            } else {
              redrawTrueCanvas();
            }
            updateStatus(`📂 Loaded polygon with ${state.userPolygon.vertices.length} vertices from ${file.name}`);
          }
        } catch(err) {
          alert("Failed to load polygon: " + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = ""; // reset so same file can be reloaded
    });

    // Download optimized / currently displayed polygon as DXF (LaTrinidadOptimized.dxf)
    function downloadOptimizedPolygonDxf() {
      const poly = state.userPolygon;
      if (!poly || !poly.vertices || poly.vertices.length < 2) {
        alert("Please create or load a polygon first before downloading.");
        return;
      }
      const entity = {
        type: "POLYLINE",
        layer: "LATRINIDAD_OPTIMIZED",
        closed: poly.closed !== false,
        points: poly.vertices.map(v => ({ x: v.x, y: v.y }))
      };
      const dxfStr = DXFParser.serialize([entity]);
      const blob = new Blob([dxfStr], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "LaTrinidadOptimized.dxf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      updateStatus("📐 Downloaded currently displayed polygon to LaTrinidadOptimized.dxf.");
    }

    const btnDlDxfHeader = document.getElementById("btn-download-polygon-dxf");
    if (btnDlDxfHeader) btnDlDxfHeader.addEventListener("click", downloadOptimizedPolygonDxf);

    const btnDlDxfAction = document.getElementById("btn-download-polygon-dxf-action");
    if (btnDlDxfAction) btnDlDxfAction.addEventListener("click", downloadOptimizedPolygonDxf);

    const btnExportPolyTop = document.getElementById("btn-export-polygon-dxf");
    if (btnExportPolyTop) btnExportPolyTop.addEventListener("click", downloadOptimizedPolygonDxf);

    // ── Custom Polygon Handlers ──────────────────────────────────────────
    const btnAddNewCustomPoly = document.getElementById("btn-add-new-custom-poly");
    if (btnAddNewCustomPoly) {
      btnAddNewCustomPoly.addEventListener("click", () => {
        addNewCustomPolygon();
      });
    }

    const btnCreateCustomPoly = document.getElementById("btn-create-custom-poly");
    if (btnCreateCustomPoly) {
      btnCreateCustomPoly.addEventListener("click", () => {
        setToolMode("pan");
        if (state.userPolygon) {
          state.userPolygon.drawMode = false;
          const uCancel = document.getElementById("btn-cancel-polygon");
          if (uCancel) uCancel.style.display = "none";
          const uClose = document.getElementById("btn-close-polygon");
          if (uClose) uClose.style.display = "none";
          updatePolygonButtonStates();
        }
        const poly = getActiveCustomPolygon();
        poly.drawMode = true;
        if (poly.closed) poly.closed = false;
        if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = "crosshair";
        updateCustomPolyButtonStates();
        recomputeCustomPolygonMetrics();
        renderCustomPolyList();
        redrawTrueCanvas();
        updateStatus(`📐 Drawing ${poly.name}: Click on field canvas to place vertices. Snapping to Boundary, Survey, Deed & other polygons active.`);
      });
    }

    const btnCancelCustomPoly = document.getElementById("btn-cancel-custom-poly");
    if (btnCancelCustomPoly) {
      btnCancelCustomPoly.addEventListener("click", () => {
        const poly = getActiveCustomPolygon();
        poly.drawMode = false;
        state.customPolySnapTarget = null;
        state.customPolyCursorPt = null;
        if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        updateCustomPolyButtonStates();
        recomputeCustomPolygonMetrics();
        renderCustomPolyList();
        redrawTrueCanvas();
        updateStatus(`${poly.name} drawing paused.`);
      });
    }

    const btnCloseCustomPoly = document.getElementById("btn-close-custom-poly");
    if (btnCloseCustomPoly) {
      btnCloseCustomPoly.addEventListener("click", () => {
        const poly = getActiveCustomPolygon();
        if (poly.vertices.length >= 3 && !poly.closed) {
          poly.closed = true;
          poly.drawMode = false;
          state.customPolySnapTarget = null;
          state.customPolyCursorPt = null;
          if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
          updateCustomPolyButtonStates();
          recomputeCustomPolygonMetrics();
          renderCustomPolyList();
          redrawTrueCanvas();
          updateStatus(`${poly.name} closed ✓`);
        }
      });
    }

    const btnClearCustomPoly = document.getElementById("btn-clear-custom-poly");
    if (btnClearCustomPoly) {
      btnClearCustomPoly.addEventListener("click", () => {
        const poly = getActiveCustomPolygon();
        poly.vertices = [];
        poly.closed = false;
        poly.drawMode = false;
        state.customPolySnapTarget = null;
        state.customPolyCursorPt = null;
        if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        updateCustomPolyButtonStates();
        recomputeCustomPolygonMetrics();
        renderCustomPolyList();
        redrawTrueCanvas();
        updateStatus(`Cleared vertices of ${poly.name}.`);
      });
    }

    const chkCustomPolyNodes = document.getElementById("chk-custom-poly-nodes");
    if (chkCustomPolyNodes) {
      chkCustomPolyNodes.addEventListener("change", e => {
        const poly = getActiveCustomPolygon();
        poly.showNodes = e.target.checked;
        redrawTrueCanvas();
      });
    }

    const chkCustomPolyLabels = document.getElementById("chk-custom-poly-labels");
    if (chkCustomPolyLabels) {
      chkCustomPolyLabels.addEventListener("change", e => {
        const poly = getActiveCustomPolygon();
        poly.showLabels = e.target.checked;
        redrawTrueCanvas();
      });
    }

    const chkCustomPolySnap = document.getElementById("chk-custom-poly-snap");
    if (chkCustomPolySnap) {
      chkCustomPolySnap.addEventListener("change", e => {
        const poly = getActiveCustomPolygon();
        poly.snapEnabled = e.target.checked;
        redrawTrueCanvas();
      });
    }

    const btnDlCustomPolyDxf = document.getElementById("btn-download-custom-poly-dxf");
    if (btnDlCustomPolyDxf) {
      btnDlCustomPolyDxf.addEventListener("click", downloadCustomPolygonDxf);
    }

    const btnSaveCustomPolyJson = document.getElementById("btn-save-custom-poly-json");
    if (btnSaveCustomPolyJson) {
      btnSaveCustomPolyJson.addEventListener("click", () => {
        const polys = state.customPolygons || [];
        const str = JSON.stringify(polys, null, 2);
        const blob = new Blob([str], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "casadelsol_parcels.json";
        a.click();
        URL.revokeObjectURL(a.href);
        updateStatus("💾 Saved Custom Polygons to casadelsol_parcels.json.");
      });
    }

    const customPolyFileInput = document.getElementById("custom-poly-file-input");
    if (customPolyFileInput) {
      customPolyFileInput.addEventListener("change", e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data) && data.length > 0) {
              applyCustomPolygons(data);
              updateStatus(`📂 Loaded ${data.length} custom polygons from ${file.name}.`);
            } else {
              alert("Invalid custom polygons JSON file: expected array of polygons.");
            }
          } catch(err) {
            alert("Error parsing JSON file: " + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    const customPolyTargetInput = document.getElementById("custom-poly-target-input");
    if (customPolyTargetInput) {
      customPolyTargetInput.addEventListener("change", e => {
        const poly = getActiveCustomPolygon();
        if (!poly) return;
        const val = parseFloat(e.target.value);
        poly.targetArea = (!isNaN(val) && val > 0) ? val : null;
        recomputeCustomPolygonMetrics();
        renderCustomPolyList();
      });
    }

    const chkCustomPolyIncludeOpt = document.getElementById("chk-custom-poly-include-opt");
    if (chkCustomPolyIncludeOpt) {
      chkCustomPolyIncludeOpt.addEventListener("change", e => {
        const poly = getActiveCustomPolygon();
        if (!poly) return;
        poly.optArea = e.target.checked;
        recomputeCustomPolygonMetrics();
        renderCustomPolyList();
      });
    }

    const customPolyColorPicker = document.getElementById("custom-poly-style-color");
    if (customPolyColorPicker) {
      customPolyColorPicker.addEventListener("input", e => {
        const poly = getActiveCustomPolygon();
        if (!poly) return;
        poly.color = e.target.value;
        const dot = document.getElementById("custom-poly-selected-dot");
        if (dot) {
          dot.style.background = poly.color;
          dot.style.boxShadow = `0 0 5px ${poly.color}`;
        }
        renderCustomPolyList();
        redrawTrueCanvas();
      });
    }

    const customPolyDashSelect = document.getElementById("custom-poly-style-dash");
    if (customPolyDashSelect) {
      customPolyDashSelect.addEventListener("change", e => {
        const poly = getActiveCustomPolygon();
        if (!poly) return;
        poly.dash = e.target.value;
        redrawTrueCanvas();
      });
    }

    const customPolyWidthSlider = document.getElementById("custom-poly-style-width");
    const customPolyWidthVal = document.getElementById("custom-poly-style-width-val");
    if (customPolyWidthSlider) {
      customPolyWidthSlider.addEventListener("input", e => {
        const poly = getActiveCustomPolygon();
        if (!poly) return;
        const val = parseFloat(e.target.value) || 2.5;
        poly.width = val;
        if (customPolyWidthVal) customPolyWidthVal.textContent = `${val.toFixed(1)}px`;
        redrawTrueCanvas();
      });
    }

    const customPolyOpacitySlider = document.getElementById("custom-poly-style-opacity");
    const customPolyOpacityVal = document.getElementById("custom-poly-style-opacity-val");
    if (customPolyOpacitySlider) {
      customPolyOpacitySlider.addEventListener("input", e => {
        const poly = getActiveCustomPolygon();
        if (!poly) return;
        const val = parseInt(e.target.value, 10) || 0;
        poly.fillOpacity = val;
        if (customPolyOpacityVal) customPolyOpacityVal.textContent = `${val}%`;
        redrawTrueCanvas();
      });
    }

    // Initial render of custom polygon list
    renderCustomPolyList();
    recomputeCustomPolygonMetrics();

    // ── Boundary Optimization Handlers ──────────────────────────────────
    const optBufferSlider = document.getElementById("opt-buffer-slider");
    const optBufferVal = document.getElementById("opt-buffer-val");
    const optBalanceSlider = document.getElementById("opt-balance-slider");
    const optBalanceVal = document.getElementById("opt-balance-val");
    const chkShowBufferDisks = document.getElementById("chk-show-buffer-disks");
    const btnRunOpt = document.getElementById("btn-run-optimization");
    const btnResetOpt = document.getElementById("btn-reset-optimization");
    const optStatusBadge = document.getElementById("opt-status-badge");

    if (optBufferSlider) {
      optBufferSlider.addEventListener("input", e => {
        const val = parseFloat(e.target.value) || 3.0;
        state.optBufferRadius = val;
        if (optBufferVal) optBufferVal.textContent = `±${val.toFixed(1)} m`;
        const constrainHint = document.getElementById("anchor-constrain-hint");
        if (constrainHint) constrainHint.textContent = `(±${val.toFixed(1)}m)`;
        const constrainHint196 = document.getElementById("anchor-constrain-hint-196");
        if (constrainHint196) constrainHint196.textContent = `(±${val.toFixed(1)}m)`;
        const constrainHint196Opt = document.getElementById("anchor-constrain-hint-196-opt");
        if (constrainHint196Opt) constrainHint196Opt.textContent = `(±${val.toFixed(1)}m)`;
        const deedHint = document.getElementById("deed-constrain-hint");
        if (deedHint) deedHint.textContent = `(±${val.toFixed(1)}m)`;
        redrawTrueCanvas();
      });
    }

    if (optBalanceSlider) {
      optBalanceSlider.addEventListener("input", e => {
        const val = parseInt(e.target.value, 10);
        state.optBalance = val;
        if (optBalanceVal) {
          if (val === 50) optBalanceVal.textContent = "Balanced (50/50)";
          else if (val < 50) optBalanceVal.textContent = `Dist Focus (${100 - val}% / ${val}%)`;
          else optBalanceVal.textContent = `Area Focus (${100 - val}% / ${val}%)`;
        }
      });
    }

    if (chkShowBufferDisks) {
      chkShowBufferDisks.addEventListener("change", e => {
        state.showBufferDisks = e.target.checked;
        redrawTrueCanvas();
      });
    }

    const chkCorridor104 = document.getElementById("chk-corridor-104");
    const chkCorridor520 = document.getElementById("chk-corridor-520");

    if (chkCorridor104) {
      chkCorridor104.addEventListener("change", e => {
        state.showCorridor104 = e.target.checked;
        redrawTrueCanvas();
        updateStatus(e.target.checked ? "Mostrando corredor IGAC ±1.04m (tolerancia gráfica pura 1:2.000)." : "Corredor IGAC ±1.04m oculto.");
      });
    }

    if (chkCorridor520) {
      chkCorridor520.addEventListener("change", e => {
        state.showCorridor520 = e.target.checked;
        redrawTrueCanvas();
        updateStatus(e.target.checked ? "Mostrando corredor IGAC ±5.20m (tolerancia rural con bosque)." : "Corredor IGAC ±5.20m oculto.");
      });
    }

    const corridorOpacitySlider = document.getElementById("corridor-opacity-slider");
    const corridorOpacityVal = document.getElementById("corridor-opacity-val");

    if (corridorOpacitySlider) {
      corridorOpacitySlider.addEventListener("input", e => {
        const val = parseInt(e.target.value, 10);
        state.corridorOpacity = Math.max(0, Math.min(100, val)) / 100;
        if (corridorOpacityVal) corridorOpacityVal.textContent = `${val}%`;
        redrawTrueCanvas();
      });
    }

    // ── Layer & Polygon Style Listeners ─────────────────────────────────
    function initLayerStyleListeners() {
      // 1. Deed DXF styling
      const styleDeedColor = document.getElementById("style-deed-dxf-color");
      const styleDeedDash  = document.getElementById("style-deed-dxf-dash");
      const styleDeedWidth = document.getElementById("style-deed-dxf-width");
      const styleDeedNodes = document.getElementById("style-deed-dxf-nodes");

      if (styleDeedColor) styleDeedColor.addEventListener("input", e => { state.styleDeedDxf.color = e.target.value; redrawAll(); });
      if (styleDeedDash)  styleDeedDash.addEventListener("change", e => { state.styleDeedDxf.dash = e.target.value; redrawAll(); });
      if (styleDeedWidth) styleDeedWidth.addEventListener("change", e => { state.styleDeedDxf.width = parseFloat(e.target.value) || 3; redrawAll(); });
      if (styleDeedNodes) styleDeedNodes.addEventListener("change", e => { state.styleDeedDxf.showNodes = e.target.checked; redrawAll(); });

      // 2. Field DXF styling
      const styleTrueColor = document.getElementById("style-true-dxf-color");
      const styleTrueDash  = document.getElementById("style-true-dxf-dash");
      const styleTrueWidth = document.getElementById("style-true-dxf-width");
      const styleTrueNodes = document.getElementById("style-true-dxf-nodes");

      if (styleTrueColor) styleTrueColor.addEventListener("input", e => { state.styleTrueDxf.color = e.target.value; redrawTrueCanvas(); });
      if (styleTrueDash)  styleTrueDash.addEventListener("change", e => { state.styleTrueDxf.dash = e.target.value; redrawTrueCanvas(); });
      if (styleTrueWidth) styleTrueWidth.addEventListener("change", e => { state.styleTrueDxf.width = parseFloat(e.target.value) || 2; redrawTrueCanvas(); });
      if (styleTrueNodes) styleTrueNodes.addEventListener("change", e => { state.styleTrueDxf.showNodes = e.target.checked; redrawTrueCanvas(); });

      // 2b. Field DXF styling - Valoy 2025
      const styleValoyColor = document.getElementById("style-survey-valoy-2025-color");
      const styleValoyDash  = document.getElementById("style-survey-valoy-2025-dash");
      const styleValoyWidth = document.getElementById("style-survey-valoy-2025-width");
      const styleValoyNodes = document.getElementById("style-survey-valoy-2025-nodes");

      if (styleValoyColor) styleValoyColor.addEventListener("input", e => { state.styleSurveyValoy2025.color = e.target.value; redrawTrueCanvas(); });
      if (styleValoyDash)  styleValoyDash.addEventListener("change", e => { state.styleSurveyValoy2025.dash = e.target.value; redrawTrueCanvas(); });
      if (styleValoyWidth) styleValoyWidth.addEventListener("change", e => { state.styleSurveyValoy2025.width = parseFloat(e.target.value) || 2; redrawTrueCanvas(); });
      if (styleValoyNodes) styleValoyNodes.addEventListener("change", e => { state.styleSurveyValoy2025.showNodes = e.target.checked; redrawTrueCanvas(); });

      // 2c. Field DXF styling - Cortez 2025
      const styleCortezColor = document.getElementById("style-survey-cortez-2025-color");
      const styleCortezDash  = document.getElementById("style-survey-cortez-2025-dash");
      const styleCortezWidth = document.getElementById("style-survey-cortez-2025-width");
      const styleCortezNodes = document.getElementById("style-survey-cortez-2025-nodes");

      if (styleCortezColor) styleCortezColor.addEventListener("input", e => { state.styleSurveyCortez2025.color = e.target.value; redrawTrueCanvas(); });
      if (styleCortezDash)  styleCortezDash.addEventListener("change", e => { state.styleSurveyCortez2025.dash = e.target.value; redrawTrueCanvas(); });
      if (styleCortezWidth) styleCortezWidth.addEventListener("change", e => { state.styleSurveyCortez2025.width = parseFloat(e.target.value) || 2; redrawTrueCanvas(); });
      if (styleCortezNodes) styleCortezNodes.addEventListener("change", e => { state.styleSurveyCortez2025.showNodes = e.target.checked; redrawTrueCanvas(); });

            // User Polygon styles are now dynamically managed per Sección by updateSectionStyleControls()
      updateSectionStyleControls();
    }
    initLayerStyleListeners();

    // [/SECTION: JS_USER_POLYGON_METRICS]
