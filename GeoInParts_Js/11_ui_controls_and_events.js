
    // ============================================================================
    // [SECTION: JS_UI_CONTROLS_AND_EVENTS]
    // ============================================================================
    const btnOptLegalHelp = document.getElementById("btn-opt-legal-help");
    const modalLegalHelp = document.getElementById("modal-legal-help");
    const btnCloseLegalHelp = document.getElementById("btn-close-legal-help");
    const btnOkLegalHelp = document.getElementById("btn-ok-legal-help");

    function openLegalHelpModal() {
      if (modalLegalHelp) modalLegalHelp.style.display = "flex";
    }
    function closeLegalHelpModal() {
      if (modalLegalHelp) modalLegalHelp.style.display = "none";
    }

    if (btnOptLegalHelp) btnOptLegalHelp.addEventListener("click", openLegalHelpModal);
    if (btnCloseLegalHelp) btnCloseLegalHelp.addEventListener("click", closeLegalHelpModal);
    if (btnOkLegalHelp) btnOkLegalHelp.addEventListener("click", closeLegalHelpModal);
    if (modalLegalHelp) {
      modalLegalHelp.addEventListener("click", e => {
        if (e.target === modalLegalHelp) closeLegalHelpModal();
      });
    }

    // ── Simulation Metadata & Save Companion Reminder Modal ──
    function getSimulationMetadata() {
      const chkOptIgacFilter = document.getElementById("chk-opt-igac-filter");
      return {
        optBufferRadius: typeof state.optBufferRadius === "number" ? state.optBufferRadius : 3.0,
        algorithm: state.algorithm || "SIMILARITY",
        optBalance: typeof state.optBalance === "number" ? state.optBalance : 50,
        optIgacFilter: chkOptIgacFilter ? chkOptIgacFilter.checked : true,
        savedAt: new Date().toISOString()
      };
    }

    function restoreSimulationMetadata(metadata) {
      if (!metadata || typeof metadata !== "object") return [];
      const restored = [];
      if (typeof metadata.optBufferRadius === "number") {
        state.optBufferRadius = metadata.optBufferRadius;
        const s = document.getElementById("opt-buffer-slider");
        const v = document.getElementById("opt-buffer-val");
        if (s) s.value = metadata.optBufferRadius;
        if (v) v.textContent = `±${metadata.optBufferRadius.toFixed(1)} m`;
        const constrainHint = document.getElementById("anchor-constrain-hint");
        if (constrainHint) constrainHint.textContent = `(±${metadata.optBufferRadius.toFixed(1)}m)`;
        const constrainHint196 = document.getElementById("anchor-constrain-hint-196");
        if (constrainHint196) constrainHint196.textContent = `(±${metadata.optBufferRadius.toFixed(1)}m)`;
        const constrainHint196Opt = document.getElementById("anchor-constrain-hint-196-opt");
        if (constrainHint196Opt) constrainHint196Opt.textContent = `(±${metadata.optBufferRadius.toFixed(1)}m)`;
        const deedHint = document.getElementById("deed-constrain-hint");
        if (deedHint) deedHint.textContent = `(±${metadata.optBufferRadius.toFixed(1)}m)`;
        restored.push(`Buffer ±${metadata.optBufferRadius.toFixed(1)}m`);
      }
      if (metadata.algorithm && typeof metadata.algorithm === "string") {
        state.algorithm = metadata.algorithm;
        const a = document.getElementById("algorithm-select");
        if (a) a.value = metadata.algorithm;
        restored.push(`Algoritmo ${metadata.algorithm}`);
      }
      if (typeof metadata.optBalance === "number") {
        state.optBalance = metadata.optBalance;
        const b = document.getElementById("opt-balance-slider");
        const bv = document.getElementById("opt-balance-val");
        if (b) b.value = metadata.optBalance;
        if (bv) {
          const val = metadata.optBalance;
          if (val === 50) bv.textContent = "Balanced (50/50)";
          else if (val < 50) bv.textContent = `Dist Focus (${100 - val}% / ${val}%)`;
          else bv.textContent = `Area Focus (${100 - val}% / ${val}%)`;
        }
        restored.push(`Balance ${metadata.optBalance}%`);
      }
      if (typeof metadata.optIgacFilter === "boolean") {
        state.optIgacFilter = metadata.optIgacFilter;
        const chk = document.getElementById("chk-opt-igac-filter");
        if (chk) chk.checked = metadata.optIgacFilter;
        restored.push(`Filtro IGAC: ${metadata.optIgacFilter ? "ON" : "OFF"}`);
      }
      return restored;
    }

    const modalSaveComp = document.getElementById("modal-save-companion-reminder");
    const btnCloseSaveComp = document.getElementById("btn-close-save-companion");
    const btnCloseSaveCompX = document.getElementById("btn-close-save-companion-x");

    function openSaveCompanionReminderModal(type) {
      if (!modalSaveComp) return;
      const titleEl = document.getElementById("save-companion-modal-title");
      const bodyEl = document.getElementById("save-companion-modal-body");
      if (!bodyEl) return;

      const isPoly = type === "polygon";
      const savedFileName = isPoly ? "user_polygon.json" : "anchors_georectifier.json";
      const neededFileName = isPoly ? "anchors_georectifier.json" : "user_polygon.json";
      const neededLocation = isPoly ? "tabla de Puntos de Control (Anchors)" : "panel 🎨 Lindero La Trinidad Reconstruido";

      if (titleEl) {
        titleEl.innerHTML = `💾 ${savedFileName} Guardado`;
      }

      const bufRadius = (typeof state.optBufferRadius === "number" ? state.optBufferRadius : 3.0).toFixed(1);
      const curAlgo = state.algorithm || "SIMILARITY";
      const curBal = typeof state.optBalance === "number" ? state.optBalance : 50;
      const chkIgac = document.getElementById("chk-opt-igac-filter");
      const curIgac = chkIgac ? chkIgac.checked : true;

      bodyEl.innerHTML = `
        <div style="background:rgba(0,230,118,0.1);border-left:3px solid #00e676;padding:8px 12px;border-radius:4px;color:#e8f5e9;">
          ✅ Se descargó exitosamente <strong>${savedFileName}</strong> con la configuración actual y los parámetros de simulación incrustados.
        </div>
        <div style="background:rgba(255,179,0,0.12);border:1px solid rgba(255,179,0,0.35);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:6px;color:#fff8e1;">
          <div style="font-weight:700;color:#ffb300;font-size:0.80rem;display:flex;align-items:center;gap:6px;">
            ⚠️ Recordatorio para Replicar la Simulación
          </div>
          <div>
            Para replicar con exactitud los mismos resultados numéricos en una sesión futura, recuerda guardar también el archivo complementario:
          </div>
          <div style="background:rgba(0,0,0,0.4);border:1px dashed rgba(255,179,0,0.45);padding:8px 10px;border-radius:4px;font-family:monospace;color:#00e5ff;font-size:0.80rem;">
            📁 ${neededFileName} <span style="color:var(--text-muted);font-family:sans-serif;font-size:0.72rem;">(en el botón "💾 Save JSON" de la ${neededLocation})</span>
          </div>
        </div>
        <div style="color:var(--text-muted);font-size:0.71rem;line-height:1.45;">
          ℹ️ <em>Nota:</em> Al cargar ambos archivos en el futuro, los parámetros de optimización (Buffer ±${bufRadius}m, Algoritmo ${curAlgo}, Balance ${curBal}% y Filtro IGAC: ${curIgac ? "ON" : "OFF"}) se restaurarán de forma totalmente automática.
        </div>
      `;

      modalSaveComp.style.display = "flex";
    }

    function closeSaveCompModal() {
      if (modalSaveComp) modalSaveComp.style.display = "none";
    }

    if (btnCloseSaveComp) btnCloseSaveComp.addEventListener("click", closeSaveCompModal);
    if (btnCloseSaveCompX) btnCloseSaveCompX.addEventListener("click", closeSaveCompModal);
    if (modalSaveComp) {
      modalSaveComp.addEventListener("click", e => {
        if (e.target === modalSaveComp) closeSaveCompModal();
      });
    }

    window.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        if (modalLegalHelp && modalLegalHelp.style.display === "flex") {
          closeLegalHelpModal();
        }
        if (modalSaveComp && modalSaveComp.style.display === "flex") {
          closeSaveCompModal();
        }
        document.querySelectorAll(".opt-hover-wrap.active").forEach(w => w.classList.remove("active"));
      }
    });

    // Optimization Help Bubble click toggle handlers
    document.querySelectorAll(".btn-help-bubble").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const wrap = btn.closest(".opt-hover-wrap");
        if (wrap) {
          const wasActive = wrap.classList.contains("active");
          document.querySelectorAll(".opt-hover-wrap.active").forEach(w => w.classList.remove("active"));
          if (!wasActive) wrap.classList.add("active");
        }
      });
    });
    document.addEventListener("click", () => {
      document.querySelectorAll(".opt-hover-wrap.active").forEach(w => w.classList.remove("active"));
    });

    // Context menu handler on trueCanvas (prevents context menu when clicking nodes or drawing)
    trueCanvas.addEventListener("contextmenu", e => {
      // In Measure Mode: delete clicked measuring marker on right-click, prevent browser context menu
      if (state.measureTool && state.measureTool.active) {
        e.preventDefault();
        const rect = trueCanvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const hitMeasure = findMeasureMarkerAt(sx, sy, state.trueViewport, trueCanvas.height, 14);
        if (hitMeasure) {
          const removedIdx = hitMeasure.idx;
          state.measureTool.points.splice(removedIdx, 1);
          if (state.measureTool.points.length < 3) {
            state.measureTool.closed = false;
          }
          state.hoverMeasureMarker = null;
          state.draggingMeasureMarker = null;
          updateStatus(`📏 Removed Measuring Point #${removedIdx + 1}.`);
          updateMeasureHUD();
          redrawTrueCanvas();
        }
        return;
      }
      // In Anchor Mode: block ALL polygon context menu interactions — anchors have exclusive control
      if (state.toolMode === "anchor") return;
      const rect = trueCanvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const hitMarker = findTempMarkerAt(sx, sy, state.trueViewport, trueCanvas.height);
      if (hitMarker) {
        e.preventDefault();
        return;
      }
      const hitCustom = findCustomPolyNodeAt(sx, sy, state.trueViewport, trueCanvas.height);
      if ((state.customPolygon && state.customPolygon.drawMode) || hitCustom >= 0) {
        e.preventDefault();
        return;
      }
      const hitNode = findUserPolyNodeAt(sx, sy, state.trueViewport, trueCanvas.height);
      if ((state.userPolygon && state.userPolygon.drawMode) || hitNode >= 0) {
        e.preventDefault();
        return;
      }
    });

    // Capture-phase mouse listener for trueCanvas (user polygon creation, node drag & right-click node delete)
    trueCanvas.addEventListener("mousedown", function(e) {
      // In Measure Mode: yield full priority to measuring tool so clicking nodes doesn't trigger node dragging
      if (state.measureTool && state.measureTool.active) {
        return;
      }

      // 0. Squeeze Deed Handles (PowerPoint-style drag)
      if (e.button === 0 && !spacePressed && state.toolMode === "pan" && state.showOverlay && state.showDeedHandles !== false) {
        const rect = trueCanvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const handleHit = findDeedHandleAt(sx, sy, state.trueViewport, trueCanvas.height);
        if (handleHit) {
          e.preventDefault();
          e.stopImmediatePropagation();
          state.activeDeedHandle = handleHit.handle;
          state.deedDragStart = {
            sx, sy,
            initScaleX: state.deedScale.x,
            initScaleY: state.deedScale.y,
            initRatio: (state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0)),
            gizmo: handleHit.gizmo
          };
          trueCanvas.style.cursor = handleHit.cursor;
          updateStatus(`📐 Squeezing Deed (${handleHit.handle.toUpperCase()}) — drag inward or outward to adjust ratio.`);
          return;
        }
      }

      // 0a. Test Axis Creation (Point A & Point B picking)
      if (e.button === 0 && !spacePressed && state.creatingTestAxis) {
        const rect = trueCanvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const worldPt = screenToWorldGIS(sx, sy, state.trueViewport, trueCanvas.height);
        e.preventDefault();
        e.stopImmediatePropagation();

        if (!state.testAxisDrawStart) {
          state.testAxisDrawStart = worldPt;
          state.testAxisCursorPt = worldPt;
          const btnAdd = document.getElementById("btn-add-test-axis");
          if (btnAdd) btnAdd.textContent = "📍 Click Point B...";
          updateStatus(`Point A set at (${worldPt.x.toFixed(1)}, ${worldPt.y.toFixed(1)}). Now click Point B on field canvas to create Test Axis.`);
          redrawTrueCanvas();
        } else {
          addTestAxis(state.testAxisDrawStart, worldPt);
          state.creatingTestAxis = false;
          state.testAxisDrawStart = null;
          state.testAxisCursorPt = null;
          const btnAdd = document.getElementById("btn-add-test-axis");
          const btnCancel = document.getElementById("btn-cancel-test-axis");
          if (btnAdd) { btnAdd.style.background = ""; btnAdd.textContent = "➕ Add Axis"; }
          if (btnCancel) btnCancel.style.display = "none";
          trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
          redrawTrueCanvas();
        }
        return;
      }

      // 0b. Test Axis Handle Dragging (Handles A & B)
      if (e.button === 0 && !spacePressed && (state.testAxes || []).length > 0) {
        const rect = trueCanvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const axisHit = findTestAxisHandleAt(sx, sy, state.trueViewport, trueCanvas.height);
        if (axisHit) {
          e.preventDefault();
          e.stopImmediatePropagation();
          state.draggingTestAxisHandle = { axisId: axisHit.axis.id, handle: axisHit.handle };
          trueCanvas.style.cursor = "move";
          updateStatus(`Dragging ${axisHit.axis.name} Handle ${axisHit.handle.toUpperCase()} — attached anchors slide parametrically with this line.`);
          return;
        }
      }

      // In Anchor Mode: block ALL polygon interactions — move, create, delete — anchors have exclusive control
      if (state.toolMode === "anchor") {
        return;
      }

      const rect = trueCanvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const vp = state.trueViewport, h = trueCanvas.height;
      const poly = state.userPolygon;

      // Right-click on temporary marker: delete it
      if (e.button === 2) {
        const markerHit = findTempMarkerAt(sx, sy, vp, h);
        if (markerHit) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const removed = state.tempMarkers.splice(markerHit.idx, 1)[0];
          updateStatus(`📍 Removed temporary marker ${removed ? removed.label : ""}.`);
          redrawTrueCanvas();
          return;
        }
      }

      // Left-click interactions
      if (e.button === 0 && !spacePressed) {
        // 1. Existing temporary marker drag
        const markerHit = findTempMarkerAt(sx, sy, vp, h);
        if (markerHit) {
          e.preventDefault();
          e.stopImmediatePropagation();
          state.draggingTempMarker = {
            idx: markerHit.idx,
            marker: markerHit.marker,
            origPt: { x: markerHit.marker.x, y: markerHit.marker.y }
          };
          trueCanvas.style.cursor = "move";
          updateStatus(`📍 Dragging Marker ${markerHit.marker.label} — release to place.`);
          redrawTrueCanvas();
          return;
        }

        // 2. Marker tool active: drop a new temporary checkpoint pin
        if (state.markerToolActive) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const pt = screenToWorldGIS(sx, sy, vp, h);
          // Auto-snap to nearby survey vertex if clicked within 18 screen px
          const nearest = findNearestFieldVertex(pt);
          let finalPt = pt;
          if (nearest && nearest.dist * vp.scale <= 18) {
            finalPt = { x: nearest.x, y: nearest.y };
          }
          state.tempMarkerCounter = (state.tempMarkerCounter || 0) + 1;
          const newMarker = {
            id: state.tempMarkerCounter,
            label: `M${state.tempMarkerCounter}`,
            x: finalPt.x,
            y: finalPt.y
          };
          state.tempMarkers.push(newMarker);
          updateStatus(`📍 Placed Marker ${newMarker.label} at (${finalPt.x.toFixed(2)}, ${finalPt.y.toFixed(2)}). Drag to adjust or right-click to delete.`);
          redrawTrueCanvas();
          return;
        }

        // 3. Edit Field Nodes mode: drag field survey vertices
        if (state.editFieldNodes) {
          const fieldHit = findFieldNodeOnTrueCanvas(sx, sy, vp, h);
          if (fieldHit) {
            e.preventDefault();
            e.stopImmediatePropagation();
            state.draggingFieldNode = {
              entIdx: fieldHit.entIdx,
              ptIdx: fieldHit.ptIdx,
              origFieldPt: { x: fieldHit.fieldPt.x, y: fieldHit.fieldPt.y }
            };
            trueCanvas.style.cursor = "move";
            updateStatus(`✏️ Dragging Field Vertex #${fieldHit.ptIdx + 1} — move to adjust position.`);
            redrawTrueCanvas();
            return;
          }
        }

        // 4. Edit Deed Nodes mode: priority drag of deed vertices
        if (state.editDeedNodes) {
          const deedHit = findDeedNodeOnTrueCanvas(sx, sy, vp, h);
          if (deedHit) {
            e.preventDefault();
            e.stopImmediatePropagation();
            state.draggingDeedNode = {
              entIdx: deedHit.entIdx,
              ptIdx: deedHit.ptIdx,
              origDeedPt: { x: deedHit.deedPt.x, y: deedHit.deedPt.y },
              origFieldPt: { x: deedHit.warpedPt.x, y: deedHit.warpedPt.y }
            };
            trueCanvas.style.cursor = "move";
            updateStatus(`✏️ Dragging Deed Vertex #${deedHit.ptIdx + 1} — move on field survey to fine-tune.`);
            redrawTrueCanvas();
            return;
          }
        }
      }

      const is1073 = (!state.activeDeed || state.activeDeed === "1073");
      let hitNode = is1073 ? findUserPolyNodeAt(sx, sy, vp, h) : -1;
      if (is1073 && hitNode < 0 && state.constrainPolyToDeed && poly && poly.vertices) {
        // Also hit-test the deed anchor centers of constrained vertices so clicking either marker grabs the node
        const HIT_RADIUS = 14;
        let warper = null;
        const activeAnchors = getActiveAnchors();
        if (activeAnchors.length >= 2) {
          try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
        }
        for (let i = 0; i < poly.vertices.length; i++) {
          if (!vertexIsDeedConstrained(poly, i)) continue;
          const v = poly.vertices[i];
          const deedPt = v.origX != null && v.origY != null ? { x: v.origX, y: v.origY } : (v.deedPt ? (warper ? warper(v.deedPt) : v.deedPt) : null);
          if (deedPt) {
            const sp = worldToScreenGIS(deedPt, vp, h);
            if (Math.hypot(sp.x - sx, sp.y - sy) <= HIT_RADIUS) {
              hitNode = i;
              break;
            }
          }
        }
      }

      // Hit test custom polygon nodes across all visible polygons
      const anyCustomNodeHit = findAnyCustomPolyNodeAt(sx, sy, vp, h);
      if (anyCustomNodeHit && anyCustomNodeHit.polyIdx !== state.activeCustomPolyIndex) {
        setActiveCustomPolygon(anyCustomNodeHit.polyIdx);
      }
      const customHitNode = findCustomPolyNodeAt(sx, sy, vp, h);

      // Right-click (button === 2): Delete node if hit!
      if (e.button === 2) {
        if (customHitNode >= 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const p = getActiveCustomPolygon();
          p.vertices.splice(customHitNode, 1);
          if (p.vertices.length < 3) p.closed = false;
          recomputeCustomPolygonMetrics();
          updateCustomPolyButtonStates();
          renderCustomPolyList();
          redrawTrueCanvas();
          updateStatus(`🗑 Deleted vertex #${customHitNode + 1} from ${p.name}. Remaining: ${p.vertices.length}`);
          return;
        }
        if (state.customPolygon && state.customPolygon.drawMode && state.customPolygon.vertices.length > 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          state.customPolygon.vertices.pop();
          recomputeCustomPolygonMetrics();
          updateCustomPolyButtonStates();
          renderCustomPolyList();
          redrawTrueCanvas();
          updateStatus(`↩ Undid last vertex. Remaining: ${state.customPolygon.vertices.length}`);
          return;
        }
        if (hitNode >= 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          poly.vertices.splice(hitNode, 1);
          poly.segmentLengths.splice(hitNode, 1);
          if (poly.vertices.length < 3) poly.closed = false;
          rebuildSegmentInputs();
          recomputeUserPolygonMetrics();
          updatePolygonButtonStates();
          redrawTrueCanvas();
          updateStatus(`🗑 Deleted polygon vertex #${hitNode + 1}. Remaining: ${poly.vertices.length}`);
          return;
        }

        const customSegHit = (typeof findAnyCustomPolySegmentAt === "function") ? findAnyCustomPolySegmentAt(sx, sy, vp, h, 12) : null;
        if (customSegHit) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const p = customSegHit.poly;
          if (p && p.vertices && p.vertices.length >= 2) {
            if (p.closed) {
              const verts = p.vertices;
              const newVerts = [];
              for (let k = 0; k < verts.length; k++) {
                newVerts.push(verts[(customSegHit.segIdx + 1 + k) % verts.length]);
              }
              p.vertices = newVerts;
              p.closed = false;
              updateStatus(`✂️ Deleted line segment. Opened '${p.name}' into Polyline.`);
            } else {
              if (customSegHit.segIdx === p.vertices.length - 2) {
                p.vertices.pop();
                updateStatus(`✂️ Deleted last line segment from '${p.name}'.`);
              } else if (customSegHit.segIdx === 0) {
                p.vertices.shift();
                updateStatus(`✂️ Deleted first line segment from '${p.name}'.`);
              }
            }
            recomputeCustomPolygonMetrics();
            updateCustomPolyButtonStates();
            renderCustomPolyList();
            redrawTrueCanvas();
            return;
          }
        }
        return;
      }

      // Left-click (button === 0):
      if (e.button === 0 && !spacePressed) {
        // If in custom polygon draw mode -> add vertex, close, or drag placed vertex
        if (state.customPolygon && state.customPolygon.drawMode) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const p = state.customPolygon;
          // Check if clicking near first vertex to close (when >= 3 vertices)
          if (p.vertices.length >= 3) {
            const first = worldToScreenGIS(p.vertices[0], vp, h);
            if (Math.hypot(first.x - sx, first.y - sy) <= 18) {
              p.closed = true;
              p.drawMode = false;
              state.customPolySnapTarget = null;
              state.customPolyCursorPt = null;
              if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
              updateCustomPolyButtonStates();
              recomputeCustomPolygonMetrics();
              renderCustomPolyList();
              updateStatus(`${p.name} closed ✓`);
              redrawTrueCanvas();
              return;
            }
          }
          // If clicking an existing custom node (other than closing vertex 0) -> drag it!
          if (customHitNode >= 0) {
            state.draggingCustomPolyNode = customHitNode;
            trueCanvas.style.cursor = "move";
            updateStatus(`🖐️ Dragging ${p.name} Vertex #${customHitNode + 1} — release to place.`);
            return;
          }

          // Otherwise place a new vertex / marker
          const snap = state.customPolySnapTarget || findCustomPolySnapTarget(sx, sy, vp, h);
          const rawPt = screenToWorldGIS(sx, sy, vp, h);
          const worldPt = snap ? {
            x: snap.worldPt.x,
            y: snap.worldPt.y,
            anchor: snap.anchor ? { ...snap.anchor } : null
          } : {
            x: rawPt.x,
            y: rawPt.y,
            anchor: null
          };
          p.vertices.push(worldPt);
          const n = p.vertices.length;
          recomputeCustomPolygonMetrics();
          updateCustomPolyButtonStates();
          renderCustomPolyList();
          updateStatus(`${p.name} vertex #${n} placed${worldPt.anchor ? " (" + (worldPt.anchor.type === 'deed' ? "Deed 📜" : "anchored ⚓") + ")" : ""}. ${n >= 3 ? "Click near vertex #1 or '✓ Close' to close." : "Continue adding vertices."}`);
          redrawTrueCanvas();
          return;
        }

        // When NOT in drawMode: if clicking existing custom polygon node -> start dragging it!
        if (customHitNode >= 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          state.draggingCustomPolyNode = customHitNode;
          trueCanvas.style.cursor = "move";
          updateStatus(`🖐️ Dragging ${state.customPolygon.name} Vertex #${customHitNode + 1} — release to place.`);
          return;
        }

        // When NOT in drawMode: check clicking inside or on any custom polygon to select it for editing
        const clickedPolyIdx = findCustomPolyAt(sx, sy, vp, h);
        if (clickedPolyIdx >= 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (clickedPolyIdx !== state.activeCustomPolyIndex) {
            setActiveCustomPolygon(clickedPolyIdx);
            updateStatus(`📐 Selected ${state.customPolygons[clickedPolyIdx].name} for editing.`);
          }
          return;
        }
        const clickedSeg = findAnyCustomPolySegmentAt(sx, sy, vp, h, 12);
        if (clickedSeg) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (clickedSeg.polyIdx !== state.activeCustomPolyIndex) {
            setActiveCustomPolygon(clickedSeg.polyIdx);
            updateStatus(`📐 Selected ${state.customPolygons[clickedSeg.polyIdx].name} for editing.`);
          }
          return;
        }

        // If clicking an existing node -> start dragging it!
        if (hitNode >= 0) {
          e.stopImmediatePropagation();
          state.draggingUserPolyNode = hitNode;
          const curVertex = poly.vertices[hitNode];
          const isConstrained = is1073 && state.constrainPolyToDeed && state.optBufferRadius > 0 && vertexIsDeedConstrained(poly, hitNode);
          if (isConstrained && curVertex && curVertex.deedPt) {
            let warper = null;
            const activeAnchors = getActiveAnchors();
            if (activeAnchors.length >= 2) {
              try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
            }
            const w = warper ? warper(curVertex.deedPt) : { x: curVertex.deedPt.x, y: curVertex.deedPt.y };
            curVertex.origX = w.x;
            curVertex.origY = w.y;
            state.dragDeedAnchor = { x: w.x, y: w.y, deedPt: curVertex.deedPt };
          } else {
            state.dragDeedAnchor = null;
          }
          trueCanvas.style.cursor = "move";
          return;
        }

        // If in polygon draw mode -> add a node or close
        if (poly && poly.drawMode) {
          e.stopImmediatePropagation();
          // Check if clicking near first vertex -> close polygon
          if (poly.vertices.length >= 3) {
            const first = worldToScreenGIS(poly.vertices[0], vp, h);
            if (Math.hypot(first.x - sx, first.y - sy) <= POLY_SNAP_RADIUS + 4) {
              poly.closed = true;
              poly.drawMode = false;
              document.getElementById("btn-cancel-polygon").style.display = "none";
              document.getElementById("btn-close-polygon").style.display = "none";
              trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
              rebuildSegmentInputs();
              recomputeUserPolygonMetrics();
              updatePolygonButtonStates();
              updateStatus("Polygon closed ✓ Enter deed segment distances to compute errors.");
              redrawTrueCanvas();
              return;
            }
          }

          // Snapped vertex or raw GIS click
          const snap = state.currentSnapTarget || getPolygonSnapTarget(sx, sy, vp, h);
          const rawPt = screenToWorldGIS(sx, sy, vp, h);
          const worldPt = snap ? {
            x: snap.worldPt.x,
            y: snap.worldPt.y,
            deedPt: snap.deedPt ? { x: snap.deedPt.x, y: snap.deedPt.y } : null
          } : {
            x: rawPt.x,
            y: rawPt.y,
            deedPt: null
          };

          poly.vertices.push(worldPt);
          while (poly.segmentLengths.length < poly.vertices.length) poly.segmentLengths.push(null);

          const n = poly.vertices.length;
          if (n >= 2) {
            rebuildSegmentInputs();
            document.getElementById("btn-close-polygon").style.display = n >= 3 ? "" : "none";
          }
          recomputeUserPolygonMetrics();
          updatePolygonButtonStates();
          updateStatus(`Polygon vertex ${n} placed${snap ? (snap.deedPt ? " (anchored to Deed DXF)" : " (snapped)") : ""}. ${n >= 3 ? "Click near first vertex or '✓ Close polygon' to close." : "Continue adding vertices."}`);
          redrawTrueCanvas();
        }
      }
    }, true);

    function updateDistanceAreaPanelState(mode) {
      const isPan = (mode === "pan");
      const body = document.getElementById("body-distance-area");
      const badge = document.getElementById("distance-area-mode-badge");
      if (body) {
        body.style.pointerEvents = isPan ? "auto" : "none";
        body.style.opacity = isPan ? "1" : "0.40";
        body.style.filter = isPan ? "none" : "grayscale(0.35)";
        body.style.transition = "opacity 0.2s ease, filter 0.2s ease";
      }
      if (badge) {
        badge.textContent = isPan ? "Active" : "(Pan mode only)";
        badge.style.color = isPan ? "#00e676" : "var(--text-muted)";
        badge.style.background = isPan ? "rgba(0,230,118,0.12)" : "rgba(255,255,255,0.06)";
      }
      const panel = document.getElementById("panel-distance-area");
      if (panel) {
        const inputs = panel.querySelectorAll("button, input");
        inputs.forEach(el => {
          if (!isPan) {
            el.disabled = true;
          } else {
            if (el.id === "btn-save-polygon") {
              el.disabled = !(state.userPolygon && state.userPolygon.vertices && state.userPolygon.vertices.length >= 2);
            } else if (el.id === "btn-close-polygon") {
              el.disabled = !(state.userPolygon && state.userPolygon.drawMode && state.userPolygon.vertices && state.userPolygon.vertices.length >= 3);
            } else {
              el.disabled = false;
            }
          }
        });
      }
    }

    // Tool mode switcher
    function setToolMode(mode) {
      state.toolMode = mode;
      btnModePan.classList.toggle("active", mode==="pan");
      btnModeAnchor.classList.toggle("active", mode==="anchor");
      updateDistanceAreaPanelState(mode);
      if (mode === "anchor") {
        state.draggingUserPolyNode = null;
        state.dragDeedAnchor = null;
        state.currentSnapTarget = null;
        if (state.userPolygon && state.userPolygon.drawMode) {
          state.userPolygon.drawMode = false;
          const btnCancel = document.getElementById("btn-cancel-polygon");
          if (btnCancel) btnCancel.style.display = "none";
          const btnClose = document.getElementById("btn-close-polygon");
          if (btnClose) btnClose.style.display = "none";
        }
        redrawTrueCanvas();
      }
      const cursor = (mode==="anchor") ? "crosshair" : ((state.userPolygon && state.userPolygon.drawMode) ? "crosshair" : "grab");
      histCanvas.style.cursor = mode==="pan" ? "grab" : "crosshair";
      trueCanvas.style.cursor = cursor;
      updateStatus(mode==="pan"
        ? "🖐️ Pan Mode — drag to move. Scroll to zoom. Polygon nodes can be created, moved, or deleted."
        : "🎯 Anchor Mode — only anchors are active. Click/drag anchor pairs. Polygon vertices cannot be moved or altered.");
    }

    btnModePan.addEventListener("click",    () => setToolMode("pan"));
    btnModeAnchor.addEventListener("click", () => setToolMode("anchor"));

    // ── Panel Display Options (Deeds: 196 / 1073, Field, Control Panel) ──
    const histCard = document.getElementById("hist-card");
    const trueCard = document.getElementById("true-card");
    const sidebarEl = document.getElementById("sidebar");
    const chkShowDeed196 = document.getElementById("chk-show-deed-196");
    const chkShowDeed1073 = document.getElementById("chk-show-deed-1073");
    const chkShowField = document.getElementById("chk-show-field");
    const chkShowControlPanel = document.getElementById("chk-show-control-panel");

    function isAnyDeedOpen() {
      return (chkShowDeed196 && chkShowDeed196.checked) || (chkShowDeed1073 && chkShowDeed1073.checked);
    }

    function saveCurrentDeedState() {
      const current = state.activeDeed || "1073";
      if (!state.deeds) state.deeds = {};
      if (!state.deeds[current]) state.deeds[current] = {};
      state.deeds[current].histEntities = state.histEntities ? [...state.histEntities] : [];
      state.deeds[current].histFileName = state.histFileName;
      state.deeds[current].histPdfDoc = state.histPdfDoc;
      state.deeds[current].histPdfBlob = state.histPdfBlob;
      state.deeds[current].histPdfCanvas = state.histPdfCanvas;
      state.deeds[current].histPdfW = state.histPdfW;
      state.deeds[current].histPdfH = state.histPdfH;
      state.deeds[current].anchors = state.anchors ? JSON.parse(JSON.stringify(state.anchors)) : [];
      state.deeds[current].histViewport = state.histViewport ? { ...state.histViewport } : null;
      state.deeds[current].testAxes = state.testAxes ? JSON.parse(JSON.stringify(state.testAxes)) : [];
      state.deeds[current].algorithm = state.algorithm;
      if (current === "1073" && state.userPolygon && state.userPolygon.vertices) {
        state.deeds["1073"].userPolygon = JSON.parse(JSON.stringify(state.userPolygon));
      }
    }

    async function switchDeed(deedKey, openWindow = null) {
      if (state.activeDeed && state.activeDeed !== deedKey) {
        saveCurrentDeedState();
      }
      state.activeDeed = deedKey;
      if (!state.deeds) state.deeds = {};

      const d = state.deeds[deedKey];
      const hasData = d && d.histEntities && d.histEntities.length > 0;

      if (hasData) {
        state.histEntities = d.histEntities ? [...d.histEntities] : [];
        state.histFileName = d.histFileName || (deedKey === "196" ? "Polygon_Escritura196.dxf" : "Polygon_Escritura1073_FerminSuarez.dxf");
        state.histPdfDoc = d.histPdfDoc || null;
        state.histPdfBlob = d.histPdfBlob || null;
        state.histPdfCanvas = d.histPdfCanvas || null;
        state.histPdfW = d.histPdfW || 0;
        state.histPdfH = d.histPdfH || 0;
        state.anchors = d.anchors ? JSON.parse(JSON.stringify(d.anchors)) : [];
        state.testAxes = d.testAxes ? JSON.parse(JSON.stringify(d.testAxes)) : [];
        if (d.histViewport) state.histViewport = { ...d.histViewport };
        state.algorithm = d.algorithm || (deedKey === "196" ? "TPS" : "SIMILARITY");
        if (deedKey === "1073" && d.userPolygon) {
          state.userPolygon = JSON.parse(JSON.stringify(d.userPolygon));
          if (typeof recomputeUserPolygonMetrics === "function") recomputeUserPolygonMetrics();
          if (typeof rebuildSegmentInputs === "function") rebuildSegmentInputs();
        }
      } else {
        updateStatus(`⏳ Loading Escritura ${deedKey} assets (DXF, anchors, PDF)…`);
        if (deedKey === "196") {
          state.algorithm = "TPS";
          state.histFileName = "Polygon_Escritura196.dxf";
          try {
            const text = await fetchText("Polygon_Escritura196.dxf");
            state.histEntities = DXFParser.parse(text);
          } catch (e) {
            console.warn("Failed loading Polygon_Escritura196.dxf:", e);
          }
          try {
            const ancText = await fetchText("anchors_196.json");
            const ancList = JSON.parse(ancText);
            const rawList = Array.isArray(ancList) ? ancList : (ancList.anchors || []);
            applyAnchors(rawList.map(a => ({ ...a, showLabel: a.showLabel === true })));
          } catch (e) {
            console.warn("Failed loading anchors_196.json:", e);
          }
          try {
            const blob = await fetchBlob("Mapa196_ErrorCasaDelSol.pdf");
            await loadPdfFromBlob(blob);
          } catch (e) {
            console.warn("Failed loading Mapa196_ErrorCasaDelSol.pdf:", e);
          }
          saveCurrentDeedState();
        } else {
          state.algorithm = "SIMILARITY";
          state.histFileName = "Polygon_Escritura1073_FerminSuarez.dxf";
          try {
            const text = await fetchText("Polygon_Escritura1073_FerminSuarez.dxf");
            state.histEntities = DXFParser.parse(text);
          } catch (e) {}
          try {
            const ancText = await fetchText("anchors_georectifier.json");
            const ancData = JSON.parse(ancText);
            const list = Array.isArray(ancData) ? ancData : (ancData.anchors || ancData.anchors1073 || []);
            applyAnchors(list);
          } catch (e) {}
          try {
            const blob = await fetchBlob("Mapa1073_FerminSuarez.pdf");
            await loadPdfFromBlob(blob);
          } catch (e) {}
          saveCurrentDeedState();
        }
      }

      // Update UI Elements
      const histTitle = document.getElementById("hist-view-title");
      if (histTitle) {
        histTitle.textContent = `📜 Escritura ${deedKey} (PDF + DXF)`;
      }
      const lblToolbarDeed = document.getElementById("lbl-toolbar-active-deed");
      if (lblToolbarDeed) {
        lblToolbarDeed.textContent = `📜 Escritura ${deedKey}`;
      }
      const algoSelect196 = document.getElementById("algorithm-select-196");
      if (algoSelect196) {
        algoSelect196.value = (deedKey === "196") ? state.algorithm : "TPS";
      }
      const mainAlgo = document.getElementById("algorithm-select");
      if (mainAlgo) {
        mainAlgo.value = state.algorithm;
      }
      if (histStatus) {
        histStatus.textContent = `Deed ${deedKey} ready (${state.histEntities.length} ents)`;
      }

      const chk196 = document.getElementById("chk-show-deed-196");
      const chk1073 = document.getElementById("chk-show-deed-1073");
      const chkCluster1073 = document.getElementById("chk-cluster-1073");
      const chkCluster196 = document.getElementById("chk-cluster-196");
      const clusterBody1073 = document.getElementById("cluster-body-1073");
      const clusterBody196 = document.getElementById("cluster-body-196");
      const btnToggleCluster1073 = document.getElementById("btn-toggle-cluster-1073");
      const btnToggleCluster196 = document.getElementById("btn-toggle-cluster-196");

      // Activate field overlays for the active analysis (image/PDF, DXF, anchors)
      state.showWarpedPdf = true;
      state.showWarpedDxf = true;
      const chkShowWarpedPdf = document.getElementById("chk-show-warped-pdf");
      if (chkShowWarpedPdf) chkShowWarpedPdf.checked = true;
      const chkShowWarpedDxf = document.getElementById("chk-show-warped-dxf");
      if (chkShowWarpedDxf) chkShowWarpedDxf.checked = true;

      // The historical deed window (histCard) should be opened ONLY with the checkbox at the top of the app.
      // - openWindow === true: explicitly open deed window (user clicked top toolbar checkbox)
      // - openWindow === false: explicitly close deed window (user unchecked top toolbar)
      // - openWindow === null: preserve current deed window state (control panel cluster checkbox clicked)
      const isTopDeedWindowAlreadyOpen = !!(state.showDeedPanel && histCard && !histCard.classList.contains("hidden"));
      const shouldDisplayDeedWindow = (openWindow === true) || (openWindow === null && isTopDeedWindowAlreadyOpen);

      if (shouldDisplayDeedWindow) {
        if (chk196) chk196.checked = (deedKey === "196");
        if (chk1073) chk1073.checked = (deedKey === "1073");
        state.showDeedPanel = true;
        if (histCard) histCard.classList.remove("hidden");
      } else {
        if (chk196) chk196.checked = false;
        if (chk1073) chk1073.checked = false;
        state.showDeedPanel = false;
        if (histCard) histCard.classList.add("hidden");
      }

      // Synchronize master sidebar clusters (Lindero 1073 vs Escritura 196)
      if (deedKey === "196") {
        if (chkCluster196) chkCluster196.checked = true;
        if (chkCluster1073) chkCluster1073.checked = false;
        if (clusterBody196) clusterBody196.style.display = "flex";
        if (clusterBody1073) clusterBody1073.style.display = "none";
        if (btnToggleCluster196) btnToggleCluster196.textContent = "▼";
        if (btnToggleCluster1073) btnToggleCluster1073.textContent = "▶";
        const bodyAnchors196 = document.getElementById("body-anchors-196");
        const btnToggleAnchors196 = document.getElementById("btn-toggle-panel-anchors-196");
        const bodyOpt196 = document.getElementById("body-optimization-196");
        const btnToggleOpt196 = document.getElementById("btn-toggle-panel-opt-196");
        if (bodyAnchors196) bodyAnchors196.style.display = "flex";
        if (btnToggleAnchors196) btnToggleAnchors196.textContent = "▼";
        if (bodyOpt196) bodyOpt196.style.display = "flex";
        if (btnToggleOpt196) btnToggleOpt196.textContent = "▼";
        const cluster196 = document.getElementById("cluster-reconstruction-196");
        if (cluster196) {
          cluster196.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        if (typeof recompute196Metrics === "function") recompute196Metrics();
      } else {
        if (chkCluster1073) chkCluster1073.checked = true;
        if (chkCluster196) chkCluster196.checked = false;
        if (clusterBody1073) clusterBody1073.style.display = "flex";
        if (clusterBody196) clusterBody196.style.display = "none";
        if (btnToggleCluster1073) btnToggleCluster1073.textContent = "▼";
        if (btnToggleCluster196) btnToggleCluster196.textContent = "▶";
        const cluster1073 = document.getElementById("cluster-reconstruction-1073");
        if (cluster1073) {
          cluster1073.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }

      if (typeof updateCustomPolygonAnchors === "function") {
        updateCustomPolygonAnchors();
      }
      if (typeof updateAnalyticsUI === "function") {
        updateAnalyticsUI();
      }

      if (deedKey === "1073" && state.constrainPolyToDeed && typeof applyDeedConstraints === "function") {
        applyDeedConstraints(false);
      }

      setTimeout(() => {
        resizeCanvases();
        if (state.showDeedPanel) {
          fitHistoricalView();
        }
        redrawAll();
        updateStatus(`⚡ Active deed: Escritura ${deedKey} (${state.histEntities.length} ents, ${getActiveAnchors().length} active anchors).`);
      }, 40);
    }

    function applyPanelVisibility() {
      const showDeed = isAnyDeedOpen();
      const showField = chkShowField ? chkShowField.checked : true;
      const showControl = chkShowControlPanel ? chkShowControlPanel.checked : true;

      state.showDeedPanel = showDeed;
      state.showFieldPanel = showField;
      state.sidebarVisible = showControl;

      if (histCard) histCard.classList.toggle("hidden", !showDeed);
      if (trueCard) trueCard.classList.toggle("hidden", !showField);
      if (sidebarEl) sidebarEl.classList.toggle("collapsed", !showControl);

      const activeList = [];
      if (showDeed) activeList.push(`Deed ${state.activeDeed || "1073"}`);
      if (showField) activeList.push("Field");
      if (showControl) activeList.push("Control Panel");
      updateStatus(`Panels active: ${activeList.join(" + ")}.`);

      setTimeout(() => {
        resizeCanvases();
        if (showDeed) {
          fitHistoricalView();
        }
        redrawAll();
      }, 50);
    }

    if (chkShowDeed196) {
      chkShowDeed196.addEventListener("change", async () => {
        if (chkShowDeed196.checked) {
          if (chkShowDeed1073) chkShowDeed1073.checked = false;
          await switchDeed("196", true);
        } else {
          if (!chkShowField || !chkShowField.checked) {
            chkShowDeed196.checked = true;
            updateStatus("At least one map panel (Deed or Field) must remain active.");
            return;
          }
          state.showDeedPanel = false;
          if (histCard) histCard.classList.add("hidden");
          applyPanelVisibility();
        }
      });
    }

    if (chkShowDeed1073) {
      chkShowDeed1073.addEventListener("change", async () => {
        if (chkShowDeed1073.checked) {
          if (chkShowDeed196) chkShowDeed196.checked = false;
          await switchDeed("1073", true);
        } else {
          if (!chkShowField || !chkShowField.checked) {
            chkShowDeed1073.checked = true;
            updateStatus("At least one map panel (Deed or Field) must remain active.");
            return;
          }
          state.showDeedPanel = false;
          if (histCard) histCard.classList.add("hidden");
          applyPanelVisibility();
        }
      });
    }

    if (chkShowField) {
      chkShowField.addEventListener("change", () => {
        // Enforce at least one map panel is open
        if (!chkShowField.checked && !isAnyDeedOpen()) {
          chkShowField.checked = true;
          updateStatus("At least one map panel (Deed or Field) must remain active.");
          return;
        }
        applyPanelVisibility();
      });
    }

    if (chkShowControlPanel) {
      chkShowControlPanel.addEventListener("change", () => {
        applyPanelVisibility();
      });
    }

    // ── Master Reconstruction Clusters (1073 vs 196 Mutual Exclusion & Toggles) ──
    const chkCluster1073 = document.getElementById("chk-cluster-1073");
    const chkCluster196 = document.getElementById("chk-cluster-196");
    const clusterBody1073 = document.getElementById("cluster-body-1073");
    const clusterBody196 = document.getElementById("cluster-body-196");
    const btnToggleCluster1073 = document.getElementById("btn-toggle-cluster-1073");
    const btnToggleCluster196 = document.getElementById("btn-toggle-cluster-196");

    if (chkCluster1073) {
      chkCluster1073.addEventListener("change", async () => {
        if (chkCluster1073.checked) {
          if (chkCluster196) chkCluster196.checked = false;
          await switchDeed("1073", null);
        } else {
          if (clusterBody1073) clusterBody1073.style.display = "none";
          if (btnToggleCluster1073) btnToggleCluster1073.textContent = "▶";
          state.showWarpedPdf = false;
          state.showWarpedDxf = false;
          const chkShowWarpedPdf = document.getElementById("chk-show-warped-pdf");
          if (chkShowWarpedPdf) chkShowWarpedPdf.checked = false;
          const chkShowWarpedDxf = document.getElementById("chk-show-warped-dxf");
          if (chkShowWarpedDxf) chkShowWarpedDxf.checked = false;
          redrawAll();
        }
      });
    }

    if (chkCluster196) {
      chkCluster196.addEventListener("change", async () => {
        if (chkCluster196.checked) {
          if (chkCluster1073) chkCluster1073.checked = false;
          await switchDeed("196", null);
        } else {
          if (clusterBody196) clusterBody196.style.display = "none";
          if (btnToggleCluster196) btnToggleCluster196.textContent = "▶";
          state.showWarpedPdf = false;
          state.showWarpedDxf = false;
          const chkShowWarpedPdf = document.getElementById("chk-show-warped-pdf");
          if (chkShowWarpedPdf) chkShowWarpedPdf.checked = false;
          const chkShowWarpedDxf = document.getElementById("chk-show-warped-dxf");
          if (chkShowWarpedDxf) chkShowWarpedDxf.checked = false;
          redrawAll();
        }
      });
    }

    if (btnToggleCluster1073) {
      btnToggleCluster1073.addEventListener("click", () => {
        if (!clusterBody1073) return;
        const isHidden = clusterBody1073.style.display === "none";
        clusterBody1073.style.display = isHidden ? "flex" : "none";
        btnToggleCluster1073.textContent = isHidden ? "▼" : "▶";
      });
    }

    if (btnToggleCluster196) {
      btnToggleCluster196.addEventListener("click", () => {
        if (!clusterBody196) return;
        const isHidden = clusterBody196.style.display === "none";
        clusterBody196.style.display = isHidden ? "flex" : "none";
        btnToggleCluster196.textContent = isHidden ? "▼" : "▶";
      });
    }

    // Note: Sub-panels inside Cluster 196 (#panel-anchors-196, #panel-optimization-196)
    // are .panel-card elements and are unified under the global accordion handler below.

    // Segment Labels toggle handlers (synchronized across header and sidebar)
    const chkShowSegLabels = document.getElementById("chk-show-seg-labels");
    const chkShowSegLabelsSidebar = document.getElementById("chk-show-seg-labels-sidebar");

    // Initialize labels as hidden by default
    state.showSegmentLabels = false;
    if (chkShowSegLabels) chkShowSegLabels.checked = false;
    if (chkShowSegLabelsSidebar) chkShowSegLabelsSidebar.checked = false;

    function setSegmentLabelsVisible(visible) {
      state.showSegmentLabels = visible;
      if (chkShowSegLabels) chkShowSegLabels.checked = visible;
      if (chkShowSegLabelsSidebar) chkShowSegLabelsSidebar.checked = visible;
      if (!visible) {
        const tooltipEl = document.getElementById("segment-label-tooltip");
        if (tooltipEl) tooltipEl.style.display = "none";
      }
      redrawTrueCanvas();
      updateStatus(visible ? "Segment labels enabled on field canvas." : "Segment labels hidden.");
    }

    if (chkShowSegLabels) {
      chkShowSegLabels.addEventListener("change", e => setSegmentLabelsVisible(e.target.checked));
    }
    if (chkShowSegLabelsSidebar) {
      chkShowSegLabelsSidebar.addEventListener("change", e => setSegmentLabelsVisible(e.target.checked));
    }

    // ── DEED & FIELD COMPACT CONTROLS & MARKER TOOL ─────────────────────
    function toggleEditDeedNodes(force) {
      state.editDeedNodes = (typeof force === "boolean") ? force : !state.editDeedNodes;
      if (state.editDeedNodes) {
        if (state.editFieldNodes) toggleEditFieldNodes(false);
        if (state.markerToolActive) toggleMarkerTool(false);
        if (state.measureTool && state.measureTool.active) toggleMeasureTool(false);
        updateStatus("✏️ Edit Deed Nodes active — drag deed vertices on field canvas (or deed map) to adjust alignment.");
      } else {
        state.hoverDeedNode = null;
        state.draggingDeedNode = null;
        state.draggingDeedNodeHist = null;
        updateStatus("Edit Deed Nodes disabled.");
      }
      document.querySelectorAll(".btn-edit-deed").forEach(btn => btn.classList.toggle("active", state.editDeedNodes));
      redrawAll();
    }

    function toggleEditFieldNodes(force) {
      state.editFieldNodes = (typeof force === "boolean") ? force : !state.editFieldNodes;
      if (state.editFieldNodes) {
        if (state.editDeedNodes) toggleEditDeedNodes(false);
        if (state.markerToolActive) toggleMarkerTool(false);
        if (state.measureTool && state.measureTool.active) toggleMeasureTool(false);
        updateStatus("✏️ Edit Field Nodes active — drag field vertices on field canvas to fine-tune geometry.");
      } else {
        state.hoverFieldNode = null;
        state.draggingFieldNode = null;
        updateStatus("Edit Field Nodes disabled.");
      }
      document.querySelectorAll(".btn-edit-field").forEach(btn => btn.classList.toggle("active", state.editFieldNodes));
      redrawTrueCanvas();
    }

    function toggleMarkerTool(force) {
      state.markerToolActive = (typeof force === "boolean") ? force : !state.markerToolActive;
      if (state.markerToolActive) {
        if (state.measureTool && state.measureTool.active) toggleMeasureTool(false);
        if (state.editDeedNodes) toggleEditDeedNodes(false);
        if (state.editFieldNodes) toggleEditFieldNodes(false);
        trueCanvas.style.cursor = "crosshair";
        updateStatus("📍 Temporary Marker tool active — click anywhere on the field canvas to place a checkpoint pin. Drag to adjust, right-click to delete.");
      } else {
        state.draggingTempMarker = null;
        state.hoverTempMarker = null;
        trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        updateStatus("Marker tool disabled.");
      }
      const btn = document.getElementById("btn-marker-tool");
      if (btn) btn.classList.toggle("active", state.markerToolActive);
      redrawTrueCanvas();
    }

    function saveDeedDxf() {
      if (!state.histEntities || state.histEntities.length === 0) {
        alert("No deed DXF loaded to save.");
        return;
      }
      const txt = DXFParser.serialize(state.histEntities);
      const blob = new Blob([txt], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = state.histFileName || "Polygon_Escritura1073_FerminSuarez.dxf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      updateStatus(`💾 Saved modified Deed DXF to '${a.download}'.`);
    }

    function saveFieldDxf() {
      if (!state.trueEntities || state.trueEntities.length === 0) {
        alert("No Field DXF loaded to save.");
        return;
      }
      const txt = DXFParser.serialize(state.trueEntities);
      const blob = new Blob([txt], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = state.trueFileName || "Field.dxf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      updateStatus(`💾 Saved modified Field DXF to '${a.download}'.`);
    }

    // Attach listeners to Deed/Field compact tool buttons & Marker button
    document.querySelectorAll(".btn-edit-deed").forEach(btn => btn.addEventListener("click", () => toggleEditDeedNodes()));
    document.querySelectorAll(".btn-save-deed").forEach(btn => btn.addEventListener("click", saveDeedDxf));
    document.querySelectorAll(".btn-edit-field").forEach(btn => btn.addEventListener("click", () => toggleEditFieldNodes()));
    document.querySelectorAll(".btn-save-field").forEach(btn => btn.addEventListener("click", saveFieldDxf));

    const btnMarkerTool = document.getElementById("btn-marker-tool");
    if (btnMarkerTool) btnMarkerTool.addEventListener("click", () => toggleMarkerTool());

    window.addEventListener("keydown", e => {
      if (e.target.tagName==="INPUT"||e.target.tagName==="SELECT") return;
      if (e.code==="KeyP") setToolMode("pan");
      if (e.code==="KeyA") setToolMode("anchor");
      if (e.code==="KeyM") toggleMeasureTool();
      if (e.code==="Escape") {
        if (state.customPolygon && state.customPolygon.drawMode) {
          const btnCancel = document.getElementById("btn-cancel-custom-poly");
          if (btnCancel) btnCancel.click();
        } else if (state.userPolygon && state.userPolygon.drawMode) {
          const btnCancel = document.getElementById("btn-cancel-polygon");
          if (btnCancel) btnCancel.click();
        } else if (state.measureTool && state.measureTool.active) {
          if (state.measureTool.points.length > 0) {
            clearMeasureTool();
          } else {
            toggleMeasureTool(false);
          }
        } else if (state.markerToolActive) {
          toggleMarkerTool(false);
        } else if (state.editFieldNodes) {
          toggleEditFieldNodes(false);
        } else if (state.editDeedNodes) {
          toggleEditDeedNodes(false);
        }
      }
      if (e.code==="Enter" || e.code==="NumpadEnter") {
        if (state.customPolygon && state.customPolygon.drawMode && state.customPolygon.vertices && state.customPolygon.vertices.length >= 3) {
          const btnClose = document.getElementById("btn-close-custom-poly");
          if (btnClose) btnClose.click();
        } else if (state.userPolygon && state.userPolygon.drawMode && state.userPolygon.vertices && state.userPolygon.vertices.length >= 3) {
          const btnClose = document.getElementById("btn-close-polygon");
          if (btnClose) btnClose.click();
        }
      }
      if (e.code==="Space") { spacePressed=true; e.preventDefault(); }
    });
    window.addEventListener("keyup", e => { if(e.code==="Space") spacePressed=false; });

    function hitTestAnchor(sx, sy, isHist) {
      const radius = 14;
      const vp = isHist ? state.histViewport : state.trueViewport;
      const h = isHist ? histCanvas.height : trueCanvas.height;
      for (const anc of state.anchors) {
        const pt = isHist ? worldToScreen(anc.src, vp, h) : worldToScreenGIS(anc.dst, vp, h);
        if (Math.hypot(pt.x - sx, pt.y - sy) <= radius) {
          return anc;
        }
      }
      return null;
    }

    let draggingAnchor = null; // { anc, isHist }
    let draggingAnchorLabel = null; // { anc, isHist, startMouseX, startMouseY, origDx, origDy }

    function hitTestAnchorLabel(sx, sy, isHist) {
      if (isHist || (!isHist && (state.showMojones1073 === false || state.activeDeed === "196"))) return null;
      const vp = isHist ? state.histViewport : state.trueViewport;
      const h = isHist ? histCanvas.height : trueCanvas.height;
      const ctx = isHist ? histCtx : trueCtx;
      for (let i = state.anchors.length - 1; i >= 0; i--) {
        const anc = state.anchors[i];
        if (anc.showLabel === false) continue;
        const pt = isHist ? worldToScreen(anc.src, vp, h) : worldToScreenGIS(anc.dst, vp, h);
        if (!pt || !isFinite(pt.x) || !isFinite(pt.y)) continue;

        const isEnabled = anc.enabled !== false;
        const labelName = (anc.name && anc.name.trim()) ? anc.name.trim() : (`#${anc.id}`);
        const fullText = labelName + (isEnabled ? "" : " (off)");

        const defDx = 10, defDy = -10;
        const offset = isHist ? anc.labelOffsetSrc : anc.labelOffsetDst;
        const offX = (offset && typeof offset.dx === "number") ? offset.dx : defDx;
        const offY = (offset && typeof offset.dy === "number") ? offset.dy : defDy;

        const bounds = getAnchorCardBounds(anc, pt, isHist, ctx);
        if (sx >= bounds.cardX && sx <= bounds.cardX + bounds.cardW && sy >= bounds.cardY && sy <= bounds.cardY + bounds.cardH) {
          return { anc, isHist, offX: bounds.offX, offY: bounds.offY, cardX: bounds.cardX, cardY: bounds.cardY, cardW: bounds.cardW, cardH: bounds.cardH };
        }
      }
      return null;
    }

    function handleMouseDown(e, canvas, viewport, isHist) {
      if (state.activeDeedHandle !== null) return;
      clickStart.x = e.clientX;
      clickStart.y = e.clientY;

      // In Measuring mode on true canvas:
      // Left click on an existing marker drags it; left click on empty canvas places a new point.
      // Right click on a marker deletes it; right click on empty canvas or middle/Space pans.
      if (!isHist && state.measureTool && state.measureTool.active) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const hitMeasure = findMeasureMarkerAt(sx, sy, viewport, canvas.height, 14);

        if (e.button === 0 && !spacePressed) {
          const isCloseClick = (!state.measureTool.closed && state.measureTool.points.length >= 2 && hitMeasure && hitMeasure.idx === 0);
          if (hitMeasure && !isCloseClick) {
            state.draggingMeasureMarker = hitMeasure.idx;
            canvas.style.cursor = "move";
            updateStatus(`📏 Dragging Point #${hitMeasure.idx + 1} — release to reposition.`);
            redrawTrueCanvas();
            return;
          }
          return;
        }

        if (e.button === 2) {
          if (hitMeasure) {
            return; // Don't pan; contextmenu listener will delete the marker
          }
          isPanning = true;
          panStart.x = e.clientX;
          panStart.y = e.clientY;
          vpStart.offsetX = viewport.offsetX;
          vpStart.offsetY = viewport.offsetY;
          activePanViewport = viewport;
          canvas.style.cursor = "grabbing";
          return;
        }

        if (e.button === 1 || spacePressed) {
          isPanning = true;
          panStart.x = e.clientX;
          panStart.y = e.clientY;
          vpStart.offsetX = viewport.offsetX;
          vpStart.offsetY = viewport.offsetY;
          activePanViewport = viewport;
          canvas.style.cursor = "grabbing";
          return;
        }
        return;
      }

      // Edit Deed Nodes mode: priority drag of deed vertices on historical canvas
      if (isHist && state.editDeedNodes && e.button === 0 && !spacePressed && state.toolMode === "pan") {
        const rect = histCanvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const deedHit = findDeedNodeOnHistCanvas(sx, sy, state.histViewport, histCanvas.height);
        if (deedHit) {
          e.preventDefault();
          state.draggingDeedNodeHist = {
            entIdx: deedHit.entIdx,
            ptIdx: deedHit.ptIdx,
            origDeedPt: { x: deedHit.deedPt.x, y: deedHit.deedPt.y }
          };
          histCanvas.style.cursor = "move";
          updateStatus(`✏️ Dragging Deed Vertex #${deedHit.ptIdx + 1} on deed map.`);
          redrawAll();
          return;
        }
      }

      // Anchor landmark drag in anchor mode
      if (state.toolMode === "anchor" && e.button === 0 && !spacePressed) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const hit = hitTestAnchor(sx, sy, isHist);
        if (hit) {
          draggingAnchor = { anc: hit, isHist };
          canvas.style.cursor = "move";
          return;
        }
      }

      // Anchor Label dragging (available in all modes via left click)
      if (e.button === 0 && !spacePressed) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        const labelHit = hitTestAnchorLabel(sx, sy, isHist);
        if (labelHit) {
          e.preventDefault();
          draggingAnchorLabel = {
            anc: labelHit.anc,
            isHist,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            origDx: labelHit.offX,
            origDy: labelHit.offY
          };
          canvas.style.cursor = "grabbing";
          return;
        }
      }

      const isMeasuringOnTrue = (!isHist && state.measureTool && state.measureTool.active);
      const isMarkerOnTrue = (!isHist && state.markerToolActive);
      const isEditingFieldOnTrue = (!isHist && state.editFieldNodes);
      const isEditingDeedOnTrue = (!isHist && state.editDeedNodes);
      const isCustomPolyDrawOnTrue = (!isHist && state.customPolygon && state.customPolygon.drawMode && state.toolMode === "pan");
      const isPolyDrawOnTrue = (!isHist && state.userPolygon && state.userPolygon.drawMode && state.toolMode === "pan") || isCustomPolyDrawOnTrue;
      const isInteractiveOnTrue = isMeasuringOnTrue || isMarkerOnTrue || isEditingFieldOnTrue || isEditingDeedOnTrue;
      const shouldPan = (!isInteractiveOnTrue && ((state.toolMode === "pan" && !isPolyDrawOnTrue) || e.button === 2 || e.button === 1 || spacePressed)) || (isInteractiveOnTrue && (e.button === 2 || e.button === 1 || spacePressed));

      if (shouldPan) {
        isPanning = true;
        panStart.x = e.clientX;
        panStart.y = e.clientY;
        vpStart.offsetX = viewport.offsetX;
        vpStart.offsetY = viewport.offsetY;
        activePanViewport = viewport;
        canvas.style.cursor = "grabbing";
        return;
      }
    }

    function handleMouseUp(e, canvas, viewport, isHist) {
      if (isPanning) {
        isPanning = false;
        activePanViewport = null;
        const trueCursor = (state.measureTool && state.measureTool.active) ? "crosshair" :
                           (state.markerToolActive ? "crosshair" :
                           ((state.userPolygon && state.userPolygon.drawMode) ? "crosshair" :
                           ((state.customPolygon && state.customPolygon.drawMode) ? "crosshair" :
                           (state.toolMode === "pan" ? "grab" : "crosshair"))));
        histCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        trueCanvas.style.cursor = trueCursor;
      }

      if (draggingAnchorLabel) {
        const id = draggingAnchorLabel.anc.id;
        draggingAnchorLabel = null;
        updateStatus(`Anchor #${id} label position updated.`);
        redrawAll();
        return;
      }

      if (draggingAnchor) {
        updateStatus(`Updated Anchor #${draggingAnchor.anc.id} position.`);
        draggingAnchor = null;
        const trueCursor = (state.measureTool && state.measureTool.active) ? "crosshair" :
                           (state.markerToolActive ? "crosshair" :
                           ((state.userPolygon && state.userPolygon.drawMode) ? "crosshair" :
                           ((state.customPolygon && state.customPolygon.drawMode) ? "crosshair" :
                           (state.toolMode === "pan" ? "grab" : "crosshair"))));
        histCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        trueCanvas.style.cursor = trueCursor;
        redrawAll();
        return;
      }

      if (state.draggingMeasureMarker !== null) {
        const idx = state.draggingMeasureMarker;
        state.draggingMeasureMarker = null;
        updateStatus(`📏 Measuring Point #${idx + 1} repositioned.`);
        updateMeasureHUD();
        redrawTrueCanvas();
        return;
      }

      const isMeasuringOnTrue = (!isHist && state.measureTool && state.measureTool.active);
      const isMarkerOnTrue = (!isHist && state.markerToolActive);
      const isEditingFieldOnTrue = (!isHist && state.editFieldNodes);
      const isEditingDeedOnTrue = (!isHist && state.editDeedNodes);
      const isCustomDrawOnTrue = (!isHist && state.customPolygon && state.customPolygon.drawMode);
      if (state.toolMode === "pan" && (!state.userPolygon || !state.userPolygon.drawMode || isHist) && !isCustomDrawOnTrue && !isMeasuringOnTrue && !isMarkerOnTrue && !isEditingFieldOnTrue && !isEditingDeedOnTrue) return;
      if (Math.abs(e.clientX - clickStart.x) > 6 || Math.abs(e.clientY - clickStart.y) > 6) return;
      if (e.button !== 0) return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

      // Sequential clicks for Measuring Tool on true canvas
      if (isMeasuringOnTrue) {
        const snap = (state.measureTool.snapEnabled !== false) ? (state.currentSnapTarget || findMeasureSnapTarget(sx, sy, viewport, canvas.height)) : null;
        const pt = snap ? { x: snap.worldPt.x, y: snap.worldPt.y } : screenToWorldGIS(sx, sy, viewport, canvas.height);
        const mt = state.measureTool;
        if (mt.closed) {
          mt.points = [pt];
          mt.closed = false;
        } else if (mt.points.length >= 2) {
          const s0 = worldToScreenGIS(mt.points[0], viewport, canvas.height);
          if (Math.hypot(s0.x - sx, s0.y - sy) <= 18 || (snap && snap.isFirstMeasurePt)) {
            mt.closed = true;
          } else {
            const last = mt.points[mt.points.length - 1];
            if (Math.hypot(last.x - pt.x, last.y - pt.y) > 0.05) {
              mt.points.push(pt);
            }
          }
        } else {
          if (mt.points.length === 1) {
            const last = mt.points[0];
            if (Math.hypot(last.x - pt.x, last.y - pt.y) > 0.05) {
              mt.points.push(pt);
            }
          } else {
            mt.points.push(pt);
          }
        }
        updateMeasureHUD();
        redrawTrueCanvas();
        return;
      }

      if (isHist) {
        const worldPt = screenToWorld(sx, sy, viewport, canvas.height);
        state.pendingSource = worldPt;
        redrawAll();
        updateStatus(`Source Anchor #${state.anchors.length + 1} at deed (${worldPt.x.toFixed(1)}, ${worldPt.y.toFixed(1)}). Now click matching location on drone survey.`);
      } else {
        if (!state.pendingSource) {
          updateStatus("Click a landmark on the deed map (left) first.");
          return;
        }
        let worldPt = screenToWorldGIS(sx, sy, viewport, canvas.height);

        // Check snapping to active test axis (parametric coupling)
        let snappedAxisInfo = null;
        if (state.snapNewAnchorsToAxis && typeof findNearestTestAxis === "function" && (state.testAxes || []).some(a => a.visible !== false)) {
          snappedAxisInfo = findNearestTestAxis(worldPt, viewport, 20);
        }

        if (snappedAxisInfo) {
          worldPt = snappedAxisInfo.projPt;
        } else {
          // Snap to nearest vertex (Field survey or added reference DXFs)
          const nearestField = findNearestFieldVertex(worldPt);
          if (nearestField) {
            const snapDistPx = nearestField.dist * viewport.scale;
            if (snapDistPx <= 18 || (state.constrainAnchorsToField && nearestField.dist <= state.optBufferRadius)) {
              worldPt = { x: nearestField.x, y: nearestField.y };
            }
          }
        }

        const nextId = state.anchors.length + 1;
        const color = anchorColors[(nextId - 1) % anchorColors.length];
        state.anchors.push({
          id: nextId,
          name: `#${nextId}`,
          showLabel: true,
          image: null,
          color: color,
          src: { ...state.pendingSource },
          dst: worldPt,
          active: true,
          enabled: true,
          axisId: snappedAxisInfo ? snappedAxisInfo.axis.id : null,
          axisT: snappedAxisInfo ? snappedAxisInfo.t : null
        });
        state.pendingSource = null;
        redrawAll();
        if (snappedAxisInfo) {
          if (typeof renderTestAxesList === "function") renderTestAxesList();
          updateStatus(`Anchor Pair #${nextId} created & coupled to ${snappedAxisInfo.axis.name}! Dragging axis handles carries this anchor.`);
        } else {
          updateStatus(`Anchor Pair #${nextId} created! Transformation updating live.`);
        }
      }
    }

    window.addEventListener("mousemove", e => {
      // Anchor Label dragging
      if (draggingAnchorLabel) {
        const dx = e.clientX - draggingAnchorLabel.startMouseX;
        const dy = e.clientY - draggingAnchorLabel.startMouseY;
        const newOff = {
          dx: draggingAnchorLabel.origDx + dx,
          dy: draggingAnchorLabel.origDy + dy
        };
        if (draggingAnchorLabel.isHist) {
          draggingAnchorLabel.anc.labelOffsetSrc = newOff;
          histCanvas.style.cursor = "grabbing";
          redrawHistoricalCanvas();
        } else {
          draggingAnchorLabel.anc.labelOffsetDst = newOff;
          trueCanvas.style.cursor = "grabbing";
          redrawTrueCanvas();
        }
        return;
      }

      // 0. Smooth window-level drag for deed squeeze handles
      if (state.activeDeedHandle !== null && state.deedDragStart) {
        const r = trueCanvas.getBoundingClientRect();
        const mouseX = e.clientX - r.left, mouseY = e.clientY - r.top;
        const start = state.deedDragStart;
        const dx = mouseX - start.sx;
        const dy = mouseY - start.sy;
        const gizmo = start.gizmo;

        if (gizmo) {
          const h = state.activeDeedHandle;
          const halfW = Math.max(15, gizmo.widthScreen / 2);
          const currentRatio = start.initRatio !== undefined ? start.initRatio : (start.initScaleX || 1.0);

          let proj = 0;
          if (h === "right" || h === "tr" || h === "br") {
            proj = dx * gizmo.uWidth.x + dy * gizmo.uWidth.y;
          } else if (h === "left" || h === "tl" || h === "bl") {
            proj = -(dx * gizmo.uWidth.x + dy * gizmo.uWidth.y);
          } else if (h === "top") {
            proj = -(dx * gizmo.uHeight.x + dy * gizmo.uHeight.y);
          } else if (h === "bottom") {
            proj = dx * gizmo.uHeight.x + dy * gizmo.uHeight.y;
          }

          const newRatio = Math.max(0.20, Math.min(3.0, currentRatio * (1 + proj / halfW)));
          applyDeedScaleChange(newRatio);
        }
        return;
      }

      if (isPanning && activePanViewport) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        activePanViewport.offsetX = vpStart.offsetX + dx;
        if (activePanViewport === state.trueViewport) {
          activePanViewport.offsetY = vpStart.offsetY - dy; // GIS flips Y
        } else {
          activePanViewport.offsetY = vpStart.offsetY + dy; // Historical doesn't flip Y
        }
        redrawAll();
        return;
      }

      if (draggingAnchor) {
        const canvas = draggingAnchor.isHist ? histCanvas : trueCanvas;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        if (draggingAnchor.isHist) {
          draggingAnchor.anc.src = screenToWorld(sx, sy, state.histViewport, histCanvas.height);
        } else {
          let targetPt = screenToWorldGIS(sx, sy, state.trueViewport, trueCanvas.height);

          const nearestField = findNearestFieldVertex(targetPt);
          if (nearestField) {
            const snapDistPx = nearestField.dist * state.trueViewport.scale;
            // Magnetic snap to vertex when close (within 15 screen pixels)
            if (snapDistPx <= 15) {
              targetPt = { x: nearestField.x, y: nearestField.y };
            } else if (state.constrainAnchorsToField && state.optBufferRadius > 0) {
              const R = state.optBufferRadius;
              // If the cursor is within or approaching the vertex buffer (within 2*R detection zone):
              if (nearestField.dist <= R * 2.0) {
                if (nearestField.dist > R) {
                  // Cursor is outside the circle: clamp anchor position to the circle boundary (perimeter)
                  const angle = Math.atan2(targetPt.y - nearestField.y, targetPt.x - nearestField.x);
                  targetPt = {
                    x: nearestField.x + R * Math.cos(angle),
                    y: nearestField.y + R * Math.sin(angle)
                  };
                }
                // When nearestField.dist <= R, targetPt remains free inside the circle!
              }
            }
          }

          if (draggingAnchor.anc.axisId != null) {
            const ax = (state.testAxes || []).find(a => a.id === draggingAnchor.anc.axisId);
            if (ax) {
              const pr = projectPointOnAxis(targetPt, ax);
              const clampedT = Math.max(0.0, Math.min(1.0, pr.t));
              draggingAnchor.anc.axisT = clampedT;
              targetPt = {
                x: ax.p1.x + clampedT * (ax.p2.x - ax.p1.x),
                y: ax.p1.y + clampedT * (ax.p2.y - ax.p1.y)
              };
            }
          }

          draggingAnchor.anc.dst = targetPt;
        }
        redrawAll();
        return;
      }

      // Dragging deed node on historical canvas
      if (state.draggingDeedNodeHist) {
        const vp = state.histViewport;
        const h = histCanvas.height;
        const rect = histCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        const deedPt = screenToWorld(mouseX, mouseY, vp, h);
        const ent = state.histEntities[state.draggingDeedNodeHist.entIdx];
        if (ent && ent.points && ent.points[state.draggingDeedNodeHist.ptIdx]) {
          const origDeed = state.draggingDeedNodeHist.origDeedPt;
          ent.points[state.draggingDeedNodeHist.ptIdx].x = deedPt.x;
          ent.points[state.draggingDeedNodeHist.ptIdx].y = deedPt.y;

          // Synchronize any user polygon vertex linked to this deed point (only for Deed 1073)
          if (state.activeDeed === "1073" && state.userPolygon && state.userPolygon.vertices) {
            let warper = null;
            const activeAnchors = getActiveAnchors();
            if (activeAnchors.length >= 2) {
              try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
            }
            state.userPolygon.vertices.forEach(v => {
              if (v.deedPt && Math.hypot(v.deedPt.x - origDeed.x, v.deedPt.y - origDeed.y) < 0.05) {
                v.deedPt.x = deedPt.x;
                v.deedPt.y = deedPt.y;
                if (warper) {
                  const w = warper(deedPt);
                  v.x = w.x;
                  v.y = w.y;
                }
              }
            });
            recomputeUserPolygonMetrics();
          }
          redrawAll();
        }
        return;
      }

      // Dragging measuring marker on true canvas
      if (state.draggingMeasureMarker !== null) {
        const vp = state.trueViewport;
        const h = trueCanvas.height;
        const rect = trueCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        const p = screenToWorldGIS(mouseX, mouseY, vp, h);
        const snap = (state.measureTool && state.measureTool.snapEnabled !== false) ? findMeasureSnapTarget(mouseX, mouseY, vp, h) : null;
        state.currentSnapTarget = snap;
        const targetPt = snap ? { x: snap.worldPt.x, y: snap.worldPt.y } : { x: p.x, y: p.y };
        if (state.measureTool && state.measureTool.points && state.measureTool.points[state.draggingMeasureMarker]) {
          state.measureTool.points[state.draggingMeasureMarker] = targetPt;
          state.measureTool.cursorPt = targetPt;
          updateMeasureHUD();
          const snapBadge = snap ? ` [🧲 ${snap.label}]` : "";
          coordsBar.textContent = `📏 Moving Point #${state.draggingMeasureMarker + 1}${snapBadge} | UTM: (${targetPt.x.toFixed(2)}, ${targetPt.y.toFixed(2)})`;
          redrawTrueCanvas();
        }
        return;
      }

      // Dragging temporary reference marker
      if (state.draggingTempMarker) {
        const vp = state.trueViewport;
        const h = trueCanvas.height;
        const rect = trueCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        const fieldPt = screenToWorldGIS(mouseX, mouseY, vp, h);
        state.draggingTempMarker.marker.x = fieldPt.x;
        state.draggingTempMarker.marker.y = fieldPt.y;
        redrawTrueCanvas();
        return;
      }

      // Dragging field survey node
      if (state.draggingFieldNode) {
        const vp = state.trueViewport;
        const h = trueCanvas.height;
        const rect = trueCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        let fieldPt = screenToWorldGIS(mouseX, mouseY, vp, h);

        // Snap to nearest temporary marker, ref DXF, or other field vertex if within 16px
        const nearest = findNearestFieldVertex(fieldPt);
        if (nearest && nearest.dist * vp.scale <= 16) {
          fieldPt = { x: nearest.x, y: nearest.y };
        }

        const ent = state.trueEntities[state.draggingFieldNode.entIdx];
        if (ent && ent.points && ent.points[state.draggingFieldNode.ptIdx]) {
          const origField = state.draggingFieldNode.origFieldPt;
          ent.points[state.draggingFieldNode.ptIdx].x = fieldPt.x;
          ent.points[state.draggingFieldNode.ptIdx].y = fieldPt.y;

          // If an anchor was sitting on this field vertex, move the anchor dst along with it
          if (state.anchors && state.anchors.length > 0) {
            state.anchors.forEach(anc => {
              if (anc.dst && Math.hypot(anc.dst.x - origField.x, anc.dst.y - origField.y) < 0.1) {
                anc.dst.x = fieldPt.x;
                anc.dst.y = fieldPt.y;
              }
            });
          }
          redrawAll();
        }
        return;
      }

      // Dragging deed node with live reverse-transform (backtracking)
      if (state.draggingDeedNode) {
        const vp = state.trueViewport;
        const h = trueCanvas.height;
        const rect = trueCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
        const fieldPt = screenToWorldGIS(mouseX, mouseY, vp, h);

        const invWarper = TransformMath.createInverseWarper(state.algorithm, getActiveAnchors());
        if (invWarper) {
          const newDeedPt = invWarper(fieldPt);
          const ent = state.histEntities[state.draggingDeedNode.entIdx];
          if (ent && ent.points && ent.points[state.draggingDeedNode.ptIdx]) {
            const origDeed = state.draggingDeedNode.origDeedPt;
            ent.points[state.draggingDeedNode.ptIdx].x = newDeedPt.x;
            ent.points[state.draggingDeedNode.ptIdx].y = newDeedPt.y;

            // Synchronize any user polygon vertex linked to this deed point (only for Deed 1073)
            if (state.activeDeed === "1073" && state.userPolygon && state.userPolygon.vertices) {
              state.userPolygon.vertices.forEach(v => {
                if (v.deedPt && Math.hypot(v.deedPt.x - origDeed.x, v.deedPt.y - origDeed.y) < 0.05) {
                  v.deedPt.x = newDeedPt.x;
                  v.deedPt.y = newDeedPt.y;
                  v.x = fieldPt.x;
                  v.y = fieldPt.y;
                }
              });
              recomputeUserPolygonMetrics();
            }
            redrawAll();
          }
        }
        return;
      }
    });

    window.addEventListener("mouseup", () => {
      if (draggingAnchorLabel) {
        const ancId = draggingAnchorLabel.anc.id;
        const isHist = draggingAnchorLabel.isHist;
        draggingAnchorLabel = null;
        updateStatus(`Anchor #${ancId} label repositioned.`);
        if (isHist) {
          histCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        } else {
          trueCanvas.style.cursor = (state.customPolygon && state.customPolygon.drawMode) ? "crosshair" :
                                    ((state.userPolygon && state.userPolygon.drawMode) ? "crosshair" : (state.toolMode === "pan" ? "grab" : "crosshair"));
        }
        redrawAll();
        return;
      }

      // 0. Release Deed Handle Dragging & lock position
      if (state.activeDeedHandle !== null) {
        state.activeDeedHandle = null;
        state.deedDragStart = null;
        isPanning = false;
        activePanViewport = null;
        trueCanvas.style.cursor = (state.toolMode === "pan") ? "grab" : "default";
        updateDeedScaleDisplay();
        updateUserPolygonWarp();
        updateCustomPolygonAnchors();
        const ratioVal = state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0);
        updateStatus(`📐 Deed Squeeze adjusted: ${(ratioVal * 100).toFixed(1)}%. Anchors 1 & 2 locked (0.0 m drift).`);
        return;
      }
      if (state.draggingTempMarker) {
        const m = state.draggingTempMarker.marker;
        state.draggingTempMarker = null;
        updateStatus(`📍 Marker ${m ? m.label : ""} moved to (${m.x.toFixed(2)}, ${m.y.toFixed(2)}).`);
        redrawTrueCanvas();
      }
      if (state.draggingFieldNode) {
        const ptIdx = state.draggingFieldNode.ptIdx;
        state.draggingFieldNode = null;
        updateStatus(`✏️ Field vertex #${ptIdx + 1} updated. Click download in Field tool group to save '${state.trueFileName || "Field.dxf"}'.`);
        redrawAll();
      }
      if (state.draggingDeedNodeHist) {
        const ptIdx = state.draggingDeedNodeHist.ptIdx;
        state.draggingDeedNodeHist = null;
        updateStatus(`✏️ Deed vertex #${ptIdx + 1} updated. Click download in Deed tool group to save '${state.histFileName || "deed DXF"}'.`);
        redrawAll();
      }
      if (state.draggingDeedNode) {
        const ptIdx = state.draggingDeedNode.ptIdx;
        state.draggingDeedNode = null;
        updateStatus(`✏️ Deed vertex #${ptIdx + 1} updated. Click download in Deed tool group to save '${state.histFileName || "deed DXF"}'.`);
        redrawAll();
      }
      if (state.draggingUserPolyNode !== null) {
        state.draggingUserPolyNode = null;
        state.dragDeedAnchor = null;
        state.currentSnapTarget = null;
        rebuildSegmentInputs();
        recomputeUserPolygonMetrics();
        updatePolygonButtonStates();
        redrawTrueCanvas();
      }
      if (state.draggingCustomPolyNode !== null) {
        state.draggingCustomPolyNode = null;
        state.customPolySnapTarget = null;
        recomputeCustomPolygonMetrics();
        updateCustomPolyButtonStates();
        redrawTrueCanvas();
      }
      if (state.draggingMeasureMarker !== null) {
        const idx = state.draggingMeasureMarker;
        state.draggingMeasureMarker = null;
        updateStatus(`📏 Measuring Point #${idx + 1} repositioned.`);
        updateMeasureHUD();
        redrawTrueCanvas();
      }
      if (isPanning) {
        isPanning = false;
        activePanViewport = null;
        const trueCursor = (state.customPolygon && state.customPolygon.drawMode) ? "crosshair" :
                           ((state.userPolygon && state.userPolygon.drawMode) ? "crosshair" : (state.toolMode === "pan" ? "grab" : "crosshair"));
        histCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        trueCanvas.style.cursor = trueCursor;
      }
      if (draggingAnchor) {
        draggingAnchor = null;
        const trueCursor = (state.customPolygon && state.customPolygon.drawMode) ? "crosshair" :
                           ((state.userPolygon && state.userPolygon.drawMode) ? "crosshair" : (state.toolMode === "pan" ? "grab" : "crosshair"));
        histCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        trueCanvas.style.cursor = trueCursor;
        redrawAll();
      }
    });

    // Coordinate display on mousemove
    histCanvas.addEventListener("mousemove", e => {
      const r = histCanvas.getBoundingClientRect();
      const p = screenToWorld(e.clientX - r.left, e.clientY - r.top, state.histViewport, histCanvas.height);
      coordsBar.textContent = `Deed: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
      if (state.toolMode === "anchor" && !isPanning && !draggingAnchor) {
        const hit = hitTestAnchor(e.clientX - r.left, e.clientY - r.top, true);
        histCanvas.style.cursor = hit ? "move" : "crosshair";
      } else if (!isPanning && !draggingAnchor && !draggingAnchorLabel && !state.draggingDeedNodeHist) {
        const labelHit = hitTestAnchorLabel(e.clientX - r.left, e.clientY - r.top, true);
        if (labelHit) {
          histCanvas.style.cursor = "grab";
          coordsBar.textContent = `Anchor #${labelHit.anc.id} Label: Drag to reposition • Double-click to reset`;
          return;
        }
      } else if (state.editDeedNodes && !isPanning && !state.draggingDeedNodeHist) {
        const deedHit = findDeedNodeOnHistCanvas(e.clientX - r.left, e.clientY - r.top, state.histViewport, histCanvas.height);
        const prevHover = state.hoverDeedNode;
        state.hoverDeedNode = deedHit;
        if (deedHit) {
          histCanvas.style.cursor = "move";
          coordsBar.textContent = `Deed Node #${deedHit.ptIdx + 1}: (${deedHit.deedPt.x.toFixed(1)}, ${deedHit.deedPt.y.toFixed(1)})`;
          redrawHistoricalCanvas();
          return;
        } else if (prevHover !== null) {
          histCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
          redrawHistoricalCanvas();
        }
      }
    });
    trueCanvas.addEventListener("mousemove", e => {
      const r = trueCanvas.getBoundingClientRect();
      const mouseX = e.clientX - r.left, mouseY = e.clientY - r.top;
      const vp = state.trueViewport, h = trueCanvas.height;

      // If actively dragging deed handle, window mousemove handles position
      if (state.activeDeedHandle !== null) {
        return;
      }

      // 0a. Test Axis creation in progress (rubber-band from Point A to mouse)
      if (state.creatingTestAxis && state.testAxisDrawStart) {
        state.testAxisCursorPt = screenToWorldGIS(mouseX, mouseY, vp, h);
        const dx = state.testAxisCursorPt.x - state.testAxisDrawStart.x;
        const dy = state.testAxisCursorPt.y - state.testAxisDrawStart.y;
        const len = Math.hypot(dx, dy);
        const brg = computeAxisBearing(state.testAxisDrawStart, state.testAxisCursorPt);
        coordsBar.textContent = `📐 Test Axis: Point A (${state.testAxisDrawStart.x.toFixed(1)}, ${state.testAxisDrawStart.y.toFixed(1)}) → Length ${len.toFixed(1)}m, Bearing ${brg.toFixed(1)}° • Click to set Point B`;
        redrawTrueCanvas();
        return;
      }

      // 0b. Test Axis handle dragging (A or B)
      if (state.draggingTestAxisHandle) {
        const mouseWorld = screenToWorldGIS(mouseX, mouseY, vp, h);
        const ax = (state.testAxes || []).find(a => a.id === state.draggingTestAxisHandle.axisId);
        if (ax) {
          ax[state.draggingTestAxisHandle.handle] = mouseWorld;
          updateAnchorsOnAxis(ax);
          redrawTrueCanvas();
          const geom = computeAxisGeometry(ax);
          coordsBar.textContent = `📐 ${ax.name} [Handle ${state.draggingTestAxisHandle.handle.toUpperCase()}]: (${mouseWorld.x.toFixed(1)}, ${mouseWorld.y.toFixed(1)}) • Length ${geom.len.toFixed(1)}m, Bearing ${geom.bearing.toFixed(1)}°`;
        }
        return;
      }

      // 0c. Test Axis Handle Hover detection
      if (!isPanning && !draggingAnchor && !state.creatingTestAxis && (state.testAxes || []).length > 0) {
        const axisHit = findTestAxisHandleAt(mouseX, mouseY, vp, h);
        if (axisHit) {
          trueCanvas.style.cursor = "move";
          coordsBar.textContent = `📐 ${axisHit.axis.name} Handle ${axisHit.handle.toUpperCase()}: Drag to rotate/move axis (attached anchors slide with it).`;
          return;
        }
      }

      // Anchor Label Hover detection (drag label or double-click to reset)
      if (!isPanning && !draggingAnchor && !draggingAnchorLabel && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null && !state.draggingDeedNode && !state.draggingFieldNode && !state.draggingTempMarker && (!state.measureTool || !state.measureTool.active)) {
        const labelHit = hitTestAnchorLabel(mouseX, mouseY, false);
        if (labelHit) {
          trueCanvas.style.cursor = "grab";
          coordsBar.textContent = `Anchor #${labelHit.anc.id} Label: Drag to reposition • Double-click to reset`;
          const anchorTooltipEl = document.getElementById("anchor-photo-tooltip");
          if (anchorTooltipEl && anchorTooltipEl.style.display !== "none") anchorTooltipEl.style.display = "none";
          return;
        }
      }

      // Deed Handle Hover detection
      if (!isPanning && !draggingAnchor && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null && !state.draggingDeedNode && !state.draggingFieldNode && !state.draggingTempMarker && state.showOverlay && state.showDeedHandles !== false && state.toolMode === "pan") {
        const handleHit = findDeedHandleAt(mouseX, mouseY, vp, h);
        const prevHover = state.hoveredDeedHandle;
        state.hoveredDeedHandle = handleHit ? handleHit.handle : null;
        if (state.hoveredDeedHandle !== prevHover) {
          redrawTrueCanvas();
        }
        if (handleHit) {
          trueCanvas.style.cursor = handleHit.cursor;
          coordsBar.textContent = `📐 Deed Squeeze [${handleHit.handle.toUpperCase()}]: Drag to adjust aspect ratio.`;
          return;
        }
      } else {
        if (state.hoveredDeedHandle) {
          state.hoveredDeedHandle = null;
          redrawTrueCanvas();
        }
      }

      // Segment Hover & Tooltip detection (only when hovering directly over a recreated polygon segment or its label)
      let hitSeg = null;
      if (state.userPolygon && state.userPolygon.vertices && state.userPolygon.vertices.length >= 2 && state.userPolygon.show !== false && !isPanning && !draggingAnchor && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null && !state.draggingDeedNode && !state.draggingFieldNode && !state.draggingTempMarker && (!state.measureTool || !state.measureTool.active)) {
        hitSeg = findUserPolySegmentAt(mouseX, mouseY, vp, h, 10);
        if (!hitSeg && state.userPolyLabelBoxes && state.userPolyLabelBoxes.length > 0) {
          const hitBox = state.userPolyLabelBoxes.find(b =>
            mouseX >= b.box.x && mouseX <= b.box.x + b.box.w &&
            mouseY >= b.box.y && mouseY <= b.box.y + b.box.h
          );
          if (hitBox) {
            hitSeg = { segIdx: hitBox.segIdx, screenPt: { x: mouseX, y: mouseY }, worldPt: null, distPx: 0 };
          }
        }
      }
      const labelTooltipEl = document.getElementById("segment-label-tooltip");
      if (hitSeg && labelTooltipEl) {
        trueCanvas.style.cursor = "help";
        const poly = state.userPolygon;
        const i = hitSeg.segIdx;
        const a = poly.vertices[i];
        const b = poly.vertices[(i + 1) % poly.vertices.length];
        const calcLen = Math.hypot(b.x - a.x, b.y - a.y);
        const deedLen = (poly.segmentLengths && poly.segmentLengths[i] != null && poly.segmentLengths[i] > 0) ? Number(poly.segmentLengths[i]) : null;
        const meta = getSegmentErrorMeta(calcLen, deedLen);

        // Line 1: Origin from Sección (E296, E1073, La Quebrada, etc.)
        const rawSec = (poly.segmentSections && poly.segmentSections[i]) ? String(poly.segmentSections[i]).trim() : "";
        let originStr = "Lindero Reconstruido";
        if (rawSec.toUpperCase().includes("1073")) {
          originStr = "From Escritura 1073";
        } else if (rawSec.toUpperCase().includes("296")) {
          originStr = "From Escritura 296";
        } else if (rawSec.toLowerCase().includes("quebrada")) {
          originStr = "From La Quebrada (Atributo Geofísico Fijo)";
        } else if (rawSec) {
          originStr = `From ${rawSec}`;
        }

        // Line 2: Segment Part
        const rawPart = (poly.segmentParts && poly.segmentParts[i]) ? String(poly.segmentParts[i]).trim() : "";
        const segIdStr = `Segment #: ${rawPart || (i + 1)}`;

        // Line 3: Distancia reportada
        const deedValStr = deedLen != null ? `${deedLen.toFixed(2)} m` : "Sin dato en escritura";

        // Line 4: Distancia en campo
        const fieldValStr = `${calcLen.toFixed(2)} m`;

        // Line 5: Percent error
        const errValStr = meta.errPct != null ? `${meta.errPct.toFixed(2)}%` : "—";
        const errColor = meta.color || "#00e5ff";

        labelTooltipEl.innerHTML = `
          <div style="font-weight:700;color:var(--accent-cyan);font-size:0.75rem;margin-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:3px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span>📐 ${originStr}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;font-size:0.72rem;line-height:1.5;">
            <div><span style="color:#94a3b8;">${segIdStr}</span></div>
            <div><span style="color:#94a3b8;">Distancia reportada:</span> <strong style="color:#f8fafc;font-family:monospace;">${deedValStr}</strong></div>
            <div><span style="color:#94a3b8;">Distancia en campo:</span> <strong style="color:#00e5ff;font-family:monospace;">${fieldValStr}</strong></div>
            <div><span style="color:#94a3b8;">Percent error:</span> <strong style="color:${errColor};font-family:monospace;font-size:0.76rem;">${errValStr}</strong></div>
          </div>
        `;
        labelTooltipEl.style.display = "block";
        const cw = trueCanvas.width || trueCanvas.clientWidth;
        const ch = trueCanvas.height || trueCanvas.clientHeight;
        let leftPx = mouseX + 14;
        let topPx = mouseY + 14;
        if (leftPx + 280 > cw) leftPx = mouseX - 290;
        if (topPx + 120 > ch) topPx = mouseY - 125;
        labelTooltipEl.style.left = `${Math.max(10, leftPx)}px`;
        labelTooltipEl.style.top = `${Math.max(10, topPx)}px`;
        coordsBar.textContent = `${originStr} | ${segIdStr} | Rep: ${deedValStr} | Campo: ${fieldValStr} | Error: ${errValStr}`;
        return;
      } else if (labelTooltipEl && labelTooltipEl.style.display !== "none") {
        labelTooltipEl.style.display = "none";
      }

      // Anchor Pin Hover detection (shows photo, custom name, coords, residual)
      let hitAnchor = null;
      if (!isPanning && !draggingAnchor && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null && !state.draggingDeedNode && !state.draggingFieldNode && !state.draggingTempMarker && (!state.measureTool || !state.measureTool.active)) {
        for (const anc of (state.anchors || [])) {
          const tp = worldToScreenGIS(anc.dst, vp, h);
          if (Math.hypot(mouseX - tp.x, mouseY - tp.y) <= 14) {
            hitAnchor = anc;
            break;
          }
        }
      }
      const anchorTooltipEl = document.getElementById("anchor-photo-tooltip");
      if (hitAnchor && anchorTooltipEl) {
        trueCanvas.style.cursor = "pointer";
        const isEnabled = hitAnchor.active !== false && hitAnchor.enabled !== false;
        let errStr = "—";
        const activeAnchors = getActiveAnchors();
        if (activeAnchors.length >= 2) {
          try {
            const warper = TransformMath.createWarper(state.algorithm, activeAnchors);
            const warped = warper(hitAnchor.src);
            errStr = `${Math.hypot(warped.x - hitAnchor.dst.x, warped.y - hitAnchor.dst.y).toFixed(2)} m`;
          } catch(_) {}
        }
        const ancName = hitAnchor.name || (`#${hitAnchor.id}`);
        const safeName = (ancName + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        anchorTooltipEl.innerHTML = `
          <div style="font-weight:700;color:var(--accent-cyan);font-size:0.76rem;margin-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:3px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="anchor-badge" style="background:${hitAnchor.color};width:16px;height:16px;line-height:16px;font-size:0.65rem;"><span style="font-size:0.52em;opacity:0.85;vertical-align:0.12em;margin-right:0.5px;">#</span>${hitAnchor.id}</span>
              <span>${safeName}</span>
            </div>
            <span style="font-size:0.68rem;font-weight:600;color:${isEnabled ? '#00e676' : '#ff5252'};">${isEnabled ? 'Active' : 'Disabled'}</span>
          </div>
          ${hitAnchor.image ? `<div style="margin:8px 0;text-align:center;"><img src="${hitAnchor.image}" alt="Anchor Photo" style="max-width:100%;max-height:220px;border-radius:6px;border:1px solid rgba(0,229,255,0.55);object-fit:cover;display:block;margin:0 auto;box-shadow:0 3px 12px rgba(0,0,0,0.7);" /></div>` : ''}
          <div style="display:flex;flex-direction:column;gap:3px;font-size:0.72rem;">
            <div><span style="color:#94a3b8;">Target UTM:</span> <strong style="color:#f8fafc;font-family:monospace;">(${hitAnchor.dst.x.toFixed(2)}, ${hitAnchor.dst.y.toFixed(2)})</strong></div>
            <div><span style="color:#94a3b8;">Deed CAD:</span> <strong style="color:#f8fafc;font-family:monospace;">(${hitAnchor.src.x.toFixed(2)}, ${hitAnchor.src.y.toFixed(2)})</strong></div>
            <div><span style="color:#94a3b8;">Residual:</span> <strong style="color:var(--accent-cyan);font-family:monospace;">${errStr}</strong></div>
          </div>
        `;
        anchorTooltipEl.style.display = "block";
        const cw = trueCanvas.width || trueCanvas.clientWidth;
        const ch = trueCanvas.height || trueCanvas.clientHeight;
        let leftPx = mouseX + 14;
        let topPx = mouseY + 14;
        if (leftPx + 360 > cw) leftPx = mouseX - 370;
        if (topPx + 280 > ch) topPx = mouseY - 290;
        anchorTooltipEl.style.left = `${Math.max(10, leftPx)}px`;
        anchorTooltipEl.style.top = `${Math.max(10, topPx)}px`;
        coordsBar.textContent = `Anchor ${ancName} | Residual: ${errStr} | UTM: (${hitAnchor.dst.x.toFixed(2)}, ${hitAnchor.dst.y.toFixed(2)})`;
        return;
      } else if (anchorTooltipEl && anchorTooltipEl.style.display !== "none") {
        anchorTooltipEl.style.display = "none";
      }

      const p = screenToWorldGIS(mouseX, mouseY, vp, h);
      coordsBar.textContent = `Field UTM: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;

      // Measuring Tool active: track cursor, handle snapping, live distance, hover & drag
      if (state.measureTool && state.measureTool.active) {
        // 1. If currently dragging an existing measuring marker:
        if (state.draggingMeasureMarker !== null) {
          trueCanvas.style.cursor = "move";
          state.hoverMeasureMarker = state.draggingMeasureMarker;
          const snap = (state.measureTool.snapEnabled !== false) ? findMeasureSnapTarget(mouseX, mouseY, vp, h) : null;
          state.currentSnapTarget = snap;
          const targetPt = snap ? { x: snap.worldPt.x, y: snap.worldPt.y } : { x: p.x, y: p.y };
          if (state.measureTool.points && state.measureTool.points[state.draggingMeasureMarker]) {
            state.measureTool.points[state.draggingMeasureMarker] = targetPt;
            state.measureTool.cursorPt = targetPt;
            updateMeasureHUD();
            const snapBadge = snap ? ` [🧲 ${snap.label}]` : "";
            coordsBar.textContent = `📏 Moving Point #${state.draggingMeasureMarker + 1}${snapBadge} | UTM: (${targetPt.x.toFixed(2)}, ${targetPt.y.toFixed(2)})`;
            redrawTrueCanvas();
          }
          return;
        }

        // 2. Check hover over existing marker:
        const hitMarker = findMeasureMarkerAt(mouseX, mouseY, vp, h, 14);
        state.hoverMeasureMarker = hitMarker ? hitMarker.idx : null;
        if (hitMarker) {
          trueCanvas.style.cursor = "move";
        } else {
          trueCanvas.style.cursor = "crosshair";
        }

        // 3. Snapping for cursor
        const snap = (state.measureTool.snapEnabled !== false) ? findMeasureSnapTarget(mouseX, mouseY, vp, h) : null;
        if (snap) {
          state.currentSnapTarget = snap;
          state.measureTool.cursorPt = { x: snap.worldPt.x, y: snap.worldPt.y };
        } else {
          state.currentSnapTarget = null;
          state.measureTool.cursorPt = p;
        }

        const pts = state.measureTool.points;
        const snapBadge = snap ? ` [🧲 ${snap.label}]` : "";
        if (hitMarker) {
          coordsBar.textContent = `📏 Point #${hitMarker.idx + 1} | Drag to reposition • Right-click to delete | UTM: (${hitMarker.pt.x.toFixed(2)}, ${hitMarker.pt.y.toFixed(2)})`;
        } else if (pts.length > 0 && !state.measureTool.closed) {
          const lastPt = pts[pts.length - 1];
          const curDist = Math.hypot(state.measureTool.cursorPt.x - lastPt.x, state.measureTool.cursorPt.y - lastPt.y);
          coordsBar.textContent = `📏 Measure: ${curDist.toFixed(2)}m from Point #${pts.length}${snapBadge} | UTM: (${state.measureTool.cursorPt.x.toFixed(2)}, ${state.measureTool.cursorPt.y.toFixed(2)})`;
        } else if (snap) {
          coordsBar.textContent = `📏 Measure: ${snapBadge} | UTM: (${snap.worldPt.x.toFixed(2)}, ${snap.worldPt.y.toFixed(2)})`;
        }
        redrawTrueCanvas();
        return;
      }

      // 0. Custom Polygon node dragging active (highest priority during drag)
      if (state.draggingCustomPolyNode !== null) {
        const curV = state.customPolygon.vertices[state.draggingCustomPolyNode];
        const snap = state.customPolygon.snapEnabled ? findCustomPolySnapTarget(mouseX, mouseY, vp, h, state.draggingCustomPolyNode) : null;
        state.customPolySnapTarget = snap;
        if (snap) {
          curV.x = snap.worldPt.x;
          curV.y = snap.worldPt.y;
          curV.anchor = snap.anchor ? { ...snap.anchor } : null;
          coordsBar.textContent = `Custom Node #${state.draggingCustomPolyNode + 1}: (${curV.x.toFixed(2)}, ${curV.y.toFixed(2)})${curV.anchor ? " [Anchored ⚓]" : ""}`;
        } else {
          curV.x = p.x;
          curV.y = p.y;
          curV.anchor = null;
          coordsBar.textContent = `Custom Node #${state.draggingCustomPolyNode + 1}: (${curV.x.toFixed(2)}, ${curV.y.toFixed(2)})`;
        }
        recomputeCustomPolygonMetrics();
        redrawTrueCanvas();
        return;
      }

      // Hover detection over temporary reference markers
      if (!isPanning && !draggingAnchor && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null && !state.draggingDeedNode && !state.draggingFieldNode && !state.draggingTempMarker) {
        const markerHit = findTempMarkerAt(mouseX, mouseY, vp, h);
        const prevMarkerHover = state.hoverTempMarker;
        state.hoverTempMarker = markerHit ? { id: markerHit.marker.id, marker: markerHit.marker, screenPt: markerHit.screenPt } : null;
        if (markerHit) {
          trueCanvas.style.cursor = "move";
          coordsBar.textContent = `📍 Marker ${markerHit.marker.label}: (${markerHit.marker.x.toFixed(2)}, ${markerHit.marker.y.toFixed(2)}) | Drag to move, Right-click to delete`;
          redrawTrueCanvas();
          return;
        } else if (prevMarkerHover !== null) {
          redrawTrueCanvas();
        }
      }

      // Edit Field Nodes mode: hover detection over field vertices on canvas
      if (state.editFieldNodes && !isPanning && !draggingAnchor && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null && !state.draggingFieldNode && !state.draggingTempMarker) {
        const fieldHit = findFieldNodeOnTrueCanvas(mouseX, mouseY, vp, h);
        const prevFieldHover = state.hoverFieldNode;
        state.hoverFieldNode = fieldHit;
        if (fieldHit) {
          trueCanvas.style.cursor = "move";
          coordsBar.textContent = `Field Vertex #${fieldHit.ptIdx + 1}: (${fieldHit.fieldPt.x.toFixed(2)}, ${fieldHit.fieldPt.y.toFixed(2)})`;
          redrawTrueCanvas();
          return;
        } else if (prevFieldHover !== null) {
          redrawTrueCanvas();
        }
      }

      // If Marker Tool is active on open canvas, set crosshair
      if (state.markerToolActive && !isPanning && !draggingAnchor && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null && !state.draggingTempMarker) {
        trueCanvas.style.cursor = "crosshair";
      }

      // 0. Edit Deed Nodes mode: hover detection over deed vertices on field canvas
      if (state.editDeedNodes && !isPanning && !draggingAnchor && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null && !state.draggingDeedNode && !state.draggingFieldNode && !state.draggingTempMarker) {
        const deedHit = findDeedNodeOnTrueCanvas(mouseX, mouseY, vp, h);
        const prevHover = state.hoverDeedNode;
        state.hoverDeedNode = deedHit;
        if (deedHit) {
          trueCanvas.style.cursor = "move";
          coordsBar.textContent = `Deed Node #${deedHit.ptIdx + 1}: Deed (${deedHit.deedPt.x.toFixed(1)}, ${deedHit.deedPt.y.toFixed(1)}) → Field (${deedHit.warpedPt.x.toFixed(2)}, ${deedHit.warpedPt.y.toFixed(2)})`;
          redrawTrueCanvas();
          return;
        } else if (prevHover !== null) {
          redrawTrueCanvas();
        }
      }

      // 1. Node dragging active
      if (state.draggingUserPolyNode !== null) {
        const curVertex = state.userPolygon.vertices[state.draggingUserPolyNode];
        const isFixed = isVertexFixedAnchor(state.userPolygon, state.draggingUserPolyNode);

        if (isFixed) {
          let deedAnchor = state.dragDeedAnchor;
          if (!deedAnchor && curVertex && curVertex.deedPt) {
            let warper = null;
            const activeAnchors = getActiveAnchors();
            if (activeAnchors.length >= 2) {
              try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
            }
            const w = warper ? warper(curVertex.deedPt) : { x: curVertex.deedPt.x, y: curVertex.deedPt.y };
            deedAnchor = { x: w.x, y: w.y, deedPt: curVertex.deedPt };
            curVertex.origX = w.x;
            curVertex.origY = w.y;
            state.dragDeedAnchor = deedAnchor;
          }
          const ox = deedAnchor ? deedAnchor.x : (curVertex.origX ?? curVertex.x);
          const oy = deedAnchor ? deedAnchor.y : (curVertex.origY ?? curVertex.y);
          const targetPt = {
            x: ox,
            y: oy,
            deedPt: curVertex ? curVertex.deedPt : null,
            origX: ox,
            origY: oy
          };
          state.userPolygon.vertices[state.draggingUserPolyNode] = targetPt;
          coordsBar.textContent = `Polygon Node #${state.draggingUserPolyNode + 1}: Locked to Fixed Anchor (0.00m buffer)`;
          recomputeUserPolygonMetrics();
          redrawTrueCanvas();
          return;
        }

        const is1073 = (!state.activeDeed || state.activeDeed === "1073");
        const isConstrained = is1073 && state.constrainPolyToDeed && state.optBufferRadius > 0 && vertexIsDeedConstrained(state.userPolygon, state.draggingUserPolyNode);
        const snap = (!state.constrainPolyToDeed) ? getPolygonSnapTarget(mouseX, mouseY, vp, h, state.draggingUserPolyNode) : null;
        state.currentSnapTarget = snap;
        let targetPt = snap ? {
          x: snap.worldPt.x,
          y: snap.worldPt.y,
          deedPt: snap.deedPt ? { x: snap.deedPt.x, y: snap.deedPt.y } : (curVertex ? curVertex.deedPt : null),
          origX: curVertex ? curVertex.origX : undefined,
          origY: curVertex ? curVertex.origY : undefined
        } : {
          x: p.x,
          y: p.y,
          deedPt: curVertex ? curVertex.deedPt : null,
          origX: curVertex ? curVertex.origX : undefined,
          origY: curVertex ? curVertex.origY : undefined
        };

        // If Constrain to Deed Vertices is checked: clamp polygon node inside Pen Buffer of deed vertex ONLY if vertex is deed-constrained
        if (isConstrained) {
          let deedAnchor = state.dragDeedAnchor;
          if (!deedAnchor && curVertex && curVertex.deedPt) {
            let warper = null;
            const activeAnchors = getActiveAnchors();
            if (activeAnchors.length >= 2) {
              try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
            }
            const w = warper ? warper(curVertex.deedPt) : { x: curVertex.deedPt.x, y: curVertex.deedPt.y };
            deedAnchor = { x: w.x, y: w.y, deedPt: curVertex.deedPt };
            curVertex.origX = w.x;
            curVertex.origY = w.y;
            state.dragDeedAnchor = deedAnchor;
          }

          if (deedAnchor) {
            const R = state.optBufferRadius;
            const dist = Math.hypot(p.x - deedAnchor.x, p.y - deedAnchor.y);
            if (dist > R) {
              // Dragged outside the buffer circle: clamp polygon vertex to circle perimeter
              const angle = Math.atan2(p.y - deedAnchor.y, p.x - deedAnchor.x);
              targetPt = {
                x: deedAnchor.x + R * Math.cos(angle),
                y: deedAnchor.y + R * Math.sin(angle),
                deedPt: curVertex ? curVertex.deedPt : null,
                origX: deedAnchor.x,
                origY: deedAnchor.y
              };
            } else {
              // Inside the buffer circle: polygon vertex moves freely with cursor inside buffer!
              targetPt = {
                x: p.x,
                y: p.y,
                deedPt: curVertex ? curVertex.deedPt : null,
                origX: deedAnchor.x,
                origY: deedAnchor.y
              };
            }
          }
        }

        state.userPolygon.vertices[state.draggingUserPolyNode] = targetPt;
        if (isConstrained && targetPt.origX != null) {
          const shift = Math.hypot(targetPt.x - targetPt.origX, targetPt.y - targetPt.origY);
          coordsBar.textContent = `Polygon Node #${state.draggingUserPolyNode + 1}: (${targetPt.x.toFixed(2)}, ${targetPt.y.toFixed(2)}) | Deed offset: ${shift.toFixed(2)}m (max ±${state.optBufferRadius.toFixed(1)}m)`;
        }
        recomputeUserPolygonMetrics();
        redrawTrueCanvas();
        return;
      }

      // 2. Anchor Mode active: prioritize anchor pin hovering and snap indicator on field/reference DXF vertices
      if (state.toolMode === "anchor") {
        if (!isPanning && !draggingAnchor) {
          const hit = hitTestAnchor(mouseX, mouseY, false);
          trueCanvas.style.cursor = hit ? "move" : "crosshair";

          // If pending source anchor is set, detect nearest vertex (field or ref DXF) and show snap indicator
          if (!hit && state.pendingSource) {
            const nearestField = findNearestFieldVertex(p);
            if (nearestField && (nearestField.dist * vp.scale <= 18 || (state.constrainAnchorsToField && nearestField.dist <= state.optBufferRadius))) {
              const sp = worldToScreenGIS(nearestField, vp, h);
              state.currentSnapTarget = {
                worldPt: { x: nearestField.x, y: nearestField.y },
                screenPt: sp,
                sourceType: "field"
              };
              coordsBar.textContent = `Field Snap Vertex: (${nearestField.x.toFixed(2)}, ${nearestField.y.toFixed(2)}) [${nearestField.dist.toFixed(2)}m away]`;
              redrawTrueCanvas();
              return;
            }
          }
        }
        if (state.currentSnapTarget !== null) {
          state.currentSnapTarget = null;
          redrawTrueCanvas();
        }
        return;
      }

      // 2.5. Custom Polygon draw mode active
      if (state.customPolygon && state.customPolygon.drawMode) {
        state.customPolyCursorPt = { x: mouseX, y: mouseY };
        state.customPolySnapTarget = state.customPolygon.snapEnabled ? findCustomPolySnapTarget(mouseX, mouseY, vp, h) : null;
        trueCanvas.style.cursor = "crosshair";
        if (state.customPolySnapTarget) {
          coordsBar.textContent = `Snap: ${state.customPolySnapTarget.label} | (${state.customPolySnapTarget.worldPt.x.toFixed(2)}, ${state.customPolySnapTarget.worldPt.y.toFixed(2)})`;
        } else {
          coordsBar.textContent = `Custom Poly: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
        }
        redrawTrueCanvas();
        return;
      }

      // 3. Pan Mode: Hovering/drawing user polygon (creating, snapping, and dragging nodes)
      const is1073 = (!state.activeDeed || state.activeDeed === "1073");
      if (is1073 && state.userPolygon && (state.userPolygon.drawMode || state.userPolygon.vertices.length > 0)) {
        const snap = getPolygonSnapTarget(mouseX, mouseY, vp, h);
        state.currentSnapTarget = snap;
        let hitNode = findUserPolyNodeAt(mouseX, mouseY, vp, h);
        if (hitNode < 0 && state.constrainPolyToDeed && state.userPolygon && state.userPolygon.vertices) {
          const HIT_RADIUS = 14;
          let warper = null;
          const activeAnchors = getActiveAnchors();
          if (activeAnchors.length >= 2) {
            try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
          }
          for (let i = 0; i < state.userPolygon.vertices.length; i++) {
            if (!vertexIsDeedConstrained(state.userPolygon, i)) continue;
            const v = state.userPolygon.vertices[i];
            const deedPt = v.origX != null && v.origY != null ? { x: v.origX, y: v.origY } : (v.deedPt ? (warper ? warper(v.deedPt) : v.deedPt) : null);
            if (deedPt) {
              const sp = worldToScreenGIS(deedPt, vp, h);
              if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) {
                hitNode = i;
                break;
              }
            }
          }
        }
        let hitSeg = null;
        if (!state.userPolygon.drawMode && hitNode < 0 && state.userPolygon.vertices.length >= 2) {
          hitSeg = findUserPolySegmentAt(mouseX, mouseY, vp, h, 10);
        }

        state.hoverPolyNode = hitNode >= 0 ? hitNode : null;
        state.hoverPolySegment = hitSeg;

        if (!isPanning) {
          if (hitNode >= 0) {
            trueCanvas.style.cursor = "move";
            coordsBar.textContent = `Polygon Node #${hitNode + 1}: (${state.userPolygon.vertices[hitNode].x.toFixed(2)}, ${state.userPolygon.vertices[hitNode].y.toFixed(2)}) — Drag to move • Right-click to delete`;
          } else if (hitSeg) {
            trueCanvas.style.cursor = "pointer";
            coordsBar.textContent = `Double-click line to add vertex on Seg ${hitSeg.segIdx + 1}: (${hitSeg.worldPt.x.toFixed(2)}, ${hitSeg.worldPt.y.toFixed(2)})`;
          } else {
            trueCanvas.style.cursor = state.userPolygon.drawMode ? "crosshair" : "grab";
          }
        }
        redrawTrueCanvas();
      }

      // 4. Custom Polygon hover detection across all visible polygons
      if ((state.customPolygons || []).length > 0 && (!state.customPolygon || !state.customPolygon.drawMode) && state.toolMode === "pan" && !isPanning && !draggingAnchor && state.draggingUserPolyNode === null && state.draggingCustomPolyNode === null) {
        const anyHitNode = findAnyCustomPolyNodeAt(mouseX, mouseY, vp, h);
        const anyHitSeg = !anyHitNode ? findAnyCustomPolySegmentAt(mouseX, mouseY, vp, h, 10) : null;
        const hitPolyInterior = (!anyHitNode && !anyHitSeg) ? findCustomPolyAt(mouseX, mouseY, vp, h) : -1;

        const prevCustNode = state.hoverCustomPolyNode;
        const prevCustSeg = state.hoverCustomPolySegment;
        state.hoverCustomPolyNode = (anyHitNode && anyHitNode.polyIdx === state.activeCustomPolyIndex) ? anyHitNode.nodeIdx : null;
        state.hoverCustomPolySegment = (anyHitSeg && anyHitSeg.polyIdx === state.activeCustomPolyIndex) ? anyHitSeg : null;

        if (anyHitNode) {
          const targetPoly = state.customPolygons[anyHitNode.polyIdx];
          const cv = targetPoly.vertices[anyHitNode.nodeIdx];
          const isAct = (anyHitNode.polyIdx === state.activeCustomPolyIndex);
          trueCanvas.style.cursor = isAct ? "move" : "pointer";
          const ancTag = cv.anchor ? (cv.anchor.type === 'deed' ? " [Deed 📜]" : " [Anchored ⚓]") : "";
          coordsBar.textContent = isAct ?
            `${targetPoly.name} Node #${anyHitNode.nodeIdx + 1}: (${cv.x.toFixed(2)}, ${cv.y.toFixed(2)})${ancTag} — Drag to move • Right-click to delete` :
            `Click to select ${targetPoly.name} Node #${anyHitNode.nodeIdx + 1} (${cv.x.toFixed(2)}, ${cv.y.toFixed(2)})`;
          redrawTrueCanvas();
          return;
        } else if (anyHitSeg) {
          const targetPoly = state.customPolygons[anyHitSeg.polyIdx];
          const isAct = (anyHitSeg.polyIdx === state.activeCustomPolyIndex);
          trueCanvas.style.cursor = "pointer";
          coordsBar.textContent = isAct ?
            `Double-click ${targetPoly.name} segment ${anyHitSeg.segIdx + 1} to add point` :
            `Click to select ${targetPoly.name} on segment ${anyHitSeg.segIdx + 1}`;
          redrawTrueCanvas();
          return;
        } else if (hitPolyInterior >= 0 && hitPolyInterior !== state.activeCustomPolyIndex) {
          const targetPoly = state.customPolygons[hitPolyInterior];
          trueCanvas.style.cursor = "pointer";
          coordsBar.textContent = `Click to select and edit ${targetPoly.name}`;
          if (prevCustNode !== null || prevCustSeg !== null) redrawTrueCanvas();
          return;
        } else if (prevCustNode !== null || prevCustSeg !== null) {
          redrawTrueCanvas();
        }
      }
    });

    trueCanvas.addEventListener("mouseleave", () => {
      const labelTooltipEl = document.getElementById("segment-label-tooltip");
      if (labelTooltipEl) labelTooltipEl.style.display = "none";
      const anchorTooltipEl = document.getElementById("anchor-photo-tooltip");
      if (anchorTooltipEl) anchorTooltipEl.style.display = "none";
      if (state.measureTool && state.measureTool.active) {
        state.measureTool.cursorPt = null;
        state.currentSnapTarget = null;
        redrawTrueCanvas();
      }
      if (state.hoverPolyNode !== null || state.hoverPolySegment !== null || state.currentSnapTarget !== null) {
        state.hoverPolyNode = null;
        state.hoverPolySegment = null;
        state.currentSnapTarget = null;
        redrawTrueCanvas();
      }
      if (state.hoverCustomPolyNode !== null || state.hoverCustomPolySegment !== null || state.customPolySnapTarget !== null || state.customPolyCursorPt !== null) {
        state.hoverCustomPolyNode = null;
        state.hoverCustomPolySegment = null;
        state.customPolySnapTarget = null;
        state.customPolyCursorPt = null;
        redrawTrueCanvas();
      }
    });

    histCanvas.addEventListener("wheel", e => {
      e.preventDefault();
      const r = histCanvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const vp = state.histViewport;
      const wx = (mx - vp.offsetX) / vp.scale;
      const wy = (my - vp.offsetY) / vp.scale;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      vp.scale = Math.min(Math.max(vp.scale * factor, 0.001), 500);
      vp.offsetX = mx - wx * vp.scale;
      vp.offsetY = my - wy * vp.scale;
      redrawAll();
    }, { passive: false });

    trueCanvas.addEventListener("wheel", e => {
      e.preventDefault();
      const r = trueCanvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const vp = state.trueViewport;
      const wx = (mx - vp.offsetX) / vp.scale;
      const wy = (trueCanvas.height - my - vp.offsetY) / vp.scale;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      vp.scale = Math.min(Math.max(vp.scale * factor, 0.001), 500);
      vp.offsetX = mx - wx * vp.scale;
      vp.offsetY = (trueCanvas.height - my) - wy * vp.scale;
      redrawAll();
    }, { passive: false });

    histCanvas.addEventListener("mousedown", e => handleMouseDown(e, histCanvas, state.histViewport, true));
    histCanvas.addEventListener("mouseup",   e => handleMouseUp(e, histCanvas, state.histViewport, true));
    histCanvas.addEventListener("contextmenu", e => e.preventDefault());
    histCanvas.addEventListener("dblclick", function(e) {
      const rect = histCanvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const labelHit = hitTestAnchorLabel(sx, sy, true);
      if (labelHit) {
        e.preventDefault();
        delete labelHit.anc.labelOffsetSrc;
        updateStatus(`Anchor #${labelHit.anc.id} label position reset to default.`);
        redrawAll();
      }
    });
    trueCanvas.addEventListener("mousedown", e => handleMouseDown(e, trueCanvas, state.trueViewport, false));
    trueCanvas.addEventListener("mouseup", e => {
      if (state.activeDeedHandle !== null) {
        state.activeDeedHandle = null;
        state.deedDragStart = null;
        trueCanvas.style.cursor = "default";
        updateDeedScaleDisplay();
        updateUserPolygonWarp();
        updateCustomPolygonAnchors();
        const ratioVal = state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0);
        updateStatus(`📐 Deed Squeeze adjusted: ${(ratioVal * 100).toFixed(1)}%. Anchors 1 & 2 locked (0.0 m drift).`);
        return;
      }
      if (state.draggingTestAxisHandle) {
        state.draggingTestAxisHandle = null;
        trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
        updateStatus("📐 Test axis handle updated. Attached anchors adjusted.");
        redrawAll();
        return;
      }
      handleMouseUp(e, trueCanvas, state.trueViewport, false);
    });

    // Double-click on polygon segment to insert a new vertex (or close measuring polygon)
    trueCanvas.addEventListener("dblclick", function(e) {
      if (state.measureTool && state.measureTool.active) {
        if (state.measureTool.points.length >= 3) {
          e.preventDefault();
          state.measureTool.closed = true;
          updateMeasureHUD();
          redrawTrueCanvas();
        }
        return;
      }

      const rect = trueCanvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

      // Double-click on Anchor Label -> reset to default position
      const labelHit = hitTestAnchorLabel(sx, sy, false);
      if (labelHit) {
        e.preventDefault();
        delete labelHit.anc.labelOffsetDst;
        updateStatus(`Anchor #${labelHit.anc.id} label position reset to default.`);
        redrawAll();
        return;
      }
      if (state.toolMode === "anchor") return;
      const vp = state.trueViewport, h = trueCanvas.height;

      // Double-click while drawing custom polygon -> close polygon
      if (state.customPolygon && state.customPolygon.drawMode && state.customPolygon.vertices && state.customPolygon.vertices.length >= 3) {
        const p = state.customPolygon;
        const verts = p.vertices;
        if (verts.length >= 2) {
          const last = verts[verts.length - 1];
          const prev = verts[verts.length - 2];
          if (Math.hypot(last.x - prev.x, last.y - prev.y) < 1e-3) {
            verts.pop();
          }
        }
        if (verts.length >= 3) {
          e.preventDefault();
          p.closed = true;
          p.drawMode = false;
          state.customPolySnapTarget = null;
          state.customPolyCursorPt = null;
          if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
          updateCustomPolyButtonStates();
          recomputeCustomPolygonMetrics();
          renderCustomPolyList();
          updateStatus(`${p.name} closed ✓`);
          redrawTrueCanvas();
          return;
        }
      }

      // Check custom polygon segment double-click insertion across all visible polygons
      if (!state.customPolygon || !state.customPolygon.drawMode) {
        const hitAnyNode = findAnyCustomPolyNodeAt(sx, sy, vp, h);
        if (!hitAnyNode) {
          const hitCustomSeg = findAnyCustomPolySegmentAt(sx, sy, vp, h, 14);
          if (hitCustomSeg) {
            e.preventDefault();
            if (hitCustomSeg.polyIdx !== state.activeCustomPolyIndex) {
              setActiveCustomPolygon(hitCustomSeg.polyIdx);
            }
            const activeP = state.customPolygon;
            const insertIdx = hitCustomSeg.segIdx + 1;
            const snap = activeP.snapEnabled ? findCustomPolySnapTarget(sx, sy, vp, h) : null;
            const newPt = snap ? {
              x: snap.worldPt.x,
              y: snap.worldPt.y,
              anchor: snap.anchor ? { ...snap.anchor } : null
            } : {
              x: hitCustomSeg.worldPt.x,
              y: hitCustomSeg.worldPt.y,
              anchor: null
            };
            activeP.vertices.splice(insertIdx, 0, newPt);
            recomputeCustomPolygonMetrics();
            updateCustomPolyButtonStates();
            renderCustomPolyList();
            state.hoverCustomPolyNode = insertIdx;
            state.hoverCustomPolySegment = null;
            const ancDesc = newPt.anchor ? ` [Anchored to ${newPt.anchor.type === 'deed' ? 'Deed 📜' : newPt.anchor.type}]` : '';
            updateStatus(`➕ Double-click added vertex #${insertIdx + 1} to ${activeP.name}${ancDesc}.`);
            redrawTrueCanvas();
            return;
          }
        }
      }

      const poly = state.userPolygon;

      // Double-click while drawing user polygon -> close polygon
      if (poly && poly.drawMode && poly.vertices && poly.vertices.length >= 3) {
        if (poly.vertices.length >= 2) {
          const last = poly.vertices[poly.vertices.length - 1];
          const prev = poly.vertices[poly.vertices.length - 2];
          if (Math.hypot(last.x - prev.x, last.y - prev.y) < 1e-3) {
            poly.vertices.pop();
            poly.segmentLengths.pop();
          }
        }
        if (poly.vertices.length >= 3) {
          e.preventDefault();
          poly.closed = true;
          poly.drawMode = false;
          const uCancel = document.getElementById("btn-cancel-polygon");
          if (uCancel) uCancel.style.display = "none";
          const uClose = document.getElementById("btn-close-polygon");
          if (uClose) uClose.style.display = "none";
          if (typeof trueCanvas !== "undefined") trueCanvas.style.cursor = state.toolMode === "pan" ? "grab" : "crosshair";
          rebuildSegmentInputs();
          recomputeUserPolygonMetrics();
          updatePolygonButtonStates();
          updateStatus("Polygon closed ✓");
          redrawTrueCanvas();
          return;
        }
      }

      if (!poly || poly.drawMode || !poly.vertices || poly.vertices.length < 2) return;

      const hitNode = findUserPolyNodeAt(sx, sy, vp, h);
      if (hitNode >= 0) return; // Ignore double clicks directly on an existing node

      const hitSeg = findUserPolySegmentAt(sx, sy, vp, h, 14);
      if (hitSeg) {
        e.preventDefault();
        const insertIdx = hitSeg.segIdx + 1;
        poly.vertices.splice(insertIdx, 0, hitSeg.worldPt);
        poly.segmentLengths.splice(insertIdx, 0, null);
        while (poly.segmentLengths.length < poly.vertices.length) poly.segmentLengths.push(null);

        rebuildSegmentInputs();
        recomputeUserPolygonMetrics();
        updatePolygonButtonStates();

        state.hoverPolyNode = insertIdx;
        state.hoverPolySegment = null;
        updateStatus(`➕ Double-click added vertex #${insertIdx + 1} on Segment ${hitSeg.segIdx + 1}.`);
        redrawTrueCanvas();
      }
    });

    // Fit/center buttons
    document.getElementById("btn-fit-hist").addEventListener("click", () => {
      fitHistoricalView();
      redrawAll(); updateStatus("Centered deed map view.");
    });
    document.getElementById("btn-fit-true").addEventListener("click", () => {
      fitTrueFieldView();
      redrawAll(); updateStatus("Centered field survey view.");
    });

    // Algorithm & overlay controls
    algorithmSelect.value = state.algorithm;
    algorithmSelect.addEventListener("change", e => {
      state.algorithm=e.target.value; redrawAll();
      updateStatus(`Switched to: ${e.target.options[e.target.selectedIndex].text}`);
    });
    chkShowOverlay.addEventListener("change", e => { state.showOverlay=e.target.checked; redrawAll(); });

    // ── Overlays & Opacity Layer Visibility Controls ────────────────
    function syncGlobalOverlaysCheckbox() {
      const globalChk = document.getElementById("chk-toggle-all-overlays");
      if (!globalChk) return;

      const overlayChecks = [
        document.getElementById("chk-show-warped-pdf"),
        document.getElementById("chk-show-warped-dxf"),
        document.getElementById("chk-show-true-dxf"),
        document.getElementById("chk-show-survey-valoy-2025"),
        document.getElementById("chk-show-survey-cortez-2025"),
        document.getElementById("chk-show-user-polygon")
      ];

      (state.refDxfFiles || []).forEach(ref => {
        const chk = document.getElementById(`chk-ref-vis-${ref.id}`);
        if (chk) overlayChecks.push(chk);
      });

      const validChecks = overlayChecks.filter(c => c !== null);
      if (validChecks.length === 0) return;

      const numChecked = validChecks.filter(c => c.checked).length;
      if (numChecked === validChecks.length) {
        globalChk.checked = true;
        globalChk.indeterminate = false;
      } else if (numChecked === 0) {
        globalChk.checked = false;
        globalChk.indeterminate = false;
      } else {
        globalChk.checked = false;
        globalChk.indeterminate = true;
      }
    }

    const chkShowGeoTiff = document.getElementById("chk-show-geotiff");
    if (chkShowGeoTiff) {
      chkShowGeoTiff.addEventListener("change", e => {
        state.showGeoTiff = e.target.checked;
        redrawTrueCanvas();
      });
    }

    const chkShowWarpedPdf = document.getElementById("chk-show-warped-pdf");
    if (chkShowWarpedPdf) {
      chkShowWarpedPdf.addEventListener("change", e => {
        state.showWarpedPdf = e.target.checked;
        redrawAll();
        syncGlobalOverlaysCheckbox();
      });
    }

    const chkShowDeedMeshWireframe = document.getElementById("chk-show-deed-mesh-wireframe");
    if (chkShowDeedMeshWireframe) {
      chkShowDeedMeshWireframe.addEventListener("change", e => {
        state.showDeedMeshWireframe = e.target.checked;
        redrawTrueCanvas();
      });
    }

    const sliderDeedMeshRes = document.getElementById("slider-deed-mesh-res");
    const deedMeshResVal = document.getElementById("deed-mesh-res-val");
    if (sliderDeedMeshRes) {
      sliderDeedMeshRes.addEventListener("input", e => {
        const val = parseInt(e.target.value, 10) || 64;
        state.deedMeshRes = val;
        if (deedMeshResVal) deedMeshResVal.textContent = val;
        redrawTrueCanvas();
      });
    }

    const chkShowWarpedDxf = document.getElementById("chk-show-warped-dxf");
    if (chkShowWarpedDxf) {
      chkShowWarpedDxf.addEventListener("change", e => {
        state.showWarpedDxf = e.target.checked;
        redrawTrueCanvas();
        syncGlobalOverlaysCheckbox();
      });
    }

    const chkShowMojones1073 = document.getElementById("chk-show-mojones-1073");
    if (chkShowMojones1073) {
      chkShowMojones1073.addEventListener("change", e => {
        state.showMojones1073 = e.target.checked;
        (state.anchors || []).forEach(a => {
          a.showLabel = e.target.checked;
        });
        document.querySelectorAll(".chk-anchor-showlabel").forEach(chk => {
          chk.checked = e.target.checked;
        });
        chkShowMojones1073.indeterminate = false;
        redrawAll();
      });
    }

    const chkShowTrueDxf = document.getElementById("chk-show-true-dxf");
    if (chkShowTrueDxf) {
      chkShowTrueDxf.addEventListener("change", e => {
        state.showTrueDxf = e.target.checked;
        redrawTrueCanvas();
        syncGlobalOverlaysCheckbox();
      });
    }

    const chkShowValoy2025 = document.getElementById("chk-show-survey-valoy-2025");
    if (chkShowValoy2025) {
      chkShowValoy2025.addEventListener("change", e => {
        state.showSurveyValoy2025 = e.target.checked;
        redrawTrueCanvas();
        syncGlobalOverlaysCheckbox();
      });
    }

    const chkShowCortez2025 = document.getElementById("chk-show-survey-cortez-2025");
    if (chkShowCortez2025) {
      chkShowCortez2025.addEventListener("change", e => {
        state.showSurveyCortez2025 = e.target.checked;
        redrawTrueCanvas();
        syncGlobalOverlaysCheckbox();
      });
    }

    const chkShowUserPolygon = document.getElementById("chk-show-user-polygon");
    if (chkShowUserPolygon) {
      chkShowUserPolygon.addEventListener("change", e => {
        if (state.userPolygon) state.userPolygon.show = e.target.checked;
        redrawTrueCanvas();
        syncGlobalOverlaysCheckbox();
      });
    }

    const inputUserPolyFillColor = document.getElementById("user-poly-fill-color");
    if (inputUserPolyFillColor) {
      inputUserPolyFillColor.addEventListener("input", e => {
        if (state.userPolygon) state.userPolygon.fillColor = e.target.value;
        redrawTrueCanvas();
      });
    }

    const sliderUserPolyFillOpacity = document.getElementById("user-poly-fill-opacity");
    const valUserPolyFillOpacity = document.getElementById("user-poly-fill-opacity-val");
    if (sliderUserPolyFillOpacity) {
      sliderUserPolyFillOpacity.addEventListener("input", e => {
        const val = parseInt(e.target.value, 10) || 0;
        if (valUserPolyFillOpacity) valUserPolyFillOpacity.textContent = val + "%";
        if (state.userPolygon) state.userPolygon.fillOpacity = val / 100;
        redrawTrueCanvas();
      });
    }

    const chkToggleAllOverlays = document.getElementById("chk-toggle-all-overlays");
    if (chkToggleAllOverlays) {
      chkToggleAllOverlays.addEventListener("change", e => {
        const show = e.target.checked;
        state.showWarpedPdf = show;
        state.showWarpedDxf = show;
        state.showTrueDxf = show;
        state.showSurveyValoy2025 = show;
        state.showSurveyCortez2025 = show;
        if (state.userPolygon) state.userPolygon.show = show;
        (state.refDxfFiles || []).forEach(ref => { ref.visible = show; });

        if (chkShowWarpedPdf) chkShowWarpedPdf.checked = show;
        if (chkShowWarpedDxf) chkShowWarpedDxf.checked = show;
        if (chkShowTrueDxf) chkShowTrueDxf.checked = show;
        if (chkShowValoy2025) chkShowValoy2025.checked = show;
        if (chkShowCortez2025) chkShowCortez2025.checked = show;
        if (chkShowUserPolygon) chkShowUserPolygon.checked = show;

        (state.refDxfFiles || []).forEach(ref => {
          const chkRef = document.getElementById(`chk-ref-vis-${ref.id}`);
          if (chkRef) chkRef.checked = show;
        });

        redrawTrueCanvas();
      });
    }

    // Collapsible main panel cards (Overlays, Anchors, Boundary Reconstructed, Custom Polygons)
    document.querySelectorAll(".panel-card > .panel-header[data-target]").forEach(header => {
      header.addEventListener("click", e => {
        if (e.target.closest("button:not(.btn-panel-toggle)") || e.target.closest("input") || e.target.closest("label") || e.target.closest("a")) return;
        const targetId = header.getAttribute("data-target");
        if (!targetId) return;
        const body = document.getElementById(targetId);
        const toggleBtn = header.querySelector(".btn-panel-toggle");
        if (!body) return;

        const isCollapsed = body.style.display === "none";
        body.style.display = isCollapsed ? "flex" : "none";
        if (toggleBtn) {
          toggleBtn.textContent = isCollapsed ? "▼" : "▶";
          toggleBtn.title = isCollapsed ? "Colapsar panel" : "Desplegar panel";
        }
      });
    });

    // Collapsible group headers and v-buttons
    document.querySelectorAll(".overlay-group-header").forEach(header => {
      header.addEventListener("click", e => {
        if (e.target.closest("#btn-add-ref-dxf-sidebar") || e.target.closest(".opt-hover-wrap")) return;
        const targetId = header.getAttribute("data-target");
        const body = document.getElementById(targetId);
        const toggleBtn = header.querySelector(".btn-group-toggle");
        if (!body) return;

        const isCollapsed = body.style.display === "none";
        body.style.display = isCollapsed ? "flex" : "none";
        if (toggleBtn) {
          toggleBtn.textContent = isCollapsed ? "▼" : "▶";
          toggleBtn.title = isCollapsed ? "Colapsar grupo" : "Desplegar grupo";
        }
      });
    });

    // Anchor management: Save, Load, Clear, Delete
    const btnSaveAnchors = document.getElementById("btn-save-anchors");
    if (btnSaveAnchors) {
      btnSaveAnchors.addEventListener("click", () => {
        if (!state.anchors || state.anchors.length === 0) {
          updateStatus("⚠️ No anchors to save. Place anchor pairs first using 🎯 Anchor Mode.");
          return;
        }
        const toSave = {
          _simulation_metadata: getSimulationMetadata(),
          anchors: state.anchors.map(a => ({
            id: a.id,
            name: a.name || (`#${a.id}`),
            showLabel: a.showLabel !== false,
            image: a.image || null,
            color: a.color,
            src: { x: a.src.x, y: a.src.y },
            dst: { x: a.dst.x, y: a.dst.y },
            active: a.active !== false && a.enabled !== false,
            enabled: a.active !== false && a.enabled !== false,
            axisId: a.axisId !== undefined ? a.axisId : null,
            axisT: a.axisT !== undefined ? a.axisT : null,
            optimize: a.optimize === true
          })),
          testAxes: (state.testAxes || []).map(ax => ({
            id: ax.id,
            name: ax.name,
            p1: { x: ax.p1.x, y: ax.p1.y },
            p2: { x: ax.p2.x, y: ax.p2.y },
            color: ax.color,
            visible: ax.visible !== false
          }))
        };
        try {
          localStorage.setItem("georectifier_axes_anchors", JSON.stringify(toSave));
        } catch (_) {}
        const jsonStr = JSON.stringify(toSave, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const outFileName = state.activeDeed === "196" ? "anchors_196.json" : "anchors_georectifier.json";
        a.download = outFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        updateStatus(`💾 Saved ${state.anchors.length} anchors & ${(state.testAxes || []).length} axes to ${outFileName}.`);
        openSaveCompanionReminderModal("anchors");
      });
    }

    const anchorFileInput = document.getElementById("anchor-file-input");
    if (anchorFileInput) {
      anchorFileInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            if (data._simulation_metadata) {
              restoreSimulationMetadata(data._simulation_metadata);
            }
            if (data.testAxes && Array.isArray(data.testAxes)) {
              state.testAxes = data.testAxes.map(ax => ({ ...ax }));
              if (typeof ensureUniqueTestAxisIds === "function") ensureUniqueTestAxisIds();
              else if (typeof syncTestAxisCounter === "function") syncTestAxisCounter();
              if (typeof renderTestAxesList === "function") renderTestAxesList();
            }
            const list = Array.isArray(data) ? data : (data.anchors || data.anchors1073 || []);
            if (list.length > 0) {
              applyAnchors(list);
              state.pendingSource = null;
              redrawAll();
              updateStatus(`✅ Loaded ${state.anchors.length} anchors & ${(state.testAxes || []).length} axes from ${file.name}`);
            } else {
              updateStatus("⚠️ No valid anchor pairs found in file.");
            }
          } catch (err) {
            updateStatus(`❌ Failed to parse anchor file: ${err.message}`);
          }
        };
        reader.readAsText(file);
      });
    }

    btnClearAnchors.addEventListener("click", () => {
      state.anchors = [];
      state.pendingSource = null;
      redrawAll();
      updateStatus("Cleared all anchors.");
    });

    function setConstrainAnchorsToField(val, triggerEl = null) {
      state.constrainAnchorsToField = !!val;
      ["chk-constrain-anchors", "chk-constrain-anchors-196", "chk-constrain-anchors-196-opt"].forEach(id => {
        const el = document.getElementById(id);
        if (el && el !== triggerEl) el.checked = state.constrainAnchorsToField;
      });
      if (state.constrainAnchorsToField) {
        updateStatus(`🔒 Constraint active: vertices & anchors clamped within ±${state.optBufferRadius.toFixed(1)}m of survey vertices or temporary markers.`);
      } else {
        updateStatus("🔓 Constraint disabled: free placement & optimization without survey vertex clamping.");
      }
      redrawTrueCanvas();
    }

    ["chk-constrain-anchors", "chk-constrain-anchors-196", "chk-constrain-anchors-196-opt"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", e => {
          setConstrainAnchorsToField(e.target.checked, e.target);
        });
      }
    });

    const chkConstrainDeedVertices = document.getElementById("chk-constrain-deed-vertices");
    const chkPolygonSnap = document.getElementById("chk-polygon-snap");

    function applyDeedConstraints(verbose = true) {
      if (state.activeDeed && state.activeDeed !== "1073") {
        redrawTrueCanvas();
        return;
      }
      const chkPolygonSnap = document.getElementById("chk-polygon-snap");
      if (state.constrainPolyToDeed) {
        if (chkPolygonSnap && chkPolygonSnap.checked) {
          chkPolygonSnap.checked = false;
        }
        state.currentSnapTarget = null;
        if (state.userPolygon && state.userPolygon.vertices) {
          let warper = null;
          const activeAnchors = getActiveAnchors();
          if (activeAnchors.length >= 2) {
            try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
          }
          state.userPolygon.vertices.forEach((v, idx) => {
            if (vertexIsDeedConstrained(state.userPolygon, idx)) {
              if (v.deedPt && warper) {
                const w = warper(v.deedPt);
                v.origX = w.x;
                v.origY = w.y;
                if (isVertexFixedAnchor(state.userPolygon, idx)) {
                  v.x = w.x;
                  v.y = w.y;
                }
              }
            }
          });
        }
        if (verbose) updateStatus(`🔒 Polygon constrained: buffers (±${state.optBufferRadius.toFixed(1)}m) generated around Deed DXF vertices. Drag vertices within buffers.`);
      } else {
        if (verbose) updateStatus("🔓 Polygon constraint disabled: vertices movable freely on map.");
      }
      redrawTrueCanvas();
    }

    function initConstraintsAndBuffers() {
      const chkAnchors = document.getElementById("chk-constrain-anchors");
      const chkAnchors196 = document.getElementById("chk-constrain-anchors-196");
      const chkAnchors196Opt = document.getElementById("chk-constrain-anchors-196-opt");
      const chkDeed = document.getElementById("chk-constrain-deed-vertices");
      if (chkAnchors) state.constrainAnchorsToField = chkAnchors.checked;
      if (chkAnchors196) chkAnchors196.checked = state.constrainAnchorsToField;
      if (chkAnchors196Opt) chkAnchors196Opt.checked = state.constrainAnchorsToField;
      if (chkDeed) {
        chkDeed.checked = true;
        state.constrainPolyToDeed = true;
      }

      if (state.constrainPolyToDeed) {
        applyDeedConstraints(false);
      } else {
        redrawTrueCanvas();
      }
    }

    if (chkConstrainDeedVertices) {
      chkConstrainDeedVertices.addEventListener("change", e => {
        state.constrainPolyToDeed = e.target.checked;
        applyDeedConstraints(true);
      });
    }

    if (chkPolygonSnap) {
      chkPolygonSnap.addEventListener("change", e => {
        if (e.target.checked && state.constrainPolyToDeed) {
          state.constrainPolyToDeed = false;
          if (chkConstrainDeedVertices) chkConstrainDeedVertices.checked = false;
          updateStatus("🔓 Polygon constraint disabled: vertex snapping active.");
          redrawTrueCanvas();
        }
      });
    }

    window.deleteAnchor = function(id) {
      state.anchors = state.anchors.filter(a => a.id !== id);
      redrawAll();
      updateStatus(`Deleted Anchor #${id}. Total remaining: ${state.anchors.length}`);
    };

    // ── Opacity sliders ───────────────────────────────────────────────
    function bindOpacity(id, valId, stateKey, chkId, showStateKey) {
      const el = document.getElementById(id);
      const vl = document.getElementById(valId);
      if (!el) return;
      el.addEventListener("input", e => {
        const val = parseInt(e.target.value, 10);
        state[stateKey] = val / 100;
        vl.textContent = e.target.value + "%";
        if (chkId && showStateKey && val > 0) {
          const chk = document.getElementById(chkId);
          if (chk && !chk.checked) {
            chk.checked = true;
            state[showStateKey] = true;
            if (showStateKey !== "showGeoTiff" && typeof syncGlobalOverlaysCheckbox === "function") {
              syncGlobalOverlaysCheckbox();
            }
          }
        }
        redrawAll();
      });
    }
    bindOpacity("geotiff-opacity",    "geotiff-opacity-val",    "geoTiffOpacity",    "chk-show-geotiff",    "showGeoTiff");
    bindOpacity("warped-pdf-opacity", "warped-pdf-opacity-val", "warpedPdfOpacity", "chk-show-warped-pdf", "showWarpedPdf");
    bindOpacity("warped-dxf-opacity", "warped-dxf-opacity-val", "warpedDxfOpacity", "chk-show-warped-dxf", "showWarpedDxf");
    bindOpacity("true-dxf-opacity",   "true-dxf-opacity-val",   "trueDxfOpacity",   "chk-show-true-dxf",   "showTrueDxf");
    bindOpacity("survey-valoy-2025-opacity", "survey-valoy-2025-opacity-val", "surveyValoy2025Opacity", "chk-show-survey-valoy-2025", "showSurveyValoy2025");
    bindOpacity("survey-cortez-2025-opacity", "survey-cortez-2025-opacity-val", "surveyCortez2025Opacity", "chk-show-survey-cortez-2025", "showSurveyCortez2025");

    // ── Analytics / RMSE panel ────────────────────────────────────────
    const algoCompareList = document.getElementById("algo-compare-list");
    const ALGORITHMS = [
      { key:"SIMILARITY", label:"Helmert (PowerPoint)", minAnchors:2 },
      { key:"AFFINE",     label:"Affine (6-Param)",     minAnchors:3 },
      { key:"TPS",        label:"Thin Plate Spline",    minAnchors:3 },
      { key:"PROJECTIVE", label:"Projective/Homography",minAnchors:4 },
    ];
    const RANK_COLORS = [
      "linear-gradient(90deg,#00e676,#00c853)",
      "linear-gradient(90deg,#ffd600,#ff9100)",
      "linear-gradient(90deg,#ff9100,#ff6d00)",
      "linear-gradient(90deg,#ff1744,#d50000)",
    ];

    function updateAnalyticsUI() {
      const isDeed196 = (state.activeDeed === "196");
      const anchorTableBody196 = document.getElementById("anchor-table-body-196");
      const rmseDisplay196 = document.getElementById("rmse-display-196");

      let warper = null, rmseInfo = { totalRMSE: 0, residuals: [] };
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length >= 2) {
        try {
          warper = TransformMath.createWarper(state.algorithm, activeAnchors);
          rmseInfo = TransformMath.computeRMSE(warper, activeAnchors);
        } catch(_) {}
      }
      const activeCount = activeAnchors.length;
      const totalCount = state.anchors.length;

      // Update RMSE display
      const activeRmseDisplay = isDeed196 ? rmseDisplay196 : rmseDisplay;
      if (activeRmseDisplay) {
        if (activeCount < 2) {
          activeRmseDisplay.textContent = `RMSE: — (${activeCount}/${totalCount} active)`;
        } else if (totalCount > activeCount) {
          activeRmseDisplay.textContent = `RMSE: ${rmseInfo.totalRMSE.toFixed(2)} (${activeCount}/${totalCount} active)`;
        } else {
          activeRmseDisplay.textContent = `RMSE: ${rmseInfo.totalRMSE.toFixed(2)}`;
        }
      }

      if (isDeed196 && anchorTableBody196) {
        // Render 196 Anchor Table
        anchorTableBody196.innerHTML = "";
        state.anchors.forEach(anc => {
          const isEnabled = anc.active !== false && anc.enabled !== false;
          let err = "—";
          if (warper) {
            try {
              const warped = warper(anc.src);
              err = Math.hypot(warped.x - anc.dst.x, warped.y - anc.dst.y).toFixed(2);
            } catch(_) {}
          }
          const tr = document.createElement("tr");
          if (!isEnabled) tr.className = "anchor-row-disabled";
          const ancName = (anc.name && anc.name.trim()) ? anc.name.trim() : (`#${anc.id}`);
          const safeName = (ancName + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          tr.innerHTML = `
            <td style="text-align:center;">
              <input type="checkbox" class="chk-anchor-active-196" data-id="${anc.id}" ${isEnabled ? "checked" : ""} style="accent-color:#ff1744;cursor:pointer;width:13px;height:13px;vertical-align:middle;" title="${isEnabled ? "Disable" : "Enable"} Anchor #${anc.id}">
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:3px;min-width:0;">
                <span class="anchor-badge" style="background:${anc.color};${isEnabled ? '' : 'filter:grayscale(70%);opacity:0.5;'};flex-shrink:0;"><span style="font-size:0.52em;opacity:0.85;vertical-align:0.12em;margin-right:0.5px;">#</span>${anc.id}</span>
                <input type="text" class="anchor-name-input-196" data-id="${anc.id}" value="${safeName}" placeholder="#${anc.id}" style="width:100%;max-width:140px;background:rgba(15,20,32,0.9);border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:0.70rem;padding:1px 4px;border-radius:3px;">
              </div>
            </td>
            <td style="text-align:right;font-family:monospace;font-size:0.70rem;color:${!isEnabled ? 'var(--text-muted)' : (parseFloat(err) > 5 ? 'var(--accent-red)' : '#00e676')}">
              ${err}${err !== "—" ? "m" : ""}
            </td>
            <td style="text-align:center;">
              <button class="btn-del-anchor" onclick="deleteAnchor(${anc.id})" title="Delete Anchor #${anc.id}" style="padding:1px 5px;font-size:0.68rem;background:rgba(255,23,68,0.2);color:#ff1744;border:1px solid rgba(255,23,68,0.4);border-radius:3px;cursor:pointer;">✕</button>
            </td>
          `;
          anchorTableBody196.appendChild(tr);
        });

        if (typeof recompute196Metrics === "function") {
          recompute196Metrics();
        }
      } else if (anchorTableBody) {
        // Render 1073 Anchor Table
        anchorTableBody.innerHTML = "";
        const chkToggleAll = document.getElementById("chk-toggle-all-anchors");
        if (chkToggleAll) {
          chkToggleAll.checked = totalCount > 0 && activeCount === totalCount;
          chkToggleAll.indeterminate = activeCount > 0 && activeCount < totalCount;
        }
        const chkMojones = document.getElementById("chk-show-mojones-1073");
        if (chkMojones && (state.anchors || []).length > 0) {
          const labelsShown = state.anchors.filter(a => a.showLabel !== false).length;
          chkMojones.checked = labelsShown > 0;
          chkMojones.indeterminate = labelsShown > 0 && labelsShown < state.anchors.length;
        }

        state.anchors.forEach((anc, idx) => {
          const isEnabled = anc.active !== false && anc.enabled !== false;
          let err = "—";
          if (warper) {
            try {
              const warped = warper(anc.src);
              err = Math.hypot(warped.x - anc.dst.x, warped.y - anc.dst.y).toFixed(2);
            } catch(_) {}
          }
          const tr = document.createElement("tr");
          if (!isEnabled) {
            tr.className = "anchor-row-disabled";
          }
          const ancName = (anc.name && anc.name.trim()) ? anc.name.trim() : (`#${anc.id}`);
          const safeName = (ancName + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          const showLabel = anc.showLabel !== false;
          const hasPhoto = !!anc.image;

          let axisBadgeHtml = "";
          if (anc.axisId != null) {
            const ax = (state.testAxes || []).find(a => a.id === anc.axisId);
            if (ax) {
              axisBadgeHtml = `<span class="anchor-axis-badge" data-anc-id="${anc.id}" style="font-size:0.59rem;background:${hexToRgba(ax.color, 0.20)};border:1px solid ${ax.color};color:${ax.color};padding:1px 3px;border-radius:2px;cursor:pointer;flex-shrink:0;" title="Coupled to ${ax.name}. Click to detach anchor.">📐${ax.name}</span>`;
            }
          }

          const isOpt = anc.optimize === true;
          let modeBtnHtml = "";
          if (anc.axisId != null) {
            if (isOpt) {
              modeBtnHtml = `<button type="button" class="btn-toggle-anchor-opt" data-id="${anc.id}" style="border:1px solid #e040fb;background:rgba(224,64,251,0.22);color:#e040fb;font-size:0.58rem;padding:1px 4px;border-radius:3px;cursor:pointer;font-weight:700;white-space:nowrap;" title="1D Auto-Tune active: optimizer actively sweeps along axis. Click to switch to Floating Guide (zero-force rubber band).">🎯 Tune</button>`;
            } else {
              modeBtnHtml = `<button type="button" class="btn-toggle-anchor-opt" data-id="${anc.id}" style="border:1px solid #00e5ff;background:rgba(0,229,255,0.18);color:#00e5ff;font-size:0.58rem;padding:1px 4px;border-radius:3px;cursor:pointer;font-weight:700;white-space:nowrap;" title="Floating Guide active: slides freely along axis to natural projection (rubber band). Click to enable 1D Auto-Tune.">🌊 Float</button>`;
            }
          } else {
            if (isOpt) {
              modeBtnHtml = `<button type="button" class="btn-toggle-anchor-opt" data-id="${anc.id}" style="border:1px solid #76ff03;background:rgba(118,255,3,0.20);color:#76ff03;font-size:0.58rem;padding:1px 4px;border-radius:3px;cursor:pointer;font-weight:700;white-space:nowrap;" title="2D Auto-Tune active: optimizer searches in buffer. Click to lock anchor as Fixed Ground Truth.">🎯 Tune</button>`;
            } else {
              modeBtnHtml = `<button type="button" class="btn-toggle-anchor-opt" data-id="${anc.id}" style="border:1px solid #78909c;background:rgba(120,144,156,0.20);color:#b0bec5;font-size:0.58rem;padding:1px 4px;border-radius:3px;cursor:pointer;font-weight:700;white-space:nowrap;" title="Fixed Ground Truth: anchor coordinate is locked (0 movement). Click to enable 2D Auto-Tune.">🔒 Fixed</button>`;
            }
          }

          tr.innerHTML = `
            <td style="text-align:center;">
              <input type="checkbox" class="chk-anchor-active" data-id="${anc.id}" ${isEnabled ? "checked" : ""} style="accent-color:var(--accent-cyan);cursor:pointer;width:13px;height:13px;vertical-align:middle;" title="${isEnabled ? "Disable" : "Enable"} Anchor #${anc.id}">
            </td>
            <td style="overflow:hidden;">
              <div style="display:flex;align-items:center;gap:3px;min-width:0;">
                <span class="anchor-badge" style="background:${anc.color};${isEnabled ? '' : 'filter:grayscale(70%);opacity:0.5;'};flex-shrink:0;"><span style="font-size:0.52em;opacity:0.85;vertical-align:0.12em;margin-right:0.5px;">#</span>${anc.id}</span>
                <input type="text" class="anchor-name-input" data-id="${anc.id}" value="${safeName}" placeholder="#${anc.id}" title="Anchor name (click to edit, defaults to #${anc.id})">
                ${axisBadgeHtml}
              </div>
            </td>
            <td style="text-align:center;">
              ${modeBtnHtml}
            </td>
            <td style="text-align:center;">
              <input type="checkbox" class="chk-anchor-showlabel" data-id="${anc.id}" ${showLabel ? "checked" : ""} style="accent-color:var(--accent-cyan);cursor:pointer;width:13px;height:13px;vertical-align:middle;" title="${showLabel ? 'Hide label on canvas' : 'Show label on canvas'}">
            </td>
            <td style="text-align:center;">
              ${hasPhoto ? `
                <div style="display:inline-flex;align-items:center;justify-content:center;">
                  <img src="${anc.image}" class="anchor-thumb-preview" data-id="${anc.id}" title="Click to view, change, or remove photo" alt="Photo">
                </div>
              ` : `
                <button class="btn-upload-anchor-photo" data-id="${anc.id}" title="Upload photo for this anchor">📷</button>
              `}
            </td>
            <td style="text-align:right;font-family:monospace;white-space:nowrap;color:${!isEnabled ? 'var(--text-muted)' : (parseFloat(err)>5?'var(--accent-red)':'var(--accent-cyan)')}">
              ${err}${err !== "—" ? "m" : ""}
            </td>
            <td style="text-align:center;">
              <button class="btn-del-anchor" onclick="deleteAnchor(${anc.id})" title="Delete Anchor #${anc.id}">✕</button>
            </td>`;
          anchorTableBody.appendChild(tr);
        });

        // Toggle anchor optimize mode listener
        anchorTableBody.querySelectorAll(".btn-toggle-anchor-opt").forEach(btn => {
          btn.addEventListener("click", e => {
            e.stopPropagation();
            const ancId = parseInt(btn.getAttribute("data-id"), 10);
            const anc = (state.anchors || []).find(a => a.id === ancId);
            if (anc) {
              anc.optimize = !anc.optimize;
              updateAnalyticsUI();
              redrawAll();
              const modeText = anc.optimize ? (anc.axisId != null ? "1D Auto-Tune" : "2D Auto-Tune") : (anc.axisId != null ? "Floating Guide (Rubber Band)" : "Fixed Ground Truth");
              updateStatus(`Anchor #${ancId} mode set to: ${modeText}`);
            }
          });
        });

        // Detach anchor from axis click listener
        anchorTableBody.querySelectorAll(".anchor-axis-badge").forEach(badge => {
          badge.addEventListener("click", e => {
            e.stopPropagation();
            const ancId = parseInt(badge.getAttribute("data-anc-id"), 10);
            const anc = (state.anchors || []).find(a => a.id === ancId);
            if (anc) {
              anc.axisId = null;
              anc.axisT = null;
              updateAnalyticsUI();
              if (typeof renderTestAxesList === "function") renderTestAxesList();
              redrawAll();
              updateStatus(`Anchor #${ancId} detached from axis.`);
            }
          });
        });
      }

      updateAlgoComparePanel();
    }

    // ── Escritura 196 Dual-Parcel Area Metrics & Optimizer ─────────────
    function get196WarpedEntities() {
      if (!state.histEntities || state.histEntities.length === 0) return [];
      let warper = null;
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length >= 2) {
        try {
          warper = TransformMath.createWarper(state.algorithm || "SIMILARITY", activeAnchors);
        } catch (_) {}
      }
      return state.histEntities.map(ent => {
        const pts = (ent.points || []).map(p => {
          if (warper) {
            try { return warper(p); } catch (_) { return { x: p.x, y: p.y }; }
          }
          return { x: p.x, y: p.y };
        });
        return {
          layer: ent.layer || "",
          closed: ent.closed !== false,
          points: pts,
          origEnt: ent
        };
      });
    }

    function computeShoelaceArea(pts) {
      if (!pts || pts.length < 3) return 0;
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      }
      return Math.abs(area) / 2;
    }

    function computePolylineLength(pts) {
      if (!pts || pts.length < 2) return 0;
      let len = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      }
      return len;
    }

    function recompute196Metrics() {
      if (state.activeDeed !== "196") return;
      const warpedEnts = get196WarpedEntities();
      const jimmyEnt = warpedEnts.find(e => (e.layer || "").toLowerCase().includes("jimmy"));
      const pedroEnt = warpedEnts.find(e => (e.layer || "").toLowerCase().includes("pedro"));
      const nachoEnt = warpedEnts.find(e => (e.layer || "").toLowerCase().includes("nacho"));

      const targetJimmyInput = document.getElementById("input-target-area-jimmy");
      const targetPedroInput = document.getElementById("input-target-area-pedro");
      const targetJimmy = targetJimmyInput ? (parseFloat(targetJimmyInput.value) || 2413.0) : 2413.0;
      const targetPedro = targetPedroInput ? (parseFloat(targetPedroInput.value) || 2142.0) : 2142.0;

      const valAreaJimmy = document.getElementById("val-area-jimmy");
      const valDeltaJimmy = document.getElementById("val-delta-jimmy");
      const pctJimmy = document.getElementById("lote-jimmy-pct");

      const valAreaPedro = document.getElementById("val-area-pedro");
      const valDeltaPedro = document.getElementById("val-delta-pedro");
      const pctPedro = document.getElementById("lote-pedro-pct");

      const valLenNacho = document.getElementById("val-len-nacho");

      if (jimmyEnt) {
        const areaJ = computeShoelaceArea(jimmyEnt.points);
        const deltaJ = areaJ - targetJimmy;
        const pctJ = targetJimmy > 0 ? (areaJ / targetJimmy) * 100 : 100;
        if (valAreaJimmy) valAreaJimmy.textContent = `${areaJ.toFixed(2)} m²`;
        if (valDeltaJimmy) {
          valDeltaJimmy.textContent = `${deltaJ >= 0 ? "+" : ""}${deltaJ.toFixed(2)} m²`;
          valDeltaJimmy.style.color = Math.abs(deltaJ) < 1.0 ? "#00e676" : (Math.abs(deltaJ) < 10.0 ? "#ffd600" : "#ff1744");
        }
        if (pctJimmy) {
          pctJimmy.textContent = `${pctJ.toFixed(1)}%`;
          pctJimmy.style.color = Math.abs(100 - pctJ) < 1.0 ? "#00e676" : "#ffd600";
        }
      }

      if (pedroEnt) {
        const areaP = computeShoelaceArea(pedroEnt.points);
        const deltaP = areaP - targetPedro;
        const pctP = targetPedro > 0 ? (areaP / targetPedro) * 100 : 100;
        if (valAreaPedro) valAreaPedro.textContent = `${areaP.toFixed(2)} m²`;
        if (valDeltaPedro) {
          valDeltaPedro.textContent = `${deltaP >= 0 ? "+" : ""}${deltaP.toFixed(2)} m²`;
          valDeltaPedro.style.color = Math.abs(deltaP) < 1.0 ? "#00e676" : (Math.abs(deltaP) < 10.0 ? "#ffd600" : "#ff1744");
        }
        if (pctPedro) {
          pctPedro.textContent = `${pctP.toFixed(1)}%`;
          pctPedro.style.color = Math.abs(100 - pctP) < 1.0 ? "#00e676" : "#ffd600";
        }
      }

      if (nachoEnt) {
        const lenN = computePolylineLength(nachoEnt.points);
        if (valLenNacho) valLenNacho.textContent = `${lenN.toFixed(2)} m`;
      }
    }

    function optimize196ParcelAreas() {
      if (!state.histEntities || state.histEntities.length === 0) {
        alert("No se han cargado las entidades de la Escritura 196.");
        return;
      }

      // Save initial baseline geometry if not already stored
      if (!state.origHistEntities196) {
        state.origHistEntities196 = JSON.parse(JSON.stringify(state.histEntities));
      }

      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length < 2) {
        alert("Se requieren al menos 2 puntos de control (anclajes) activos para optimizar en coordenadas de campo.");
        return;
      }

      let warper = null;
      try {
        warper = TransformMath.createWarper(state.algorithm || "SIMILARITY", activeAnchors);
      } catch (err) {
        alert("Error inicializando transformación: " + err.message);
        return;
      }

      const jimmyEnt = state.histEntities.find(e => (e.layer || "").toLowerCase().includes("jimmy"));
      const pedroEnt = state.histEntities.find(e => (e.layer || "").toLowerCase().includes("pedro"));
      const nachoEnt = state.histEntities.find(e => (e.layer || "").toLowerCase().includes("nacho"));

      if (!jimmyEnt || !pedroEnt) {
        alert("No se encontraron las polilíneas de 'Lote Jimmy' y 'Lote Pedro' en la Escritura 196.");
        return;
      }

      const targetJimmyInput = document.getElementById("input-target-area-jimmy");
      const targetPedroInput = document.getElementById("input-target-area-pedro");
      const targetJimmy = targetJimmyInput ? (parseFloat(targetJimmyInput.value) || 2413.0) : 2413.0;
      const targetPedro = targetPedroInput ? (parseFloat(targetPedroInput.value) || 2142.0) : 2142.0;

      const statusOpt = document.getElementById("status-opt-196");
      if (statusOpt) statusOpt.innerHTML = "⏳ Optimizando áreas de Lote Jimmy y Lote Pedro…";

      // Identify shared vertices between Jimmy and Pedro in CAD space
      const sharedIndicesJimmy = [];
      const sharedIndicesPedro = [];
      jimmyEnt.points.forEach((pj, ij) => {
        pedroEnt.points.forEach((pp, ip) => {
          if (Math.hypot(pj.x - pp.x, pj.y - pp.y) < 0.05) {
            sharedIndicesJimmy.push(ij);
            sharedIndicesPedro.push(ip);
          }
        });
      });

      // Iterative dual-parcel area optimization in field coordinates
      let warpedJ = jimmyEnt.points.map(p => warper(p));
      let warpedP = pedroEnt.points.map(p => warper(p));

      // If Constrain to Vertices / Markers is active, anchor parcel vertices near field vertices or markers
      const fieldTargetJ = warpedJ.map(p => {
        if (!state.constrainAnchorsToField) return null;
        const nf = findNearestFieldVertex(p);
        return (nf && nf.dist <= (state.optBufferRadius || 3.0) * 1.5) ? { x: nf.x, y: nf.y } : null;
      });
      const fieldTargetP = warpedP.map(p => {
        if (!state.constrainAnchorsToField) return null;
        const nf = findNearestFieldVertex(p);
        return (nf && nf.dist <= (state.optBufferRadius || 3.0) * 1.5) ? { x: nf.x, y: nf.y } : null;
      });

      const maxIters = 150;
      for (let iter = 0; iter < maxIters; iter++) {
        const aJ = computeShoelaceArea(warpedJ);
        const aP = computeShoelaceArea(warpedP);
        if (Math.abs(aJ - targetJimmy) < 0.05 && Math.abs(aP - targetPedro) < 0.05) break;

        const scaleJ = aJ > 0 ? Math.sqrt(targetJimmy / aJ) : 1.0;
        const scaleP = aP > 0 ? Math.sqrt(targetPedro / aP) : 1.0;

        let cJx = 0, cJy = 0;
        warpedJ.forEach(p => { cJx += p.x; cJy += p.y; });
        cJx /= warpedJ.length; cJy /= warpedJ.length;

        let cPx = 0, cPy = 0;
        warpedP.forEach(p => { cPx += p.x; cPy += p.y; });
        cPx /= warpedP.length; cPy /= warpedP.length;

        const rate = 0.35;
        const factorJ = 1 + (scaleJ - 1) * rate;
        warpedJ.forEach((p, idx) => {
          if (!sharedIndicesJimmy.includes(idx)) {
            p.x = cJx + (p.x - cJx) * factorJ;
            p.y = cJy + (p.y - cJy) * factorJ;
          }
        });

        const factorP = 1 + (scaleP - 1) * rate;
        warpedP.forEach((p, idx) => {
          if (!sharedIndicesPedro.includes(idx)) {
            p.x = cPx + (p.x - cPx) * factorP;
            p.y = cPy + (p.y - cPy) * factorP;
          }
        });

        // Enforce constraint within buffer radius of Field Vertices / Markers if active
        if (state.constrainAnchorsToField && state.optBufferRadius > 0) {
          const R = state.optBufferRadius;
          warpedJ.forEach((p, idx) => {
            const ft = fieldTargetJ[idx];
            if (ft) {
              const d = Math.hypot(p.x - ft.x, p.y - ft.y);
              if (d > R) {
                const ratio = R / d;
                p.x = ft.x + (p.x - ft.x) * ratio;
                p.y = ft.y + (p.y - ft.y) * ratio;
              }
            }
          });
          warpedP.forEach((p, idx) => {
            const ft = fieldTargetP[idx];
            if (ft) {
              const d = Math.hypot(p.x - ft.x, p.y - ft.y);
              if (d > R) {
                const ratio = R / d;
                p.x = ft.x + (p.x - ft.x) * ratio;
                p.y = ft.y + (p.y - ft.y) * ratio;
              }
            }
          });
        }

        // Synchronize shared boundary vertices
        for (let s = 0; s < sharedIndicesJimmy.length; s++) {
          const ij = sharedIndicesJimmy[s];
          const ip = sharedIndicesPedro[s];
          const avgX = (warpedJ[ij].x + warpedP[ip].x) / 2;
          const avgY = (warpedJ[ij].y + warpedP[ip].y) / 2;
          warpedJ[ij].x = avgX; warpedJ[ij].y = avgY;
          warpedP[ip].x = avgX; warpedP[ip].y = avgY;
        }
      }

      // Reverse-map warped coordinates back into CAD space
      let invWarper = null;
      try {
        if (TransformMath.createInverseWarper) {
          invWarper = TransformMath.createInverseWarper(state.algorithm || "SIMILARITY", activeAnchors);
        }
      } catch (_) {}

      if (invWarper) {
        jimmyEnt.points = warpedJ.map(p => invWarper(p));
        pedroEnt.points = warpedP.map(p => invWarper(p));
      } else {
        // Robust Helmert unwarp
        let meanSrcX = 0, meanSrcY = 0, meanDstX = 0, meanDstY = 0;
        activeAnchors.forEach(a => {
          meanSrcX += a.src.x; meanSrcY += a.src.y;
          meanDstX += a.dst.x; meanDstY += a.dst.y;
        });
        const n = activeAnchors.length;
        meanSrcX /= n; meanSrcY /= n; meanDstX /= n; meanDstY /= n;
        let numA = 0, numB = 0, den = 0;
        activeAnchors.forEach(a => {
          const dxs = a.src.x - meanSrcX, dys = a.src.y - meanSrcY;
          const dxd = a.dst.x - meanDstX, dyd = a.dst.y - meanDstY;
          numA += dxs * dxd + dys * dyd;
          numB += dxs * dyd - dys * dxd;
          den += dxs * dxs + dys * dys;
        });
        const a = numA / den, b = numB / den;
        const d = a * a + b * b;
        const unwarp = p => {
          const u = p.x - meanDstX, v = p.y - meanDstY;
          return {
            x: meanSrcX + (a * u + b * v) / d,
            y: meanSrcY + (-b * u + a * v) / d
          };
        };
        jimmyEnt.points = warpedJ.map(unwarp);
        pedroEnt.points = warpedP.map(unwarp);
      }

      // Synchronize Nacho vertices if it shares coordinates with Pedro or Jimmy
      if (nachoEnt && nachoEnt.points) {
        nachoEnt.points.forEach(np => {
          for (const pp of pedroEnt.points) {
            if (Math.hypot(np.x - pp.x, np.y - pp.y) < 1.0) {
              np.x = pp.x; np.y = pp.y; break;
            }
          }
          for (const jp of jimmyEnt.points) {
            if (Math.hypot(np.x - jp.x, np.y - jp.y) < 1.0) {
              np.x = jp.x; np.y = jp.y; break;
            }
          }
        });
      }

      recompute196Metrics();
      redrawAll();

      const finalAreaJ = computeShoelaceArea(jimmyEnt.points.map(p => warper(p)));
      const finalAreaP = computeShoelaceArea(pedroEnt.points.map(p => warper(p)));

      if (statusOpt) {
        const constrainInfo = state.constrainAnchorsToField ? ` [🔒 Restringido ±${state.optBufferRadius.toFixed(1)}m]` : ` [🔓 Sin restricción]`;
        statusOpt.innerHTML = `✅ <strong>Optimización completa${constrainInfo}:</strong><br>• Lote Jimmy: <strong>${finalAreaJ.toFixed(2)} m²</strong> (target ${targetJimmy.toFixed(1)} m²)<br>• Lote Pedro: <strong>${finalAreaP.toFixed(2)} m²</strong> (target ${targetPedro.toFixed(1)} m²)`;
      }
      updateStatus(`⚡ Parcelas Escritura 196 optimizadas: Jimmy = ${finalAreaJ.toFixed(2)} m², Pedro = ${finalAreaP.toFixed(2)} m²`);
    }

    // ── Cluster 196 Action Listeners ──
    const btnOpt196 = document.getElementById("btn-optimize-196");
    if (btnOpt196) {
      btnOpt196.addEventListener("click", optimize196ParcelAreas);
    }

    const btnReset196 = document.getElementById("btn-reset-196");
    if (btnReset196) {
      btnReset196.addEventListener("click", () => {
        if (state.origHistEntities196) {
          state.histEntities = JSON.parse(JSON.stringify(state.origHistEntities196));
          recompute196Metrics();
          redrawAll();
          const statusOpt = document.getElementById("status-opt-196");
          if (statusOpt) statusOpt.textContent = "↺ Geometría de Escritura 196 restaurada al estado original.";
          updateStatus("↺ Escritura 196 restaurada al estado original.");
        } else {
          alert("No hay estado original registrado para restaurar.");
        }
      });
    }

    const btnSaveDxf196 = document.getElementById("btn-save-dxf-196");
    if (btnSaveDxf196) {
      btnSaveDxf196.addEventListener("click", saveDeedDxf);
    }

    const inputTargetJimmy = document.getElementById("input-target-area-jimmy");
    const inputTargetPedro = document.getElementById("input-target-area-pedro");
    if (inputTargetJimmy) inputTargetJimmy.addEventListener("input", recompute196Metrics);
    if (inputTargetPedro) inputTargetPedro.addEventListener("input", recompute196Metrics);

    const algoSelect196 = document.getElementById("algorithm-select-196");
    if (algoSelect196) {
      algoSelect196.addEventListener("change", e => {
        state.algorithm = e.target.value;
        const mainAlgo = document.getElementById("algorithm-select");
        if (mainAlgo) mainAlgo.value = e.target.value;
        updateAnalyticsUI();
        redrawAll();
        updateStatus(`Algoritmo de transformación 196: ${e.target.value}`);
      });
    }

    const btnSaveAnchors196 = document.getElementById("btn-save-anchors-196");
    if (btnSaveAnchors196) {
      btnSaveAnchors196.addEventListener("click", () => {
        const toSave = {
          anchors: state.anchors.map(a => ({
            id: a.id,
            name: a.name || (`#${a.id}`),
            showLabel: a.showLabel !== false,
            image: a.image || null,
            color: a.color,
            src: { x: a.src.x, y: a.src.y },
            dst: { x: a.dst.x, y: a.dst.y },
            active: a.active !== false && a.enabled !== false,
            enabled: a.active !== false && a.enabled !== false
          }))
        };
        const jsonStr = JSON.stringify(toSave, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "anchors_196.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        updateStatus(`💾 Guardados ${state.anchors.length} anclajes en anchors_196.json.`);
      });
    }

    const anchor196FileInput = document.getElementById("anchor-196-file-input");
    if (anchor196FileInput) {
      anchor196FileInput.addEventListener("change", e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            const list = Array.isArray(data) ? data : (data.anchors || []);
            if (list.length > 0) {
              applyAnchors(list);
              redrawAll();
              updateStatus(`✅ Cargados ${list.length} anclajes para Escritura 196 desde ${file.name}`);
            } else {
              alert("No se encontraron anclajes válidos en el archivo JSON.");
            }
          } catch (err) {
            alert("Error al procesar archivo de anclajes: " + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    const btnClearAnchors196 = document.getElementById("btn-clear-anchors-196");
    if (btnClearAnchors196) {
      btnClearAnchors196.addEventListener("click", () => {
        state.anchors = [];
        state.pendingSource = null;
        redrawAll();
        updateStatus("Anclajes de Escritura 196 eliminados.");
      });
    }

    const anchorTableBody196El = document.getElementById("anchor-table-body-196");
    if (anchorTableBody196El) {
      anchorTableBody196El.addEventListener("change", e => {
        if (e.target && e.target.classList.contains("chk-anchor-active-196")) {
          const id = parseInt(e.target.dataset.id, 10);
          toggleAnchor(id, e.target.checked);
        }
      });
      anchorTableBody196El.addEventListener("input", e => {
        if (e.target && e.target.classList.contains("anchor-name-input-196")) {
          const id = parseInt(e.target.dataset.id, 10);
          const anc = (state.anchors || []).find(a => a.id === id);
          if (anc) {
            anc.name = e.target.value.trim() || (`#${anc.id}`);
            redrawTrueCanvas();
          }
        }
      });
    }

    function toggleAnchor(id, active) {
      const anc = (state.anchors || []).find(a => a.id === id);
      if (!anc) return;
      const willBeActive = (active !== undefined) ? active : (anc.active === false || anc.enabled === false);
      anc.active = willBeActive;
      anc.enabled = willBeActive;
      const activeCount = getActiveAnchors().length;
      const totalCount = state.anchors.length;
      if (activeCount < 2) {
        updateStatus(`Anchor #${id} ${willBeActive ? "enabled" : "disabled"}. ⚠️ Need ≥ 2 active anchors for transformation (currently ${activeCount}/${totalCount} active).`);
      } else {
        updateStatus(`Anchor #${id} ${willBeActive ? "enabled" : "disabled"}. Active anchors: ${activeCount}/${totalCount}. Live polygon & transformation updated.`);
      }
      redrawAll();
    }
    window.toggleAnchor = toggleAnchor;

    function toggleAllAnchors(active) {
      (state.anchors || []).forEach(a => {
        a.active = active;
        a.enabled = active;
      });
      const activeCount = getActiveAnchors().length;
      updateStatus(active ? `All ${activeCount} anchors enabled.` : `All anchors disabled.`);
      redrawAll();
    }
    window.toggleAllAnchors = toggleAllAnchors;

    // Anchor table interactions: name editing, label toggling, photo upload/modal
    let currentPhotoAnchorId = null;

    anchorTableBody.addEventListener("input", e => {
      if (e.target && e.target.classList.contains("anchor-name-input")) {
        const id = parseInt(e.target.dataset.id, 10);
        const anc = (state.anchors || []).find(a => a.id === id);
        if (anc) {
          anc.name = e.target.value;
          const histCard = document.getElementById("hist-card");
          const trueCard = document.getElementById("true-card");
          if (!histCard || !histCard.classList.contains("hidden")) redrawHistoricalCanvas();
          if (!trueCard || !trueCard.classList.contains("hidden")) redrawTrueCanvas();
        }
      }
    });

    anchorTableBody.addEventListener("blur", e => {
      if (e.target && e.target.classList.contains("anchor-name-input")) {
        const id = parseInt(e.target.dataset.id, 10);
        const anc = (state.anchors || []).find(a => a.id === id);
        if (anc) {
          const val = e.target.value.trim();
          anc.name = val.length > 0 ? val : (`#${anc.id}`);
          e.target.value = anc.name;
          redrawAll();
        }
      }
    }, true);

    anchorTableBody.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target && e.target.classList.contains("anchor-name-input")) {
        e.target.blur();
      }
    });

    anchorTableBody.addEventListener("change", e => {
      if (e.target && e.target.classList.contains("chk-anchor-active")) {
        const id = parseInt(e.target.dataset.id || e.target.getAttribute("data-id"), 10);
        toggleAnchor(id, e.target.checked);
      } else if (e.target && e.target.classList.contains("chk-anchor-showlabel")) {
        const id = parseInt(e.target.dataset.id, 10);
        const anc = (state.anchors || []).find(a => a.id === id);
        if (anc) {
          anc.showLabel = e.target.checked;
          const anyShown = (state.anchors || []).some(a => a.showLabel !== false);
          const allShown = (state.anchors || []).every(a => a.showLabel !== false);
          if (chkShowMojones1073) {
            chkShowMojones1073.checked = anyShown;
            chkShowMojones1073.indeterminate = anyShown && !allShown;
            state.showMojones1073 = anyShown;
          }
          redrawAll();
        }
      }
    });

    anchorTableBody.addEventListener("click", e => {
      const uploadBtn = e.target.closest(".btn-upload-anchor-photo");
      if (uploadBtn) {
        const id = parseInt(uploadBtn.dataset.id, 10);
        currentPhotoAnchorId = id;
        const photoFileInput = document.getElementById("anchor-photo-file-input");
        if (photoFileInput) {
          photoFileInput.value = "";
          photoFileInput.click();
        }
        return;
      }

      const thumbImg = e.target.closest(".anchor-thumb-preview");
      if (thumbImg) {
        const id = parseInt(thumbImg.dataset.id, 10);
        const anc = (state.anchors || []).find(a => a.id === id);
        if (anc && anc.image) {
          openAnchorPhotoModal(anc);
        }
        return;
      }
    });

    function openAnchorPhotoModal(anc) {
      currentPhotoAnchorId = anc.id;
      const modal = document.getElementById("modal-anchor-photo");
      const modalImg = document.getElementById("modal-anchor-photo-img");
      const modalTitle = document.getElementById("modal-anchor-photo-title");
      if (!modal || !modalImg) return;
      modalTitle.textContent = `📷 Anchor ${anc.name || ('#' + anc.id)} Photo`;
      modalImg.src = anc.image;
      modal.style.display = "flex";
    }

    function closeAnchorPhotoModal() {
      const modal = document.getElementById("modal-anchor-photo");
      if (modal) modal.style.display = "none";
    }

    const btnCloseModal = document.getElementById("btn-close-anchor-photo-modal");
    const btnModalClose = document.getElementById("btn-modal-close-photo");
    const btnModalChange = document.getElementById("btn-modal-change-photo");
    const btnModalDelete = document.getElementById("btn-modal-delete-photo");
    const modalAnchorPhoto = document.getElementById("modal-anchor-photo");

    if (btnCloseModal) btnCloseModal.addEventListener("click", closeAnchorPhotoModal);
    if (btnModalClose) btnModalClose.addEventListener("click", closeAnchorPhotoModal);
    if (modalAnchorPhoto) {
      modalAnchorPhoto.addEventListener("click", e => {
        if (e.target === modalAnchorPhoto) closeAnchorPhotoModal();
      });
    }
    if (btnModalChange) {
      btnModalChange.addEventListener("click", () => {
        const photoFileInput = document.getElementById("anchor-photo-file-input");
        if (photoFileInput) {
          photoFileInput.value = "";
          photoFileInput.click();
        }
      });
    }
    if (btnModalDelete) {
      btnModalDelete.addEventListener("click", () => {
        const anc = (state.anchors || []).find(a => a.id === currentPhotoAnchorId);
        if (anc) {
          anc.image = null;
          delete anc._imgElement;
          closeAnchorPhotoModal();
          redrawAll();
          updateStatus(`Removed photo from Anchor ${anc.name || ('#' + anc.id)}.`);
        }
      });
    }

    const photoFileInput = document.getElementById("anchor-photo-file-input");
    if (photoFileInput) {
      photoFileInput.addEventListener("change", e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const anc = (state.anchors || []).find(a => a.id === currentPhotoAnchorId);
        if (!anc) return;

        const reader = new FileReader();
        reader.onload = ev => {
          const rawUrl = ev.target.result;
          const tempImg = new Image();
          tempImg.onload = () => {
            let w = tempImg.width, h = tempImg.height;
            const maxDim = 800;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const cvs = document.createElement("canvas");
            cvs.width = w;
            cvs.height = h;
            const ctx = cvs.getContext("2d");
            ctx.drawImage(tempImg, 0, 0, w, h);
            const compressedUrl = cvs.toDataURL("image/jpeg", 0.82);

            anc.image = compressedUrl;
            const displayImg = new Image();
            displayImg.onload = () => redrawAll();
            displayImg.src = compressedUrl;
            anc._imgElement = displayImg;

            const modalImg = document.getElementById("modal-anchor-photo-img");
            if (modalImg && modalAnchorPhoto && modalAnchorPhoto.style.display !== "none") {
              modalImg.src = compressedUrl;
            }
            redrawAll();
            updateStatus(`📷 Photo attached to Anchor ${anc.name || ('#' + anc.id)}.`);
          };
          tempImg.src = rawUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = "";
      });
    }

    const chkToggleAllAnchors = document.getElementById("chk-toggle-all-anchors");
    if (chkToggleAllAnchors) {
      chkToggleAllAnchors.addEventListener("change", e => {
        toggleAllAnchors(e.target.checked);
      });
    }

    // Anchor Photo Size Slider (for screenshots & high-resolution review)
    const rangePhotoSize = document.getElementById("range-anchor-photo-size");
    const valPhotoSize = document.getElementById("anchor-photo-size-val");
    const btnResetPhotoSize = document.getElementById("btn-reset-anchor-photo-size");

    function setAnchorPhotoSize(size) {
      state.anchorPhotoSize = Math.max(30, Math.min(350, size));
      if (rangePhotoSize) rangePhotoSize.value = state.anchorPhotoSize;
      if (valPhotoSize) valPhotoSize.textContent = state.anchorPhotoSize + "px";
      const hc = document.getElementById("hist-card");
      const tc = document.getElementById("true-card");
      if (!hc || !hc.classList.contains("hidden")) redrawHistoricalCanvas();
      if (!tc || !tc.classList.contains("hidden")) redrawTrueCanvas();
    }

    if (rangePhotoSize) {
      rangePhotoSize.addEventListener("input", e => setAnchorPhotoSize(parseInt(e.target.value, 10)));
    }
    if (btnResetPhotoSize) {
      btnResetPhotoSize.addEventListener("click", () => setAnchorPhotoSize(180));
    }

    function updateAlgoComparePanel() {
      if (!algoCompareList) return;
      const activeAnchors = getActiveAnchors();
      const n = activeAnchors.length;
      if (n < 2) { algoCompareList.innerHTML = `<p class="compare-note">Enable ≥ 2 anchor pairs to compare algorithms.</p>`; return; }
      const scores = ALGORITHMS.map(algo => {
        if (n < algo.minAnchors) return { ...algo, rmse: null, note: `needs ≥${algo.minAnchors}` };
        try { const w = TransformMath.createWarper(algo.key, activeAnchors); return { ...algo, rmse: TransformMath.computeRMSE(w, activeAnchors).totalRMSE, note: null }; }
        catch(e) { return { ...algo, rmse: null, note: "error" }; }
      });
      const ranked = [...scores].sort((a,b) => a.rmse===null?1:b.rmse===null?-1:a.rmse-b.rmse);
      const rankMap = {}; ranked.forEach((r,i)=>{rankMap[r.key]=i+1;});
      const maxRmse = Math.max(...scores.filter(s=>s.rmse!==null).map(s=>s.rmse),1);
      const bestKey = ranked[0].rmse!==null?ranked[0].key:null;
      algoCompareList.innerHTML = "";
      scores.forEach(algo => {
        const rank = rankMap[algo.key], isActive = algo.key===state.algorithm, isBest = algo.key===bestKey;
        const barPct = algo.rmse!==null?Math.round((algo.rmse/maxRmse)*100):100;
        const rmseText = algo.rmse!==null?algo.rmse.toFixed(3):(algo.note||"—");
        const row = document.createElement("div");
        row.className = `algo-row${isActive?" algo-active":""}${isBest?" algo-best":""}`;
        row.title = `Click to switch to ${algo.label}`;
        row.innerHTML = `<div class="algo-row-header">
          <span class="algo-name">${algo.label}</span>
          <div class="algo-badges">
            ${isBest&&algo.rmse!==null?`<span class="badge-best">✦ BEST</span>`:""}
            ${isActive?`<span class="badge-active-tag">Active</span>`:""}
            <span class="badge-rank rank-${Math.min(rank,4)}">#${rank}</span>
            <span class="algo-rmse-val">${rmseText}</span>
          </div></div>
          <div class="algo-bar-track"><div class="algo-bar-fill" style="width:${barPct}%;background:${RANK_COLORS[Math.min(rank-1,3)]}"></div></div>`;
        row.addEventListener("click",()=>{
          state.algorithm = algo.key; algorithmSelect.value=algo.key; redrawAll();
          updateStatus(`Switched to ${algo.label} (RMSE: ${rmseText})`);
        });
        algoCompareList.appendChild(row);
      });
    }
    function updateStatus(msg) { statusBar.textContent=msg; }

    // ── Manual file-input listeners ───────────────────────────────────
    histInput.addEventListener("change", e => {
      const f=e.target.files[0]; if (!f) return;
      state.histFileName = f.name;
      const r=new FileReader();
      r.onload=function(){
        state.histEntities=DXFParser.parse(this.result);
        histStatus.textContent=`Deed DXF: ${state.histEntities.length} entities`;
        state.anchors=[]; state.pendingSource=null;
        state.histViewport={scale:1,offsetX:0,offsetY:0,bbox:null};
        resizeCanvases();
        updateStatus(`Loaded deed DXF (${f.name}): ${state.histEntities.length} entities.`);
      };
      r.readAsText(f);
    });

    trueInput.addEventListener("change", e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = function() {
        state.trueFileName = f.name;
        state.trueEntities = DXFParser.parse(this.result);
        if (trueStatus) trueStatus.textContent = `Field DXF: ${state.trueEntities.length} entities`;
        if (state.trueEntities.length > 0 && trueCanvas.width > 0) {
          state.trueViewport = fitViewport(trueCanvas, computeBoundingBox(state.trueEntities));
        }
        resizeCanvases();
        redrawAll();
        updateStatus(`Loaded field survey DXF (${f.name}): ${state.trueEntities.length} entities.`);
      };
      r.readAsText(f);
    });

    // [/SECTION: JS_UI_CONTROLS_AND_EVENTS]
