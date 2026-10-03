
    // ============================================================================
    // [SECTION: JS_DEED_TRANSFORM_GIZMO]
    // ============================================================================
    /* ==========================================================================
       DEED SQUEEZE & ASPECT RATIO GIZMO (PowerPoint-style Transform Handles)
       ========================================================================== */
    function getDeedCenter() {
      if (typeof state !== "undefined") {
        if (state.histPdfCanvas && state.histPdfW > 0 && state.histPdfH > 0) {
          return { x: state.histPdfW / 2, y: state.histPdfH / 2 };
        }
        if (state.histEntities && state.histEntities.length > 0) {
          const bbox = computeBoundingBox(state.histEntities);
          return { x: bbox.minX + bbox.width / 2, y: bbox.minY + bbox.height / 2 };
        }
      }
      return { x: 382.0, y: 391.0 };
    }

    function getDeedRectDeedSpace() {
      if (state.histPdfCanvas && state.histPdfW > 0 && state.histPdfH > 0) {
        return { minX: 0, minY: 0, maxX: state.histPdfW, maxY: state.histPdfH, width: state.histPdfW, height: state.histPdfH };
      }
      if (state.histEntities && state.histEntities.length > 0) {
        return computeBoundingBox(state.histEntities);
      }
      return null;
    }

    function getDeedBoundingGizmo(vp, canvasH) {
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length < 2) return null;
      let warper = null;
      try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) { return null; }
      if (!warper) return null;

      const rect = getDeedRectDeedSpace();
      if (!rect) return null;

      const cTL = { x: rect.minX, y: rect.minY };
      const cTR = { x: rect.maxX, y: rect.minY };
      const cBR = { x: rect.maxX, y: rect.maxY };
      const cBL = { x: rect.minX, y: rect.maxY };

      const sTL = worldToScreenGIS(warper(cTL), vp, canvasH);
      const sTR = worldToScreenGIS(warper(cTR), vp, canvasH);
      const sBR = worldToScreenGIS(warper(cBR), vp, canvasH);
      const sBL = worldToScreenGIS(warper(cBL), vp, canvasH);

      const midTop = { x: (sTL.x + sTR.x) / 2, y: (sTL.y + sTR.y) / 2 };
      const midBottom = { x: (sBL.x + sBR.x) / 2, y: (sBL.y + sBR.y) / 2 };
      const midLeft = { x: (sTL.x + sBL.x) / 2, y: (sTL.y + sBL.y) / 2 };
      const midRight = { x: (sTR.x + sBR.x) / 2, y: (sTR.y + sBR.y) / 2 };
      const center = { x: (sTL.x + sTR.x + sBR.x + sBL.x) / 4, y: (sTL.y + sTR.y + sBR.y + sBL.y) / 4 };

      const dxW = midRight.x - midLeft.x, dyW = midRight.y - midLeft.y;
      const lenW = Math.max(1, Math.hypot(dxW, dyW));
      const uWidth = { x: dxW / lenW, y: dyW / lenW };

      const dxH = midBottom.x - midTop.x, dyH = midBottom.y - midTop.y;
      const lenH = Math.max(1, Math.hypot(dxH, dyH));
      const uHeight = { x: dxH / lenH, y: dyH / lenH };

      const sA1 = worldToScreenGIS(warper(activeAnchors[0].src), vp, canvasH);
      const sA2 = worldToScreenGIS(warper(activeAnchors[1].src), vp, canvasH);

      return {
        corners: { tl: sTL, tr: sTR, br: sBR, bl: sBL },
        midpoints: { top: midTop, bottom: midBottom, left: midLeft, right: midRight },
        center,
        widthScreen: lenW,
        heightScreen: lenH,
        uWidth,
        uHeight,
        angleWidth: Math.atan2(dyW, dxW),
        angleHeight: Math.atan2(dyH, dxH),
        sA1,
        sA2
      };
    }

    function findDeedHandleAt(sx, sy, vp, canvasH) {
      const gizmo = getDeedBoundingGizmo(vp, canvasH);
      if (!gizmo) return null;

      const HIT_R = 18;
      const { corners, midpoints } = gizmo;

      // Check corner handles first
      if (Math.hypot(sx - corners.tl.x, sy - corners.tl.y) <= HIT_R) return { handle: "tl", cursor: "nwse-resize", gizmo };
      if (Math.hypot(sx - corners.tr.x, sy - corners.tr.y) <= HIT_R) return { handle: "tr", cursor: "nesw-resize", gizmo };
      if (Math.hypot(sx - corners.br.x, sy - corners.br.y) <= HIT_R) return { handle: "br", cursor: "nwse-resize", gizmo };
      if (Math.hypot(sx - corners.bl.x, sy - corners.bl.y) <= HIT_R) return { handle: "bl", cursor: "nesw-resize", gizmo };

      // Check edge handles
      if (Math.hypot(sx - midpoints.left.x, sy - midpoints.left.y) <= HIT_R) return { handle: "left", cursor: "ew-resize", gizmo };
      if (Math.hypot(sx - midpoints.right.x, sy - midpoints.right.y) <= HIT_R) return { handle: "right", cursor: "ew-resize", gizmo };
      if (Math.hypot(sx - midpoints.top.x, sy - midpoints.top.y) <= HIT_R) return { handle: "top", cursor: "ns-resize", gizmo };
      if (Math.hypot(sx - midpoints.bottom.x, sy - midpoints.bottom.y) <= HIT_R) return { handle: "bottom", cursor: "ns-resize", gizmo };

      return null;
    }

    function drawDeedTransformGizmo(ctx, vp, canvasH) {
      if (!state.showOverlay || state.showDeedHandles === false) return;
      const gizmo = getDeedBoundingGizmo(vp, canvasH);
      if (!gizmo) return;

      const { corners, midpoints, angleWidth, angleHeight, sA1, sA2 } = gizmo;

      ctx.save();

      // 1. Dashed bounding frame
      ctx.strokeStyle = "rgba(213, 0, 249, 0.85)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(corners.tl.x, corners.tl.y);
      ctx.lineTo(corners.tr.x, corners.tr.y);
      ctx.lineTo(corners.br.x, corners.br.y);
      ctx.lineTo(corners.bl.x, corners.bl.y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Fixed Anchor Baseline Indicator (Mojón 1 to Mojón 2)
      if (sA1 && sA2) {
        ctx.save();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "rgba(16, 185, 129, 0.6)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(sA1.x, sA1.y);
        ctx.lineTo(sA2.x, sA2.y);
        ctx.stroke();

        const midAnchorX = (sA1.x + sA2.x) / 2;
        const midAnchorY = (sA1.y + sA2.y) / 2;
        ctx.font = "bold 11px sans-serif";
        const badgeText = "⚓ Fixed Baseline (0.0 m drift)";
        const btm = ctx.measureText(badgeText);
        const bw = btm.width + 14, bh = 22;

        ctx.fillStyle = "rgba(10, 26, 20, 0.94)";
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.5;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(midAnchorX - bw/2, midAnchorY - bh/2, bw, bh, 4);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(midAnchorX - bw/2, midAnchorY - bh/2, bw, bh);
          ctx.strokeRect(midAnchorX - bw/2, midAnchorY - bh/2, bw, bh);
        }
        ctx.fillStyle = "#10b981";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, midAnchorX, midAnchorY);
        ctx.restore();
      }

      // Helper for edge pill handle
      function drawPill(x, y, angle, isHighlighted) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = isHighlighted ? "#d500f9" : "#ffffff";
        ctx.strokeStyle = isHighlighted ? "#ffffff" : "#d500f9";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        const pw = 18, ph = 9;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(-pw/2, -ph/2, pw, ph, 3);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(-pw/2, -ph/2, pw, ph);
          ctx.strokeRect(-pw/2, -ph/2, pw, ph);
        }
        // Grip lines
        ctx.strokeStyle = isHighlighted ? "#ffffff" : "#333333";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2, -2.5); ctx.lineTo(-2, 2.5);
        ctx.moveTo(2, -2.5); ctx.lineTo(2, 2.5);
        ctx.stroke();
        ctx.restore();
      }

      // Helper for corner handle
      function drawCorner(x, y, isHighlighted) {
        ctx.save();
        ctx.fillStyle = isHighlighted ? "#d500f9" : "#ffffff";
        ctx.strokeStyle = isHighlighted ? "#ffffff" : "#d500f9";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        const s = 9;
        ctx.fillRect(x - s/2, y - s/2, s, s);
        ctx.strokeRect(x - s/2, y - s/2, s, s);
        ctx.restore();
      }

      // 3. Draw Edge Handles
      drawPill(midpoints.right.x, midpoints.right.y, angleHeight, state.activeDeedHandle === "right" || state.hoveredDeedHandle === "right");
      drawPill(midpoints.top.x, midpoints.top.y, angleWidth, state.activeDeedHandle === "top" || state.hoveredDeedHandle === "top");
      drawPill(midpoints.bottom.x, midpoints.bottom.y, angleWidth, state.activeDeedHandle === "bottom" || state.hoveredDeedHandle === "bottom");

      // 4. Draw Corner Handles
      drawCorner(corners.tl.x, corners.tl.y, state.activeDeedHandle === "tl" || state.hoveredDeedHandle === "tl");
      drawCorner(corners.tr.x, corners.tr.y, state.activeDeedHandle === "tr" || state.hoveredDeedHandle === "tr");
      drawCorner(corners.br.x, corners.br.y, state.activeDeedHandle === "br" || state.hoveredDeedHandle === "br");
      drawCorner(corners.bl.x, corners.bl.y, state.activeDeedHandle === "bl" || state.hoveredDeedHandle === "bl");

      // 5. Live Tooltip badge next to active handle while dragging, or informative tooltip on hover
      const targetHandle = state.activeDeedHandle || state.hoveredDeedHandle;
      if (targetHandle && state.deedScale) {
        const ratio = state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0);
        const text = `↔ Deed Squeeze: ${(ratio * 100).toFixed(1)}% | ⚓ Anchors Fixed (0.0 m drift)`;

        let activePos = corners.br;
        if (targetHandle in midpoints) activePos = midpoints[targetHandle];
        else if (targetHandle in corners) activePos = corners[targetHandle];

        ctx.save();
        ctx.font = "bold 12px sans-serif";
        const tm = ctx.measureText(text);
        const pw = tm.width + 18, ph = 26;
        const px = activePos.x + 16, py = activePos.y - 13;

        ctx.fillStyle = "rgba(10, 14, 23, 0.94)";
        ctx.strokeStyle = "#d500f9";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 8;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(px, py - ph / 2, pw, ph, 4);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(px, py - ph / 2, pw, ph);
          ctx.strokeRect(px, py - ph / 2, pw, ph);
        }
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, px + 9, py);
        ctx.restore();
      }

      ctx.restore();
    }

    function updateDeedScaleDisplay() {
      if (!state.deedScale) return;
      const ratio = state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0);
      const pctStr = (ratio * 100).toFixed(1) + "%";

      const el1 = document.getElementById("deed-scale-display");
      if (el1) el1.textContent = `Squeeze: ${pctStr}`;
      const el2 = document.getElementById("deed-scale-display-hud");
      if (el2) el2.textContent = `Squeeze: ${pctStr} (Anchors Fixed)`;
      const el3 = document.getElementById("deed-scale-display-sidebar");
      if (el3) el3.textContent = `Squeeze: ${pctStr}`;

      const inputRatio = document.getElementById("input-scale-ratio");
      if (inputRatio && document.activeElement !== inputRatio) {
        inputRatio.value = (ratio * 100).toFixed(1);
      }
      const inputX = document.getElementById("input-scale-x");
      if (inputX && document.activeElement !== inputX) {
        inputX.value = (ratio * 100).toFixed(1);
      }
      const inputY = document.getElementById("input-scale-y");
      if (inputY && document.activeElement !== inputY) {
        inputY.value = (ratio * 100).toFixed(1);
      }
    }

    function applyDeedScaleChange(newRatio, optionalY) {
      let r = newRatio;
      if (r === undefined && optionalY !== undefined) {
        r = optionalY;
      }
      if (typeof r === "number" && !isNaN(r)) {
        const clamped = Math.max(0.20, Math.min(3.0, r));
        state.deedScale.ratio = clamped;
        state.deedScale.x = clamped;
        state.deedScale.y = clamped;
      }
      updateDeedScaleDisplay();
      updateUserPolygonWarp();
      updateCustomPolygonAnchors();
      redrawAll();
    }

    function toggleLinkDeedAspect(val) {
      // Kept for backward compatibility
      state.lockAspectEquivalent = !!val;
      updateDeedScaleDisplay();
    }

    function resetDeedScale() {
      state.deedScale.ratio = 1.0;
      state.deedScale.x = 1.0;
      state.deedScale.y = 1.0;
      updateDeedScaleDisplay();
      updateUserPolygonWarp();
      updateCustomPolygonAnchors();
      redrawAll();
      updateStatus("📐 Deed Squeeze reset to 100.0% (Original deed proportions).");
    }

    function toggleDeedHandles(force) {
      state.showDeedHandles = (force !== undefined) ? force : !state.showDeedHandles;
      const chk = document.getElementById("chk-toggle-deed-handles");
      if (chk && chk.checked !== state.showDeedHandles) {
        chk.checked = state.showDeedHandles;
      }
      const btn = document.getElementById("btn-toggle-deed-handles");
      if (btn) {
        btn.classList.toggle("active", state.showDeedHandles);
      }
      const hud = document.getElementById("squeeze-hud");
      if (hud) {
        hud.style.display = state.showDeedHandles ? "flex" : "none";
      }
      updateDeedScaleDisplay();
      redrawTrueCanvas();
      updateStatus(state.showDeedHandles ? "📐 Squeeze Handles enabled — drag edge handles on field canvas to stretch." : "📐 Squeeze Handles hidden.");
    }

    function redrawTrueCanvas() {
      const w = trueCanvas.width, h = trueCanvas.height;
      trueCtx.fillStyle = "#ffffff";
      trueCtx.fillRect(0, 0, w, h);
      drawGrid(trueCtx, w, h, true);
      const vp = state.trueViewport;

      // Layer 1: Drone GeoTIFF background
      if (state.showGeoTiff !== false) {
        drawGeoTiff(trueCtx, state.geoTiff, vp, h, state.geoTiffOpacity);
      }

      // Build warper from anchors (deed-space → GIS-space)
      let warper = null;
      const activeAnchors = getActiveAnchors();
      if (state.showOverlay && activeAnchors.length >= 2) {
        try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); }
        catch(e) { console.warn("Warper error:", e); }
      }

      // Live update any polygon vertices anchored to deed DXF space
      updateUserPolygonWarp();

      // Layer 2: Warped deed PDF image (the PowerPoint transparent overlay)
      if (state.showWarpedPdf && warper && state.histPdfCanvas && state.histPdfW > 0) {
        drawWarpedPdfImage(trueCtx, warper, vp, w, h);
      }

      // Layer 3: Warped deed DXF boundary
      if (warper && state.showWarpedDxf !== false) {
        drawWarpedEntitiesGIS(trueCtx, state.histEntities, warper, vp, h, "#ff1744", state.warpedDxfOpacity);
      }

      // Layer 3b: PowerPoint-style Deed Aspect Squeeze Handles
      if (warper && state.showOverlay && state.showDeedHandles !== false && state.showWarpedDxf !== false) {
        drawDeedTransformGizmo(trueCtx, vp, h);
      }

      // Layer 4: Field Survey DXFs (Muestreos de campo)
      // 4a. In 2019 by Cristian Cortez (CercoCampo_CristianCortes_Marz_2019.dxf)
      if (state.showTrueDxf !== false) {
        drawEntitiesGIS(trueCtx, state.trueEntities, vp, h, (state.styleTrueDxf && state.styleTrueDxf.color) || "#00e676", state.trueDxfOpacity, state.styleTrueDxf);
      }
      // 4b. In 2025 by Wilmar Valoy (CercoCampo_WilmarValoy_Agos_2025.dxf)
      if (state.showSurveyValoy2025 !== false) {
        drawEntitiesGIS(trueCtx, state.surveyValoy2025Entities, vp, h, (state.styleSurveyValoy2025 && state.styleSurveyValoy2025.color) || "#ffb300", state.surveyValoy2025Opacity, state.styleSurveyValoy2025);
      }
      // 4c. In 2026 by Cristian Cortez (CercoCampo_CristianCortes_Sept_2026.dxf)
      if (state.showSurveyCortez2025 !== false) {
        drawEntitiesGIS(trueCtx, state.surveyCortez2025Entities, vp, h, (state.styleSurveyCortez2025 && state.styleSurveyCortez2025.color) || "#00e5ff", state.surveyCortez2025Opacity, state.styleSurveyCortez2025);
      }

      // Layer 4b: Temporary Reference DXF Layers
      (state.refDxfFiles || []).forEach(ref => {
        if (!ref.visible || ref.opacity <= 0) return;
        drawEntitiesGIS(trueCtx, ref.entities, vp, h, ref.style.color, ref.opacity, ref.style);
      });

      // Layer 4c: Temporary Reference Checkpoint Markers
      drawTempMarkersGIS(trueCtx, vp, h);

      // Layer 4d: Parametric 1D Test Axes (Hypothesis Testing)
      if (typeof drawTestAxesGIS === "function") {
        drawTestAxesGIS(trueCtx, vp, h);
      }

      // Layer 5: Target anchor pen buffer disks & residual lines
      state.anchors.forEach(anc => {
        const isEnabled = anc.active !== false && anc.enabled !== false;
        const tp = worldToScreenGIS(anc.dst, vp, h);
        if (warper) {
          const wp = worldToScreenGIS(warper(anc.src), vp, h);
          trueCtx.beginPath(); trueCtx.moveTo(wp.x,wp.y); trueCtx.lineTo(tp.x,tp.y);
          trueCtx.strokeStyle = isEnabled ? "#ff1744" : "rgba(255, 23, 68, 0.25)";
          trueCtx.lineWidth = isEnabled ? 1.5 : 1;
          trueCtx.setLineDash(isEnabled ? [3,3] : [2,4]); trueCtx.stroke(); trueCtx.setLineDash([]);
          trueCtx.beginPath(); trueCtx.arc(wp.x,wp.y, isEnabled ? 4 : 3, 0, Math.PI*2);
          trueCtx.fillStyle = isEnabled ? "#ff1744" : "rgba(255, 23, 68, 0.3)"; trueCtx.fill();
        }
        // Render pen buffer disk around anchor center (nearest vertex if Constrain is on, or anchor origin during unconstrained simulation)
        if (isEnabled && state.optBufferRadius > 0 && (state.constrainAnchorsToField || state.tuningAnchorsActive)) {
          let centerPt = null;
          if (state.constrainAnchorsToField) {
            const nearestField = findNearestFieldVertex(anc.dst);
            if (nearestField && nearestField.dist <= (state.optBufferRadius * 1.5)) {
              centerPt = nearestField;
            }
          } else if (state.tuningAnchorsActive && state.tuningAnchorCenters) {
            const ancIdx = state.anchors.indexOf(anc);
            if (ancIdx >= 0 && state.tuningAnchorCenters[ancIdx]) {
              centerPt = state.tuningAnchorCenters[ancIdx];
            }
          }

          if (centerPt) {
            const sCenter = worldToScreenGIS(centerPt, vp, h);
            const rPx = state.optBufferRadius * vp.scale;
            trueCtx.save();
            trueCtx.beginPath();
            trueCtx.arc(sCenter.x, sCenter.y, rPx, 0, Math.PI * 2);
            trueCtx.fillStyle = (state.activeDeed === "196") ? "rgba(255, 23, 68, 0.08)" : "rgba(0, 229, 255, 0.08)";
            trueCtx.fill();
            trueCtx.strokeStyle = (state.activeDeed === "196") ? "rgba(255, 23, 68, 0.55)" : "rgba(0, 229, 255, 0.55)";
            trueCtx.lineWidth = 1.5;
            trueCtx.setLineDash([4, 4]);
            trueCtx.stroke();
            trueCtx.setLineDash([]);

            // Center crosshair marker on the buffer disk center
            trueCtx.beginPath();
            trueCtx.arc(sCenter.x, sCenter.y, 3, 0, Math.PI * 2);
            trueCtx.fillStyle = (state.activeDeed === "196") ? "#ff1744" : "#00e5ff";
            trueCtx.fill();
            trueCtx.strokeStyle = "#ffffff";
            trueCtx.lineWidth = 1;
            trueCtx.stroke();
            trueCtx.restore();
          }
        }
      });

      // Layer 6: Hand-crafted user polygon
      drawUserPolygon(trueCtx, vp, h);

      // Layer 6.5: Autonomous Custom Field Polygon
      updateCustomPolygonAnchors();
      drawCustomPolygon(trueCtx, vp, h);

      // Layer 7: Target anchor pins + white label cards + photos (BRING TO VERY FRONT OVER POLYGON LINES)
      state.anchors.forEach(anc => {
        const isEnabled = anc.active !== false && anc.enabled !== false;
        const tp = worldToScreenGIS(anc.dst, vp, h);

        trueCtx.save();
        if (!isEnabled) {
          trueCtx.globalAlpha = 0.35;
        }
        // Distinct visual aura/indicator based on anchor mode
        if (isEnabled) {
          if (anc.axisId != null && anc.optimize !== true) {
            // Floating Guide (Rubber band on axis): cyan dotted rail ring
            trueCtx.beginPath();
            trueCtx.arc(tp.x, tp.y, 14, 0, Math.PI * 2);
            trueCtx.strokeStyle = "#00e5ff";
            trueCtx.lineWidth = 1.6;
            trueCtx.setLineDash([3, 3]);
            trueCtx.stroke();
            trueCtx.setLineDash([]);
          } else if (anc.optimize === true) {
            // Actively optimized: glowing target ring
            trueCtx.beginPath();
            trueCtx.arc(tp.x, tp.y, 14, 0, Math.PI * 2);
            trueCtx.strokeStyle = (anc.axisId != null) ? "#e040fb" : "#76ff03";
            trueCtx.lineWidth = 1.6;
            trueCtx.stroke();
          }
        }

        // Draw badge pin with number inside
        drawAnchorPin(trueCtx, anc, tp);

        // Anchor labels are controlled by the eye toggle (state.showMojones1073 and anc.showLabel, hidden for Deed 196)
        const showMojones = (state.activeDeed === "196") ? false : (state.showMojones1073 !== false);
        if (showMojones && anc.showLabel !== false) {
          drawAnchorLabelCard(trueCtx, anc, tp, false);
        }
        trueCtx.restore();
      });

      // Layer 8: Snap target ring indicator
      if (state.currentSnapTarget) {
        drawSnapTargetOnCanvas(trueCtx, state.currentSnapTarget.screenPt, state.currentSnapTarget.label, state.currentSnapTarget.sourceType);
      }
      if (state.customPolySnapTarget) {
        drawCustomPolySnapTargetOnCanvas(trueCtx, state.customPolySnapTarget.screenPt, state.customPolySnapTarget.label);
      }

      // Layer 9: Measuring Tool overlay
      drawMeasuringToolGIS(trueCtx, vp, h);
    }

    /* ── Measuring Tool Visual Renderer ──────────────────────────────── */
    function drawMeasureLabel(ctx, text, x, y, isDraft) {
      ctx.save();
      ctx.font = "bold 11px monospace";
      const tm = ctx.measureText(text);
      const pw = tm.width + 10;
      const ph = 18;
      ctx.fillStyle = isDraft ? "rgba(35, 28, 5, 0.90)" : "rgba(18, 24, 38, 0.90)";
      ctx.strokeStyle = isDraft ? "#ffea00" : "#ffb300";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 4);
      } else {
        ctx.rect(x - pw / 2, y - ph / 2, pw, ph);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDraft ? "#ffea00" : "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function drawMeasureAreaBadge(ctx, text, x, y) {
      ctx.save();
      ctx.font = "bold 12px sans-serif";
      const tm = ctx.measureText(text);
      const pw = tm.width + 14;
      const ph = 22;
      ctx.fillStyle = "rgba(18, 24, 38, 0.94)";
      ctx.strokeStyle = "#ffb300";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 5);
      } else {
        ctx.rect(x - pw / 2, y - ph / 2, pw, ph);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffb300";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function drawMeasuringToolGIS(ctx, vp, canvasH) {
      const mt = state.measureTool;
      if (!mt || (!mt.active && mt.points.length === 0)) return;

      const pts = mt.points;
      const cur = (mt.active && !mt.closed && mt.cursorPt) ? mt.cursorPt : null;
      const activePts = cur ? [...pts, cur] : [...pts];
      if (activePts.length === 0) return;

      ctx.save();

      // 1. Polygon Fill for >= 3 points (or 2 points + live cursor)
      if (activePts.length >= 3) {
        ctx.beginPath();
        const s0 = worldToScreenGIS(activePts[0], vp, canvasH);
        ctx.moveTo(s0.x, s0.y);
        for (let i = 1; i < activePts.length; i++) {
          const s = worldToScreenGIS(activePts[i], vp, canvasH);
          ctx.lineTo(s.x, s.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 179, 0, 0.15)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 179, 0, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Confirmed solid segments
      if (pts.length >= 2) {
        ctx.beginPath();
        const s0 = worldToScreenGIS(pts[0], vp, canvasH);
        ctx.moveTo(s0.x, s0.y);
        for (let i = 1; i < pts.length; i++) {
          const s = worldToScreenGIS(pts[i], vp, canvasH);
          ctx.lineTo(s.x, s.y);
        }
        if (mt.closed) {
          ctx.closePath();
        }
        ctx.strokeStyle = "#ffb300";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // 3. Dynamic rubber-band segment to cursor
      if (cur && pts.length >= 1) {
        const lastPt = pts[pts.length - 1];
        const sLast = worldToScreenGIS(lastPt, vp, canvasH);
        const sCur = worldToScreenGIS(cur, vp, canvasH);
        ctx.beginPath();
        ctx.moveTo(sLast.x, sLast.y);
        ctx.lineTo(sCur.x, sCur.y);
        ctx.strokeStyle = "#ffea00";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const segDist = Math.hypot(cur.x - lastPt.x, cur.y - lastPt.y);
        if (segDist > 0.05) {
          const midX = (sLast.x + sCur.x) / 2;
          const midY = (sLast.y + sCur.y) / 2;
          drawMeasureLabel(ctx, `${segDist.toFixed(2)} m`, midX, midY, true);
        }
      }

      // 4. Badges for confirmed segments
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const s1 = worldToScreenGIS(p1, vp, canvasH);
        const s2 = worldToScreenGIS(p2, vp, canvasH);
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;
        drawMeasureLabel(ctx, `${dist.toFixed(2)} m`, midX, midY, false);
      }
      if (mt.closed && pts.length >= 3) {
        const p1 = pts[pts.length - 1];
        const p2 = pts[0];
        const s1 = worldToScreenGIS(p1, vp, canvasH);
        const s2 = worldToScreenGIS(p2, vp, canvasH);
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;
        drawMeasureLabel(ctx, `${dist.toFixed(2)} m`, midX, midY, false);
      }

      // 5. Point dots and index numbers
      pts.forEach((pt, idx) => {
        const s = worldToScreenGIS(pt, vp, canvasH);
        const isHovered = (state.hoverMeasureMarker === idx);
        const isDragged = (state.draggingMeasureMarker === idx);

        if (isHovered || isDragged) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 214, 0, 0.25)";
          ctx.fill();
          ctx.strokeStyle = "#ffd600";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, (isHovered || isDragged) ? 6 : 5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? "#00e676" : "#ffb300";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`#${idx + 1}`, s.x + 8, s.y - 4);
      });

      // 6. Centroid Area Badge
      if ((mt.closed || pts.length >= 3) && pts.length >= 3) {
        let signedArea = 0;
        let cx = 0, cy = 0;
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
          signedArea += cross;
          cx += pts[i].x;
          cy += pts[i].y;
        }
        const areaM2 = Math.abs(signedArea) / 2;
        cx /= pts.length;
        cy /= pts.length;
        const sCentroid = worldToScreenGIS({ x: cx, y: cy }, vp, canvasH);
        const plazas = areaM2 / 6400;
        const ha = areaM2 / 10000;
        const areaStr = areaM2 >= 10000 
          ? `Area: ${areaM2.toLocaleString('en-US', {maximumFractionDigits:1})} m² (${ha.toFixed(2)} ha / ${plazas.toFixed(2)} pl)`
          : `Area: ${areaM2.toFixed(1)} m² (${plazas.toFixed(2)} pl)`;
        drawMeasureAreaBadge(ctx, areaStr, sCentroid.x, sCentroid.y);
      }

      ctx.restore();
    }

    /* -----------------------------------------------------------------------
       Draw the deed PDF image warped into GIS space on the true-field canvas.
       Uses high-performance Piecewise Triangle Mesh Warping by default so that
       non-linear TPS rubber-sheeting, homography, and affine transforms deform
       the raster image to stay 100% pinned to the vector boundaries.
    ----------------------------------------------------------------------- */
    function drawWarpedPdfImage(ctx, warper, vp, canvasW, canvasH) {
      if (!state.histPdfCanvas || state.histPdfW <= 0) return;
      const pdfW = state.histPdfW, pdfH = state.histPdfH;
      const opacity = state.warpedPdfOpacity;
      if (opacity <= 0) return;

      // Aspect-ratio-preserving square grid cells:
      // When the deed image is non-square (e.g. landscape or portrait), compute cols and rows
      // proportionally so that every single cell in deed image space is an authentic square.
      const baseRes = state.deedMeshRes || 64;
      const maxDim = Math.max(pdfW, pdfH);
      const cellSize = maxDim / baseRes;
      const gridCols = Math.max(2, Math.round(pdfW / cellSize));
      const gridRows = Math.max(2, Math.round(pdfH / cellSize));
      const showWireframe = !!state.showDeedMeshWireframe;

      // Fast-path: for purely linear models (Helmert Similarity with no aspect squeeze)
      // and when wireframe is not requested, a single affine transform is mathematically exact:
      const hasScale = state.deedScale && Math.abs((state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0)) - 1.0) > 1e-5;
      const isPureHelmert = (state.algorithm === "SIMILARITY" && !hasScale);

      if (isPureHelmert && !showWireframe) {
        const corners = [
          { px: 0,    py: 0 },
          { px: pdfW, py: 0 },
          { px: 0,    py: pdfH }
        ].map(c => worldToScreenGIS(warper({ x: c.px, y: c.py }), vp, canvasH));

        const [s0, s1, s3] = corners;
        const a  = (s1.x - s0.x) / pdfW;
        const b  = (s1.y - s0.y) / pdfW;
        const c_ = (s3.x - s0.x) / pdfH;
        const d_ = (s3.y - s0.y) / pdfH;
        const e  = s0.x;
        const f  = s0.y;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.setTransform(a, b, c_, d_, e, f);
        ctx.drawImage(state.histPdfCanvas, 0, 0, pdfW, pdfH);
        ctx.restore();
        return;
      }

      // Piecewise triangle mesh warping (for TPS rubber-sheeting, homography, or wireframe grid display)
      // 1. Precalculate screen coordinates for all grid vertices
      const pts = [];
      for (let r = 0; r <= gridRows; r++) {
        const row = [];
        const v = (r / gridRows) * pdfH;
        for (let c = 0; c <= gridCols; c++) {
          const u = (c / gridCols) * pdfW;
          const wGis = warper({ x: u, y: v });
          const sScr = worldToScreenGIS(wGis, vp, canvasH);
          row.push(sScr);
        }
        pts.push(row);
      }

      // Render to an offscreen buffer at full 1.0 opacity first.
      // Drawing adjacent clipped triangles with subpixel padding at alpha < 1.0 compounds opacity
      // along shared edges, producing visible white grid seam lines.
      // At alpha 1.0, adjacent overlapping pixels overwrite seamlessly with zero seam artifacts.
      if (!drawWarpedPdfImage._offCanvas) {
        drawWarpedPdfImage._offCanvas = document.createElement("canvas");
      }
      const offCanvas = drawWarpedPdfImage._offCanvas;
      if (offCanvas.width !== canvasW || offCanvas.height !== canvasH) {
        offCanvas.width = canvasW;
        offCanvas.height = canvasH;
      }
      const targetCtx = offCanvas.getContext("2d");
      targetCtx.clearRect(0, 0, canvasW, canvasH);
      targetCtx.save();
      targetCtx.globalAlpha = 1.0;

      const cellW = pdfW / gridCols;
      const cellH = pdfH / gridRows;

      function drawTriangle(u0, v0, u1, v1, u2, v2, p0, p1, p2) {
        const du1 = u1 - u0, dv1 = v1 - v0;
        const du2 = u2 - u0, dv2 = v2 - v0;
        const dx1 = p1.x - p0.x, dy1 = p1.y - p0.y;
        const dx2 = p2.x - p0.x, dy2 = p2.y - p0.y;
        const det = du1 * dv2 - du2 * dv1;
        if (Math.abs(det) < 1e-9) return;

        const a  = (dx1 * dv2 - dx2 * dv1) / det;
        const c_ = (dx2 * du1 - dx1 * du2) / det;
        const b  = (dy1 * dv2 - dy2 * dv1) / det;
        const d_ = (dy2 * du1 - dy1 * du2) / det;
        const e  = p0.x - a * u0 - c_ * v0;
        const f  = p0.y - b * u0 - d_ * v0;

        // Seam dilation: expand clip path outward by 0.5px from centroid to eliminate antialiased edge cracks
        const cx = (p0.x + p1.x + p2.x) / 3;
        const cy = (p0.y + p1.y + p2.y) / 3;
        const pad = 0.5;
        const d0x = p0.x - cx, d0y = p0.y - cy, l0 = Math.hypot(d0x, d0y) || 1;
        const d1x = p1.x - cx, d1y = p1.y - cy, l1 = Math.hypot(d1x, d1y) || 1;
        const d2x = p2.x - cx, d2y = p2.y - cy, l2 = Math.hypot(d2x, d2y) || 1;

        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.moveTo(p0.x + (d0x / l0) * pad, p0.y + (d0y / l0) * pad);
        targetCtx.lineTo(p1.x + (d1x / l1) * pad, p1.y + (d1y / l1) * pad);
        targetCtx.lineTo(p2.x + (d2x / l2) * pad, p2.y + (d2y / l2) * pad);
        targetCtx.closePath();
        targetCtx.clip();

        targetCtx.setTransform(a, b, c_, d_, e, f);
        targetCtx.drawImage(state.histPdfCanvas, 0, 0, pdfW, pdfH);
        targetCtx.restore();
      }

      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const u0 = c * cellW,       v0 = r * cellH;
          const u1 = (c + 1) * cellW, v1 = (r + 1) * cellH;

          const p00 = pts[r][c];
          const p10 = pts[r][c + 1];
          const p01 = pts[r + 1][c];
          const p11 = pts[r + 1][c + 1];

          drawTriangle(u0, v0, u1, v0, u0, v1, p00, p10, p01);
          drawTriangle(u1, v0, u1, v1, u0, v1, p10, p11, p01);
        }
      }

      targetCtx.restore();

      // Composite the seamless warped deed to the main canvas with user opacity
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(offCanvas, 0, 0);
      ctx.restore();

      // Optional Wireframe overlay
      if (showWireframe) {
        ctx.save();
        ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
        ctx.lineWidth = 0.8;
        for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols; c++) {
            const p00 = pts[r][c];
            const p10 = pts[r][c + 1];
            const p01 = pts[r + 1][c];
            const p11 = pts[r + 1][c + 1];

            ctx.beginPath();
            ctx.moveTo(p00.x, p00.y);
            ctx.lineTo(p10.x, p10.y);
            ctx.lineTo(p01.x, p01.y);
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(p10.x, p10.y);
            ctx.lineTo(p11.x, p11.y);
            ctx.lineTo(p01.x, p01.y);
            ctx.closePath();
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    // ── Pan / Zoom / Anchor interactions ──────────────────────────────
    let spacePressed=false, isPanning=false;
    let panStart={x:0,y:0}, vpStart={offsetX:0,offsetY:0}, activePanViewport=null, clickStart={x:0,y:0};

    const btnModePan    = document.getElementById("btn-mode-pan");
    const btnModeAnchor = document.getElementById("btn-mode-anchor");

    // [/SECTION: JS_DEED_TRANSFORM_GIZMO]
