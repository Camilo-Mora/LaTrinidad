
    // ============================================================================
    // [SECTION: JS_CUSTOM_POLYGONS]
    // ============================================================================
    function getActiveCustomPolygon() {
      if (!state.customPolygons || state.customPolygons.length === 0) {
        state.customPolygons = [{
          id: 'poly_' + Date.now(),
          name: 'Polygon 1',
          color: CUSTOM_POLY_PALETTE[0],
          vertices: [],
          closed: false,
          drawMode: false,
          showNodes: true,
          showLabels: true,
          snapEnabled: true,
          visible: true
        }];
        state.activeCustomPolyIndex = 0;
      }
      if (state.activeCustomPolyIndex < 0 || state.activeCustomPolyIndex >= state.customPolygons.length) {
        state.activeCustomPolyIndex = 0;
      }
      state.customPolygon = state.customPolygons[state.activeCustomPolyIndex];
      return state.customPolygon;
    }

    function setActiveCustomPolygon(index) {
      if (!state.customPolygons || index < 0 || index >= state.customPolygons.length) return;
      if (state.customPolygon && state.customPolygon.drawMode && state.customPolygon.vertices.length < 3) {
        state.customPolygon.drawMode = false;
      }
      state.activeCustomPolyIndex = index;
      state.customPolygon = state.customPolygons[index];
      state.customPolySnapTarget = null;
      state.customPolyCursorPt = null;
      state.hoverCustomPolyNode = null;
      state.hoverCustomPolySegment = null;

      const chkNodes = document.getElementById("chk-custom-poly-nodes");
      const chkLabels = document.getElementById("chk-custom-poly-labels");
      const chkSnap = document.getElementById("chk-custom-poly-snap");
      if (chkNodes) chkNodes.checked = state.customPolygon.showNodes !== false;
      if (chkLabels) chkLabels.checked = state.customPolygon.showLabels !== false;
      if (chkSnap) chkSnap.checked = state.customPolygon.snapEnabled !== false;

      renderCustomPolyList();
      updateCustomPolyButtonStates();
      recomputeCustomPolygonMetrics();
      redrawTrueCanvas();
    }

    function addNewCustomPolygon() {
      if (state.customPolygon) {
        state.customPolygon.drawMode = false;
      }
      const nextIdx = (state.customPolygons || []).length;
      const color = CUSTOM_POLY_PALETTE[nextIdx % CUSTOM_POLY_PALETTE.length];
      const newPoly = {
        id: 'poly_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: `Polygon ${nextIdx + 1}`,
        color: color,
        vertices: [],
        closed: false,
        drawMode: true,
        showNodes: true,
        showLabels: true,
        snapEnabled: true,
        visible: true
      };
      if (!state.customPolygons) state.customPolygons = [];
      state.customPolygons.push(newPoly);
      state.activeCustomPolyIndex = state.customPolygons.length - 1;
      state.customPolygon = newPoly;

      setToolMode("pan");
      if (state.userPolygon) {
        state.userPolygon.drawMode = false;
        updatePolygonButtonStates();
      }
      if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = "crosshair";

      renderCustomPolyList();
      updateCustomPolyButtonStates();
      recomputeCustomPolygonMetrics();
      redrawTrueCanvas();
      updateStatus(`➕ Created ${newPoly.name}. Click on field canvas to place vertices.`);
    }

    function deleteCustomPolygon(index) {
      if (!state.customPolygons || index < 0 || index >= state.customPolygons.length) return;
      const pName = state.customPolygons[index].name;
      if (state.customPolygons.length <= 1) {
        state.customPolygons[0].vertices = [];
        state.customPolygons[0].closed = false;
        state.customPolygons[0].drawMode = false;
        state.customPolygons[0].name = "Polygon 1";
        state.activeCustomPolyIndex = 0;
        state.customPolygon = state.customPolygons[0];
      } else {
        state.customPolygons.splice(index, 1);
        if (state.activeCustomPolyIndex >= state.customPolygons.length) {
          state.activeCustomPolyIndex = state.customPolygons.length - 1;
        }
        state.customPolygon = state.customPolygons[state.activeCustomPolyIndex];
      }
      renderCustomPolyList();
      updateCustomPolyButtonStates();
      recomputeCustomPolygonMetrics();
      redrawTrueCanvas();
      updateStatus(`🗑 Deleted ${pName}.`);
    }

    function toggleCustomPolyVisibility(index) {
      if (!state.customPolygons || index < 0 || index >= state.customPolygons.length) return;
      const p = state.customPolygons[index];
      p.visible = (p.visible === false) ? true : false;
      renderCustomPolyList();
      redrawTrueCanvas();
      updateStatus(`${p.visible ? '👁️ Showing' : '🙈 Hiding'} ${p.name}.`);
    }

    function renderCustomPolyList() {
      const container = document.getElementById("custom-poly-list");
      if (!container) return;
      const polys = state.customPolygons || [];
      container.innerHTML = "";

      polys.forEach((p, idx) => {
        const isActive = (idx === state.activeCustomPolyIndex);
        const row = document.createElement("div");
        row.className = `custom-poly-row ${isActive ? "active" : ""}`;
        if (isActive) {
          row.style.borderColor = p.color;
          row.style.background = hexToRgba(p.color, 0.14);
        }

        let areaM2 = 0;
        if (p.closed && p.vertices && p.vertices.length >= 3) {
          for (let i = 0; i < p.vertices.length; i++) {
            const j = (i + 1) % p.vertices.length;
            areaM2 += p.vertices[i].x * p.vertices[j].y - p.vertices[j].x * p.vertices[i].y;
          }
          areaM2 = Math.abs(areaM2) / 2;
        }

        const areaStr = areaM2 > 0 ? `${areaM2.toLocaleString('en-US', { maximumFractionDigits: 1 })} m²` :
                        (p.drawMode ? "Drawing..." : (p.vertices && p.vertices.length ? `${p.vertices.length} pts` : "Empty"));

        const dot = document.createElement("span");
        dot.className = "custom-poly-color-dot";
        dot.style.background = p.color;
        dot.style.boxShadow = `0 0 6px ${p.color}`;

        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "custom-poly-name-inp";
        inp.value = p.name || `Polygon ${idx + 1}`;
        inp.title = "Click to rename polygon";
        inp.addEventListener("click", e => e.stopPropagation());
        inp.addEventListener("change", e => {
          p.name = e.target.value.trim() || `Polygon ${idx + 1}`;
          recomputeCustomPolygonMetrics();
          redrawTrueCanvas();
        });

        // Visibility Checkbox directly beside lote number (Show or not in main canvas)
        const chkVis = document.createElement("input");
        chkVis.type = "checkbox";
        chkVis.checked = (p.visible !== false);
        chkVis.title = p.visible !== false ? "Visible on main canvas (uncheck to hide)" : "Hidden on main canvas (check to show)";
        chkVis.style.accentColor = p.color || "var(--accent-cyan)";
        chkVis.style.cursor = "pointer";
        chkVis.style.margin = "0 1px 0 0";
        chkVis.style.flexShrink = "0";
        chkVis.addEventListener("click", e => e.stopPropagation());
        chkVis.addEventListener("change", () => {
          toggleCustomPolyVisibility(idx);
        });

        if (p.visible === false) {
          row.style.opacity = "0.55";
        }

        // Opt Checkbox (Tickmark to include in optimization)
        const lblOpt = document.createElement("label");
        lblOpt.style.display = "inline-flex";
        lblOpt.style.alignItems = "center";
        lblOpt.style.gap = "2px";
        lblOpt.style.cursor = "pointer";
        lblOpt.style.margin = "0 3px";
        lblOpt.style.flexShrink = "0";
        lblOpt.title = "Include this parcel in area optimization loss [Tickmark]";

        const chkOpt = document.createElement("input");
        chkOpt.type = "checkbox";
        chkOpt.checked = (p.optArea !== false);
        chkOpt.style.accentColor = "var(--accent-cyan)";
        chkOpt.style.cursor = "pointer";
        chkOpt.style.margin = "0";
        chkOpt.addEventListener("click", e => e.stopPropagation());
        chkOpt.addEventListener("change", e => {
          p.optArea = e.target.checked;
          optTxt.style.color = p.optArea ? "var(--accent-cyan)" : "var(--text-muted)";
          recomputeCustomPolygonMetrics();
        });

        const optTxt = document.createElement("span");
        optTxt.textContent = "Opt";
        optTxt.style.fontSize = "0.61rem";
        optTxt.style.fontWeight = "700";
        optTxt.style.color = (p.optArea !== false) ? "var(--accent-cyan)" : "var(--text-muted)";

        lblOpt.appendChild(chkOpt);
        lblOpt.appendChild(optTxt);

        // Area & Delta % readout
        let deltaHtml = "";
        if (areaM2 > 0 && p.targetArea > 0) {
          const diffPct = ((areaM2 - p.targetArea) / p.targetArea) * 100;
          const absDiff = Math.abs(diffPct);
          const color = absDiff <= 4.0 ? "#00e676" : (absDiff <= 8.0 ? "#ffb300" : "#ff1744");
          const sign = diffPct > 0 ? "+" : "";
          deltaHtml = `<span style="color:${color};font-size:0.62rem;font-weight:700;margin-left:3px;" title="Cabida Target: ${p.targetArea.toFixed(1)} m² (${sign}${diffPct.toFixed(2)}%)">${sign}${diffPct.toFixed(1)}%</span>`;
        }

        const meta = document.createElement("span");
        meta.className = "custom-poly-meta-badge";
        meta.style.color = p.closed ? (isActive ? p.color : "var(--text-muted)") : "#ff9100";
        meta.innerHTML = areaStr + deltaHtml;

        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "custom-poly-btn-icon custom-poly-btn-del";
        btnDel.title = "Delete polygon";
        btnDel.innerHTML = "✕";
        btnDel.addEventListener("click", e => {
          e.stopPropagation();
          deleteCustomPolygon(idx);
        });

        row.appendChild(dot);
        row.appendChild(chkVis);
        row.appendChild(inp);
        row.appendChild(lblOpt);
        row.appendChild(meta);
        row.appendChild(btnDel);

        row.addEventListener("click", () => {
          setActiveCustomPolygon(idx);
        });

        container.appendChild(row);
      });

      const optCdsBadge = document.getElementById("opt-cds-count-badge");
      if (optCdsBadge) {
        const optCount = polys.filter(p => p.optArea !== false && p.targetArea > 0 && p.closed && p.vertices && p.vertices.length >= 3).length;
        optCdsBadge.textContent = `${optCount} ${optCount === 1 ? 'lote' : 'lotes'}`;
      }
    }

    /** Ray-casting point in polygon test */
    function isPointInPolygonGIS(worldPt, vertices) {
      if (!vertices || vertices.length < 3) return false;
      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        const intersect = ((yi > worldPt.y) !== (yj > worldPt.y)) &&
          (worldPt.x < (xj - xi) * (worldPt.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    /** Hit-test inside polygon boundary or near segments to select polygon on click */
    function findCustomPolyAt(mouseX, mouseY, vp, canvasH) {
      const polys = state.customPolygons || [];
      const worldPt = screenToWorldGIS(mouseX, mouseY, vp, canvasH);
      for (let pIdx = polys.length - 1; pIdx >= 0; pIdx--) {
        const p = polys[pIdx];
        if (!p || p.visible === false || !p.closed || !p.vertices || p.vertices.length < 3) continue;
        if (isPointInPolygonGIS(worldPt, p.vertices)) {
          return pIdx;
        }
      }
      return -1;
    }

    /** Hit-test node across all visible custom polygons */
    function findAnyCustomPolyNodeAt(mouseX, mouseY, vp, canvasH) {
      const HIT_RADIUS = 15;
      const polys = state.customPolygons || (state.customPolygon ? [state.customPolygon] : []);
      // Prioritize active polygon
      if (state.customPolygon && state.customPolygon.visible !== false && state.customPolygon.vertices) {
        for (let i = 0; i < state.customPolygon.vertices.length; i++) {
          const sp = worldToScreenGIS(state.customPolygon.vertices[i], vp, canvasH);
          if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) {
            return { polyIdx: state.activeCustomPolyIndex, nodeIdx: i };
          }
        }
      }
      // Check other visible polygons
      for (let pIdx = 0; pIdx < polys.length; pIdx++) {
        if (pIdx === state.activeCustomPolyIndex) continue;
        const p = polys[pIdx];
        if (!p || p.visible === false || !p.vertices) continue;
        for (let i = 0; i < p.vertices.length; i++) {
          const sp = worldToScreenGIS(p.vertices[i], vp, canvasH);
          if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) {
            return { polyIdx: pIdx, nodeIdx: i };
          }
        }
      }
      return null;
    }

    /** Hit-test active custom polygon node (returns index or -1) */
    function findCustomPolyNodeAt(mouseX, mouseY, vp, canvasH, poly = state.customPolygon) {
      if (!poly || !poly.vertices) return -1;
      const HIT_RADIUS = 15;
      for (let i = 0; i < poly.vertices.length; i++) {
        const sp = worldToScreenGIS(poly.vertices[i], vp, canvasH);
        if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) return i;
      }
      return -1;
    }

    /** Hit-test segment across all visible custom polygons */
    function findAnyCustomPolySegmentAt(mouseX, mouseY, vp, canvasH, hitDist = 14) {
      const polys = state.customPolygons || (state.customPolygon ? [state.customPolygon] : []);
      if (state.customPolygon && state.customPolygon.visible !== false && state.customPolygon.vertices && state.customPolygon.vertices.length >= 2) {
        const seg = findCustomPolySegmentAt(mouseX, mouseY, vp, canvasH, hitDist, state.customPolygon);
        if (seg) return { ...seg, polyIdx: state.activeCustomPolyIndex };
      }
      for (let pIdx = 0; pIdx < polys.length; pIdx++) {
        if (pIdx === state.activeCustomPolyIndex) continue;
        const p = polys[pIdx];
        if (!p || p.visible === false || !p.vertices || p.vertices.length < 2) continue;
        const seg = findCustomPolySegmentAt(mouseX, mouseY, vp, canvasH, hitDist, p);
        if (seg) return { ...seg, polyIdx: pIdx };
      }
      return null;
    }

    /** Hit-test custom polygon segments for vertex insertion on double click */
    function findCustomPolySegmentAt(mouseX, mouseY, vp, canvasH, hitDist = 14, poly = state.customPolygon) {
      if (!poly || !poly.vertices || poly.vertices.length < 2) return null;
      const nSegs = poly.closed ? poly.vertices.length : poly.vertices.length - 1;
      let best = null;
      let minDist = hitDist;

      for (let i = 0; i < nSegs; i++) {
        const vA = poly.vertices[i];
        const vB = poly.vertices[(i + 1) % poly.vertices.length];
        const sa = worldToScreenGIS(vA, vp, canvasH);
        const sb = worldToScreenGIS(vB, vp, canvasH);

        const dx = sb.x - sa.x;
        const dy = sb.y - sa.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1e-4) continue;

        const t = ((mouseX - sa.x) * dx + (mouseY - sa.y) * dy) / lenSq;
        const da = Math.hypot(mouseX - sa.x, mouseY - sa.y);
        const db = Math.hypot(mouseX - sb.x, mouseY - sb.y);
        if (da < 14 || db < 14) continue;

        if (t >= 0 && t <= 1) {
          const projX = sa.x + t * dx;
          const projY = sa.y + t * dy;
          const dist = Math.hypot(mouseX - projX, mouseY - projY);
          if (dist <= minDist) {
            minDist = dist;
            best = {
              segIdx: i,
              t: t,
              screenPt: { x: projX, y: projY },
              worldPt: {
                x: vA.x + t * (vB.x - vA.x),
                y: vA.y + t * (vB.y - vA.y),
                anchor: null
              },
              dist: dist
            };
          }
        }
      }
      return best;
    }

    /** Find snapping / anchor target for custom polygon (Boundary, Survey, Deed nodes, Other Polys) */
    function findCustomPolySnapTarget(mouseX, mouseY, vp, canvasH, excludeNodeIdx = -1) {
      const activePoly = getActiveCustomPolygon();
      if (!activePoly || !activePoly.snapEnabled) return null;
      const SNAP_RADIUS = 18; // screen pixels
      let best = null;
      let minDist = SNAP_RADIUS;

      // 1. If in drawMode and active polygon has >= 3 vertices, check vertex 0 to close
      if (activePoly.drawMode && activePoly.vertices.length >= 3) {
        const v0 = activePoly.vertices[0];
        const s0 = worldToScreenGIS(v0, vp, canvasH);
        const d0 = Math.hypot(s0.x - mouseX, s0.y - mouseY);
        if (d0 <= minDist) {
          minDist = d0;
          best = {
            type: 'close',
            worldPt: { x: v0.x, y: v0.y },
            screenPt: s0,
            label: '✓ Close Polygon',
            anchor: null
          };
        }
      }

      // 2. Snap & anchor to Reconstructed Boundary vertices (state.userPolygon.vertices)
      if (state.userPolygon && state.userPolygon.vertices) {
        for (let i = 0; i < state.userPolygon.vertices.length; i++) {
          const bv = state.userPolygon.vertices[i];
          const sp = worldToScreenGIS(bv, vp, canvasH);
          const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
          if (d <= minDist) {
            minDist = d;
            best = {
              type: 'boundary',
              worldPt: { x: bv.x, y: bv.y },
              screenPt: sp,
              label: `⚓ Boundary Vertex #${i + 1}`,
              anchor: { type: 'boundary', vertexIdx: i }
            };
          }
        }
      }

      // 3. Snap & anchor to Field Survey DXF vertices (state.trueEntities)
      if (state.trueEntities && state.trueEntities.length > 0) {
        for (let entIdx = 0; entIdx < state.trueEntities.length; entIdx++) {
          const ent = state.trueEntities[entIdx];
          const pts = ent.points || ent.vertices;
          if (!pts) continue;
          for (let ptIdx = 0; ptIdx < pts.length; ptIdx++) {
            const pt = pts[ptIdx];
            const sp = worldToScreenGIS(pt, vp, canvasH);
            const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
            if (d <= minDist) {
              minDist = d;
              best = {
                type: 'field',
                worldPt: { x: pt.x, y: pt.y },
                screenPt: sp,
                label: `Field Survey #${ptIdx + 1}`,
                anchor: { type: 'field', entIdx, ptIdx }
              };
            }
          }
        }
      }

      // 4. Snap & anchor to Deed DXF vertices warped to GIS space (state.histEntities)
      if (state.histEntities && state.histEntities.length > 0) {
        let warper = null;
        const activeAnchors = getActiveAnchors();
        if (activeAnchors.length >= 2) {
          try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
        }
        for (let entIdx = 0; entIdx < state.histEntities.length; entIdx++) {
          const ent = state.histEntities[entIdx];
          const pts = ent.points || ent.vertices;
          if (!pts) continue;
          for (let ptIdx = 0; ptIdx < pts.length; ptIdx++) {
            const rawPt = pts[ptIdx];
            if (!rawPt || typeof rawPt.x !== "number" || typeof rawPt.y !== "number") continue;
            const wPt = warper ? warper(rawPt) : { x: rawPt.x, y: rawPt.y };
            const sp = worldToScreenGIS(wPt, vp, canvasH);
            const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
            if (d <= minDist) {
              minDist = d;
              best = {
                type: 'deed',
                worldPt: { x: wPt.x, y: wPt.y },
                screenPt: sp,
                label: `📜 Deed Node #${ptIdx + 1}`,
                anchor: { type: 'deed', entIdx, ptIdx, deedPt: { x: rawPt.x, y: rawPt.y } }
              };
            }
          }
        }
      }

      // 5. Snap to other custom polygon vertices
      const allPolys = state.customPolygons || [activePoly];
      for (const op of allPolys) {
        if (!op || !op.vertices) continue;
        const isCurrent = (op === activePoly);
        for (let i = 0; i < op.vertices.length; i++) {
          if (isCurrent && (op.drawMode || i === excludeNodeIdx)) continue;
          const cv = op.vertices[i];
          const sp = worldToScreenGIS(cv, vp, canvasH);
          const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
          if (d <= minDist) {
            minDist = d;
            best = {
              type: 'custom',
              worldPt: { x: cv.x, y: cv.y },
              screenPt: sp,
              label: `${op.name} Node #${i + 1}`,
              anchor: !isCurrent ? { type: 'custom', polyId: op.id, vertexIdx: i } : null
            };
          }
        }
      }

      return best;
    }

    /** Update all anchored custom polygon vertices to follow their host polygon / deed */
    function updateCustomPolygonAnchors() {
      const polys = state.customPolygons || (state.customPolygon ? [state.customPolygon] : []);
      if (!polys || polys.length === 0) return;
      let anyChanged = false;

      let warper = null;
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length >= 2) {
        try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
      }

      for (const poly of polys) {
        if (!poly || !poly.vertices || poly.vertices.length === 0) continue;
        let polyChanged = false;

        for (let i = 0; i < poly.vertices.length; i++) {
          const v = poly.vertices[i];
          if (!v.anchor) continue;

          if (v.anchor.type === 'boundary') {
            const uPoly = state.userPolygon;
            if (uPoly && uPoly.vertices && v.anchor.vertexIdx < uPoly.vertices.length) {
              const target = uPoly.vertices[v.anchor.vertexIdx];
              if (target && (v.x !== target.x || v.y !== target.y)) {
                v.x = target.x;
                v.y = target.y;
                polyChanged = true;
              }
            }
          } else if (v.anchor.type === 'field') {
            const ent = state.trueEntities && state.trueEntities[v.anchor.entIdx];
            const pts = ent ? (ent.points || ent.vertices) : null;
            if (pts && v.anchor.ptIdx < pts.length) {
              const target = pts[v.anchor.ptIdx];
              if (target && (v.x !== target.x || v.y !== target.y)) {
                v.x = target.x;
                v.y = target.y;
                polyChanged = true;
              }
            }
          } else if (v.anchor.type === 'deed') {
            // Deed-anchored vertices are tied to Deed 1073; do not re-warp when Deed 196 is active
            if (state.activeDeed && state.activeDeed !== (v.anchor.deedKey || "1073")) continue;
            let rawPt = null;
            if (state.histEntities && v.anchor.entIdx < state.histEntities.length) {
              const ent = state.histEntities[v.anchor.entIdx];
              const pts = ent ? (ent.points || ent.vertices) : null;
              if (pts && v.anchor.ptIdx < pts.length) {
                rawPt = pts[v.anchor.ptIdx];
              }
            }
            if (!rawPt && v.anchor.deedPt) {
              rawPt = v.anchor.deedPt;
            }
            if (rawPt) {
              const target = warper ? warper(rawPt) : rawPt;
              if (target && (v.x !== target.x || v.y !== target.y)) {
                v.x = target.x;
                v.y = target.y;
                polyChanged = true;
              }
            }
          } else if (v.anchor.type === 'custom') {
            const hostPoly = (state.customPolygons || []).find(p => p.id === v.anchor.polyId);
            if (hostPoly && hostPoly.vertices && v.anchor.vertexIdx < hostPoly.vertices.length) {
              const target = hostPoly.vertices[v.anchor.vertexIdx];
              if (target && (v.x !== target.x || v.y !== target.y)) {
                v.x = target.x;
                v.y = target.y;
                polyChanged = true;
              }
            }
          }
        }

        if (polyChanged) {
          anyChanged = true;
        }
      }

      if (anyChanged) {
        recomputeCustomPolygonMetrics();
        renderCustomPolyList();
      }
    }

    /** Recompute and display metrics for Custom Polygon */
    function recomputeCustomPolygonMetrics() {
      const poly = getActiveCustomPolygon();
      if (!poly) return;

      const titleEl = document.getElementById("custom-poly-selected-title");
      const dotEl = document.getElementById("custom-poly-selected-dot");
      const countEl = document.getElementById("custom-poly-vertex-count");
      const anchorCountEl = document.getElementById("custom-poly-anchored-count");
      const areaEl = document.getElementById("custom-poly-area");
      const areaPlazasEl = document.getElementById("custom-poly-area-plazas");
      const perimEl = document.getElementById("custom-poly-perimeter");
      const totalWrap = document.getElementById("custom-poly-total-summary");
      const totalAreaEl = document.getElementById("custom-poly-total-area");

      if (titleEl) titleEl.textContent = poly.name || "Polygon 1";
      if (dotEl) {
        dotEl.style.background = poly.color || "#ffb300";
        dotEl.style.boxShadow = `0 0 5px ${poly.color || "#ffb300"}`;
      }

      const verts = poly.vertices || [];
      if (countEl) countEl.textContent = verts.length;

      let anchoredCount = 0;
      for (let i = 0; i < verts.length; i++) {
        if (verts[i].anchor) anchoredCount++;
      }
      if (anchorCountEl) anchorCountEl.textContent = anchoredCount;

      // Perimeter
      let perimeter = 0;
      const nSegs = poly.closed ? verts.length : (verts.length > 1 ? verts.length - 1 : 0);
      for (let i = 0; i < nSegs; i++) {
        const a = verts[i], b = verts[(i + 1) % verts.length];
        perimeter += Math.hypot(b.x - a.x, b.y - a.y);
      }
      if (perimEl) {
        perimEl.textContent = perimeter > 0 ? `${perimeter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m` : "—";
      }

      // Area (Shoelace formula)
      let areaM2 = 0;
      if (poly.closed && verts.length >= 3) {
        for (let i = 0; i < verts.length; i++) {
          const j = (i + 1) % verts.length;
          areaM2 += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
        }
        areaM2 = Math.abs(areaM2) / 2;
      }

      if (areaM2 > 0) {
        const plazas = areaM2 / 6400;
        if (areaEl) {
          areaEl.textContent = areaM2.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          areaEl.style.color = poly.color || "#ffb300";
        }
        if (areaPlazasEl) areaPlazasEl.textContent = `(${plazas.toFixed(2)} plazas)`;
      } else {
        if (areaEl) {
          areaEl.textContent = "—";
          areaEl.style.color = poly.color || "#ffb300";
        }
        if (areaPlazasEl) areaPlazasEl.textContent = "(— plazas)";
      }

      // Total Area across all closed custom polygons
      const polys = state.customPolygons || [];
      let totalArea = 0;
      let closedCount = 0;
      for (const p of polys) {
        if (p.closed && p.vertices && p.vertices.length >= 3) {
          closedCount++;
          let a = 0;
          for (let i = 0; i < p.vertices.length; i++) {
            const j = (i + 1) % p.vertices.length;
            a += p.vertices[i].x * p.vertices[j].y - p.vertices[j].x * p.vertices[i].y;
          }
          totalArea += Math.abs(a) / 2;
        }
      }
      if (totalWrap && totalAreaEl) {
        if (polys.length >= 2 && closedCount >= 1) {
          totalWrap.style.display = "flex";
          const tPlazas = totalArea / 6400;
          totalAreaEl.textContent = `${totalArea.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m² (${tPlazas.toFixed(2)} pl)`;
        } else {
          totalWrap.style.display = "none";
        }
      }

      // Target Cabida & Optimization Checkbox in Metrics subpanel
      const targetInput = document.getElementById("custom-poly-target-input");
      const targetDiffRow = document.getElementById("custom-poly-target-diff-row");
      const targetDiffVal = document.getElementById("custom-poly-target-diff-val");
      const chkIncludeOpt = document.getElementById("chk-custom-poly-include-opt");

      if (targetInput) {
        targetInput.value = (poly.targetArea !== undefined && poly.targetArea !== null && poly.targetArea > 0) ? poly.targetArea : "";
      }
      if (chkIncludeOpt) {
        chkIncludeOpt.checked = (poly.optArea !== false);
      }
      if (targetDiffRow && targetDiffVal) {
        if (areaM2 > 0 && poly.targetArea > 0) {
          targetDiffRow.style.display = "flex";
          const diffM2 = areaM2 - poly.targetArea;
          const diffPct = (diffM2 / poly.targetArea) * 100;
          const absDiff = Math.abs(diffPct);
          const color = absDiff <= 4.0 ? "#00e676" : (absDiff <= 8.0 ? "#ffb300" : "#ff1744");
          const sign = diffM2 > 0 ? "+" : "";
          targetDiffVal.style.color = color;
          targetDiffVal.textContent = `${sign}${diffM2.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m² (${sign}${diffPct.toFixed(2)}%)`;
        } else {
          targetDiffRow.style.display = "none";
        }
      }

      // Visual Styling Controls in Metrics subpanel
      const colorPicker = document.getElementById("custom-poly-style-color");
      const dashSelect = document.getElementById("custom-poly-style-dash");
      const widthSlider = document.getElementById("custom-poly-style-width");
      const widthVal = document.getElementById("custom-poly-style-width-val");
      const opacitySlider = document.getElementById("custom-poly-style-opacity");
      const opacityVal = document.getElementById("custom-poly-style-opacity-val");

      if (colorPicker) {
        colorPicker.value = poly.color || "#ffb300";
      }
      if (dashSelect) {
        dashSelect.value = poly.dash || "solid";
      }
      const curWidth = (poly.width !== undefined && poly.width !== null) ? poly.width : 2.5;
      if (widthSlider) widthSlider.value = curWidth;
      if (widthVal) widthVal.textContent = `${curWidth.toFixed(1)}px`;

      const curOpacity = (poly.fillOpacity !== undefined && poly.fillOpacity !== null) ? poly.fillOpacity : 20;
      if (opacitySlider) opacitySlider.value = curOpacity;
      if (opacityVal) opacityVal.textContent = `${curOpacity}%`;
    }

    /** Update button states and status badge for Custom Polygon */
    function updateCustomPolyButtonStates() {
      const poly = getActiveCustomPolygon();
      if (!poly) return;

      const btnCreate = document.getElementById("btn-create-custom-poly");
      const btnCancel = document.getElementById("btn-cancel-custom-poly");
      const btnClose = document.getElementById("btn-close-custom-poly");
      const btnClear = document.getElementById("btn-clear-custom-poly");
      const btnDxf = document.getElementById("btn-download-custom-poly-dxf");
      const badge = document.getElementById("custom-poly-mode-badge");

      const hasVerts = poly.vertices && poly.vertices.length > 0;
      const canClose = poly.drawMode && poly.vertices && poly.vertices.length >= 3;

      if (poly.drawMode) {
        if (btnCreate) btnCreate.style.display = "none";
        if (btnCancel) btnCancel.style.display = "";
        if (btnClose) {
          btnClose.style.display = canClose ? "" : "none";
        }
        if (badge) {
          badge.textContent = `Drawing ${poly.name}...`;
          badge.style.color = "#00e5ff";
          badge.style.background = "rgba(0,229,255,0.15)";
        }
      } else {
        if (btnCreate) {
          btnCreate.style.display = "";
          btnCreate.textContent = hasVerts ? `+ Append to ${poly.name}` : `+ Draw ${poly.name}`;
          btnCreate.style.borderColor = poly.color || "#ffb300";
          btnCreate.style.color = poly.color || "#ffb300";
        }
        if (btnCancel) btnCancel.style.display = "none";
        if (btnClose) btnClose.style.display = "none";
        if (badge) {
          if (poly.closed && hasVerts) {
            badge.textContent = `${poly.name} Closed ✓`;
            badge.style.color = "#00e676";
            badge.style.background = "rgba(0,230,118,0.15)";
          } else if (hasVerts) {
            badge.textContent = `${poly.name} Open`;
            badge.style.color = poly.color || "#ffb300";
            badge.style.background = hexToRgba(poly.color, 0.15);
          } else {
            badge.textContent = `${poly.name} Idle`;
            badge.style.color = "var(--text-muted)";
            badge.style.background = "rgba(255,255,255,0.06)";
          }
        }
      }

      if (btnClear) {
        btnClear.disabled = !hasVerts && !poly.drawMode;
        btnClear.style.opacity = (!hasVerts && !poly.drawMode) ? "0.4" : "1";
      }
      if (btnDxf) {
        const anyHasVerts = (state.customPolygons || []).some(p => p.vertices && p.vertices.length >= 2);
        btnDxf.disabled = !anyHasVerts;
        btnDxf.style.opacity = anyHasVerts ? "1" : "0.4";
        btnDxf.style.cursor = anyHasVerts ? "pointer" : "not-allowed";
      }
    }

    /** Draw snap ring indicator for custom polygon */
    function drawCustomPolySnapTargetOnCanvas(ctx, screenPt, label, snapType) {
      if (!screenPt) return;
      const { x: sx, y: sy } = screenPt;
      ctx.save();

      const ringColor = (snapType === 'deed') ? "#ff1744" :
                        (snapType === 'boundary') ? "#00e5ff" :
                        (snapType === 'field') ? "#00e676" : "#ffb300";

      // Outer ring
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fillStyle = ringColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(sx - 18, sy); ctx.lineTo(sx + 18, sy);
      ctx.moveTo(sx, sy - 18); ctx.lineTo(sx, sy + 18);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Label badge
      if (label) {
        ctx.font = "bold 11px sans-serif";
        const tm = ctx.measureText(label);
        const pw = tm.width + 12;
        const ph = 18;
        const px = sx + 14;
        const py = sy - 22;
        ctx.fillStyle = "rgba(10, 14, 23, 0.92)";
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(px, py, pw, ph, 4);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeRect(px, py, pw, ph);
        }
        ctx.fillStyle = ringColor;
        ctx.fillText(label, px + 6, py + 13);
      }
      ctx.restore();
    }

    /** Draw centroid label badge displaying polygon name, area and deed error statistics on main canvas */
    function drawCustomPolyCentroidLabel(ctx, poly, verts, vp, canvasH, isActive) {
      if (!poly.closed || !verts || verts.length < 3) return;

      let cx = 0, cy = 0;
      for (let i = 0; i < verts.length; i++) { cx += verts[i].x; cy += verts[i].y; }
      cx /= verts.length; cy /= verts.length;
      const sc = worldToScreenGIS({ x: cx, y: cy }, vp, canvasH);

      let aM2 = 0;
      for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        aM2 += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
      }
      aM2 = Math.abs(aM2) / 2;

      const pColor = poly.color || "#ffb300";
      const hasTarget = (poly.targetArea > 0);

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (hasTarget) {
        const diffM2 = aM2 - poly.targetArea;
        const diffPct = (diffM2 / poly.targetArea) * 100;
        const sign = diffM2 >= 0 ? "+" : "";
        const absPct = Math.abs(diffPct);
        const errColor = absPct <= 2.0 ? "#00e676" : (absPct <= 5.0 ? "#ffb300" : "#ff1744");

        const line1 = `${poly.name}: ${aM2.toLocaleString('en-US', { maximumFractionDigits: 1 })} m²`;
        const line2 = `Δ: ${sign}${diffPct.toFixed(2)}% (${sign}${diffM2.toFixed(1)} m²) • Deed: ${poly.targetArea.toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`;

        ctx.font = "bold 9.5px sans-serif";
        const w1 = ctx.measureText(line1).width;
        ctx.font = "bold 8.5px monospace";
        const w2 = ctx.measureText(line2).width;
        const bw = Math.max(w1, w2) + 14;
        const bh = 28;

        ctx.fillStyle = "rgba(8, 12, 22, 0.90)";
        ctx.strokeStyle = isActive ? pColor : errColor;
        ctx.lineWidth = isActive ? 2.0 : 1.2;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(sc.x - bw / 2, sc.y - bh / 2, bw, bh, 4);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(sc.x - bw / 2, sc.y - bh / 2, bw, bh);
          ctx.strokeRect(sc.x - bw / 2, sc.y - bh / 2, bw, bh);
        }

        ctx.font = "bold 9.5px sans-serif";
        ctx.fillStyle = pColor;
        ctx.fillText(line1, sc.x, sc.y - 6);

        ctx.font = "bold 8.5px monospace";
        ctx.fillStyle = errColor;
        ctx.fillText(line2, sc.x, sc.y + 7);
      } else {
        const line1 = `${poly.name}: ${aM2.toLocaleString('en-US', { maximumFractionDigits: 1 })} m²`;
        ctx.font = "bold 9px sans-serif";
        const tw = ctx.measureText(line1).width;
        const bw = tw + 8, bh = 15;

        ctx.fillStyle = "rgba(10, 14, 23, 0.88)";
        ctx.strokeStyle = hexToRgba(pColor, 0.75);
        ctx.lineWidth = isActive ? 1.8 : 1;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(sc.x - bw / 2, sc.y - bh / 2, bw, bh, 3);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(sc.x - bw / 2, sc.y - bh / 2, bw, bh);
          ctx.strokeRect(sc.x - bw / 2, sc.y - bh / 2, bw, bh);
        }
        ctx.fillStyle = pColor;
        ctx.fillText(line1, sc.x, sc.y);
      }
      ctx.restore();
    }

    /** Render Autonomous Custom Polygons on trueCanvas */
    function drawCustomPolygon(ctx, vp, canvasH) {
      const polys = state.customPolygons || (state.customPolygon ? [state.customPolygon] : []);
      if (!polys || polys.length === 0) return;

      const activeIdx = state.activeCustomPolyIndex || 0;
      const activePoly = polys[activeIdx] || state.customPolygon;

      ctx.save();
      ctx.globalAlpha = 1;

      // ── 1. Render all non-active custom polygons ──
      for (let pIdx = 0; pIdx < polys.length; pIdx++) {
        if (pIdx === activeIdx) continue;
        const poly = polys[pIdx];
        if (!poly || poly.visible === false) continue;
        const verts = poly.vertices;
        if (!verts || verts.length === 0) continue;

        const pColor = poly.color || "#ffb300";
        const lineW = (poly.width !== undefined && poly.width !== null) ? poly.width : 2.0;
        const dash = (poly.dash === "dashed") ? [6, 4] : ((poly.dash === "dotted") ? [2, 3] : []);
        const fillAlpha = (poly.fillOpacity !== undefined && poly.fillOpacity !== null) ? (poly.fillOpacity / 100) : 0.12;

        // Fill interior if closed
        if (poly.closed && verts.length >= 3 && fillAlpha > 0) {
          ctx.beginPath();
          const s0 = worldToScreenGIS(verts[0], vp, canvasH);
          ctx.moveTo(s0.x, s0.y);
          for (let i = 1; i < verts.length; i++) {
            const s = worldToScreenGIS(verts[i], vp, canvasH);
            ctx.lineTo(s.x, s.y);
          }
          ctx.closePath();
          ctx.fillStyle = hexToRgba(pColor, fillAlpha);
          ctx.fill();
        }

        // Perimeter stroke
        const nSegs = poly.closed ? verts.length : verts.length - 1;
        if (nSegs > 0) {
          ctx.save();
          ctx.beginPath();
          const s0 = worldToScreenGIS(verts[0], vp, canvasH);
          ctx.moveTo(s0.x, s0.y);
          for (let i = 1; i < verts.length; i++) {
            const s = worldToScreenGIS(verts[i], vp, canvasH);
            ctx.lineTo(s.x, s.y);
          }
          if (poly.closed) ctx.closePath();
          ctx.strokeStyle = pColor;
          ctx.lineWidth = lineW;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.setLineDash(dash);
          ctx.stroke();
          ctx.restore();
        }

        // Centroid name & error statistic badge for closed non-active polygons
        drawCustomPolyCentroidLabel(ctx, poly, verts, vp, canvasH, false);

        // Subtle node dots for non-active polygons
        if (poly.showNodes) {
          for (let i = 0; i < verts.length; i++) {
            const sp = worldToScreenGIS(verts[i], vp, canvasH);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = pColor;
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // ── 2. Render the ACTIVE polygon (with full editing handles) ──
      if (activePoly && activePoly.visible !== false && activePoly.vertices && activePoly.vertices.length > 0) {
        const poly = activePoly;
        const verts = poly.vertices;
        const pColor = poly.color || "#ffb300";
        const lineW = (poly.width !== undefined && poly.width !== null) ? poly.width : 2.8;
        const dash = (poly.dash === "dashed") ? [6, 4] : ((poly.dash === "dotted") ? [2, 3] : []);
        const fillAlpha = (poly.fillOpacity !== undefined && poly.fillOpacity !== null) ? (poly.fillOpacity / 100) : 0.18;

        // Fill interior if closed
        if (poly.closed && verts.length >= 3 && fillAlpha > 0) {
          ctx.beginPath();
          const s0 = worldToScreenGIS(verts[0], vp, canvasH);
          ctx.moveTo(s0.x, s0.y);
          for (let i = 1; i < verts.length; i++) {
            const s = worldToScreenGIS(verts[i], vp, canvasH);
            ctx.lineTo(s.x, s.y);
          }
          ctx.closePath();
          ctx.fillStyle = hexToRgba(pColor, fillAlpha);
          ctx.fill();
        }

        // Stroke perimeter segments with glowing halo
        const nSegs = poly.closed ? verts.length : verts.length - 1;
        if (nSegs > 0) {
          // Glow halo
          ctx.save();
          ctx.beginPath();
          const s0 = worldToScreenGIS(verts[0], vp, canvasH);
          ctx.moveTo(s0.x, s0.y);
          for (let i = 1; i < verts.length; i++) {
            const s = worldToScreenGIS(verts[i], vp, canvasH);
            ctx.lineTo(s.x, s.y);
          }
          if (poly.closed) ctx.closePath();
          ctx.strokeStyle = hexToRgba(pColor, 0.4);
          ctx.lineWidth = lineW + 2.7;
          ctx.stroke();

          // Sharp stroke
          ctx.strokeStyle = pColor;
          ctx.lineWidth = lineW;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.setLineDash(dash);
          ctx.stroke();
          ctx.restore();
        }

        // Rubber-band line from last placed vertex to cursor in drawMode
        if (poly.drawMode && verts.length > 0 && state.customPolyCursorPt) {
          const lastV = verts[verts.length - 1];
          const sLast = worldToScreenGIS(lastV, vp, canvasH);
          const targetPt = state.customPolySnapTarget ? state.customPolySnapTarget.screenPt : state.customPolyCursorPt;

          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.moveTo(sLast.x, sLast.y);
          ctx.lineTo(targetPt.x, targetPt.y);
          ctx.strokeStyle = pColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }

        // Segment length labels
        if (poly.showLabels && nSegs > 0) {
          for (let i = 0; i < nSegs; i++) {
            const a = verts[i], b = verts[(i + 1) % verts.length];
            const sa = worldToScreenGIS(a, vp, canvasH);
            const sb = worldToScreenGIS(b, vp, canvasH);
            const midX = (sa.x + sb.x) / 2;
            const midY = (sa.y + sb.y) / 2;
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const label = `${len.toFixed(1)}m`;

            ctx.save();
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            const tw = ctx.measureText(label).width;
            const bw = tw + 8, bh = 15;
            ctx.fillStyle = "rgba(10, 14, 23, 0.92)";
            ctx.strokeStyle = hexToRgba(pColor, 0.65);
            ctx.lineWidth = 1;
            ctx.fillRect(midX - bw / 2, midY - 8, bw, bh);
            ctx.strokeRect(midX - bw / 2, midY - 8, bw, bh);
            ctx.fillStyle = pColor;
            ctx.fillText(label, midX, midY + 3);
            ctx.restore();
          }
        }

        // Vertex nodes
        if (poly.showNodes || poly.drawMode) {
          for (let i = 0; i < verts.length; i++) {
            const v = verts[i];
            const sp = worldToScreenGIS(v, vp, canvasH);
            const isAnchored = !!v.anchor;
            const isDragging = (state.draggingCustomPolyNode === i);
            const isHovered = (state.hoverCustomPolyNode === i);
            const baseR = 5.5;
            const r = (isHovered || isDragging) ? 8.5 : baseR;

            ctx.save();
            // Hover glow ring
            if (isHovered && !isDragging) {
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, r + 4, 0, Math.PI * 2);
              ctx.strokeStyle = isAnchored ? "rgba(0, 229, 255, 0.75)" : hexToRgba(pColor, 0.75);
              ctx.lineWidth = 1.8;
              ctx.stroke();
            }

            // Closing target ring on vertex #1 in drawMode
            if (poly.drawMode && i === 0 && verts.length >= 3) {
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, 11, 0, Math.PI * 2);
              ctx.strokeStyle = "#00e5ff";
              ctx.lineWidth = 2.2;
              ctx.setLineDash([3, 3]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            if (isAnchored) {
              const ancColor = (v.anchor && v.anchor.type === 'deed') ? "#ff1744" :
                               (v.anchor && v.anchor.type === 'field') ? "#00e676" : "#00e5ff";
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
              ctx.fillStyle = pColor;
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.8;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
              ctx.fillStyle = ancColor;
              ctx.fill();

              ctx.font = "9px sans-serif";
              ctx.fillStyle = ancColor;
              const ancIcon = (v.anchor && v.anchor.type === 'deed') ? "📜" : "⚓";
              ctx.fillText(ancIcon, sp.x + 7, sp.y - 7);
            } else {
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
              ctx.fillStyle = isHovered ? "#ffffff" : pColor;
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }

            if (poly.showLabels) {
              ctx.font = "bold 9px sans-serif";
              ctx.textAlign = "left";
              const idxTxt = `#${i + 1}`;
              const tm = ctx.measureText(idxTxt);
              const pw = tm.width + 6;
              const ph = 12;
              ctx.fillStyle = "rgba(10, 14, 23, 0.85)";
              ctx.fillRect(sp.x + 8, sp.y - 14, pw, ph);
              ctx.strokeStyle = isAnchored ? "#00e5ff" : hexToRgba(pColor, 0.8);
              ctx.lineWidth = 0.8;
              ctx.strokeRect(sp.x + 8, sp.y - 14, pw, ph);
              ctx.fillStyle = isAnchored ? "#00e5ff" : pColor;
              ctx.fillText(idxTxt, sp.x + 11, sp.y - 5);
            }
            ctx.restore();
          }
        }

        // Hover indicator for segment insertion
        if (state.hoverCustomPolySegment && !poly.drawMode && state.draggingCustomPolyNode === null) {
          const hp = state.hoverCustomPolySegment.screenPt;
          ctx.save();
          ctx.beginPath();
          ctx.arc(hp.x, hp.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = pColor;
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(hp.x, hp.y, 10, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(pColor, 0.75);
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.restore();
        }

        // Centroid name & error statistic badge for active polygon
        drawCustomPolyCentroidLabel(ctx, poly, verts, vp, canvasH, true);

        // Area HUD callout box pinned to top-left of the field canvas
        if (poly.closed && verts.length >= 3) {
          let areaM2 = 0;
          for (let i = 0; i < verts.length; i++) {
            const j = (i + 1) % verts.length;
            areaM2 += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
          }
          areaM2 = Math.abs(areaM2) / 2;
          const plazas = areaM2 / 6400;

          const hasTarget = (poly.targetArea > 0);
          let diffM2 = 0, diffPct = 0, sign = "", absPct = 0, errColor = "#00e676";
          if (hasTarget) {
            diffM2 = areaM2 - poly.targetArea;
            diffPct = (diffM2 / poly.targetArea) * 100;
            sign = diffM2 >= 0 ? "+" : "";
            absPct = Math.abs(diffPct);
            errColor = absPct <= 2.0 ? "#00e676" : (absPct <= 5.0 ? "#ffb300" : "#ff1744");
          }

          const txt1 = `📐 ${poly.name}: ${areaM2.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`;
          const txt2 = hasTarget
            ? `Deed: ${poly.targetArea.toLocaleString('en-US', { maximumFractionDigits: 1 })} m² • Δ: ${sign}${diffPct.toFixed(2)}% (${sign}${diffM2.toFixed(1)} m²)`
            : `${plazas.toFixed(2)} plazas (${verts.length} nodes)`;
          const txt3 = hasTarget ? `${plazas.toFixed(2)} plazas (${verts.length} nodes)` : "";

          const hasUserPolyHud = state.userPolygon && state.userPolygon.closed && state.userPolygon.vertices && state.userPolygon.vertices.length >= 3;
          const boxX = 14;
          const boxY = hasUserPolyHud ? 54 : 14;
          const bw = hasTarget ? 240 : 160;
          const bh = hasTarget ? 48 : 34;

          ctx.save();
          ctx.fillStyle = "rgba(6, 9, 16, 0.92)";
          ctx.strokeStyle = hasTarget ? errColor : hexToRgba(pColor, 0.65);
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(boxX, boxY, bw, bh, 6);
          } else {
            ctx.rect(boxX, boxY, bw, bh);
          }
          ctx.fill();
          ctx.stroke();

          const centerX = boxX + bw / 2;
          ctx.fillStyle = pColor;
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillText(txt1, centerX, boxY + 14);

          ctx.fillStyle = hasTarget ? errColor : "#cbd5e1";
          ctx.font = hasTarget ? "bold 9.5px monospace" : "10px sans-serif";
          ctx.fillText(txt2, centerX, boxY + 28);

          if (hasTarget && txt3) {
            ctx.fillStyle = "#94a3b8";
            ctx.font = "9px sans-serif";
            ctx.fillText(txt3, centerX, boxY + 41);
          }
          ctx.restore();
        }
      }

      ctx.restore();
    }

    /** Download custom polygons as DXF */
    function downloadCustomPolygonDxf() {
      const polys = (state.customPolygons || []).filter(p => p.vertices && p.vertices.length >= 2);
      if (polys.length === 0) {
        alert("Please create at least one custom polygon before downloading DXF.");
        return;
      }
      const entities = polys.map((p, idx) => ({
        type: "POLYLINE",
        layer: p.name ? p.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase() : `CUSTOM_POLYGON_${idx + 1}`,
        closed: p.closed !== false,
        points: p.vertices.map(v => ({ x: v.x, y: v.y }))
      }));
      const dxfStr = DXFParser.serialize(entities);
      const blob = new Blob([dxfStr], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = polys.length > 1 ? "custom_polygons.dxf" : "custom_polygon.dxf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      updateStatus(`📐 Downloaded ${polys.length} custom polygon(s) to ${a.download}.`);
    }

            /** Rebuild the per-segment <input> rows in the sidebar */
    // [/SECTION: JS_CUSTOM_POLYGONS]
