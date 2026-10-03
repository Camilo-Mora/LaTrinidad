
    // ============================================================================
    // [SECTION: JS_POLYGON_DISTANCE_AREA]
    // ============================================================================
    /* ==========================================================================
       USER POLYGON — Distance & Area Feature (node drag, delete, snap ring)
       ========================================================================== */
    const POLY_SNAP_RADIUS = 15; // screen pixels – matches index.html snap radius

    /** Find nearest vertex from Field.dxf (state.trueEntities) and any visible reference DXFs (state.refDxfFiles) to a given world point (in meters) */
    function findNearestFieldVertex(worldPt) {
      if (!worldPt) return null;
      let closest = null;
      let minDist = Infinity;

      // 1. Check temporary reference markers on field canvas first (highest priority for testing specific locations)
      if (state.tempMarkers && state.tempMarkers.length > 0) {
        for (let m = 0; m < state.tempMarkers.length; m++) {
          const pt = state.tempMarkers[m];
          if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;
          const d = Math.hypot(pt.x - worldPt.x, pt.y - worldPt.y);
          if (d < minDist) {
            minDist = d;
            closest = { x: pt.x, y: pt.y, dist: d, isMarker: true, label: pt.label };
          }
        }
        // If a temporary marker is within the test buffer radius or detection zone, lock to it directly
        const testRadius = Math.max((state.optBufferRadius || 3.0) * 1.5, 5.0);
        if (closest && closest.dist <= testRadius) {
          return closest;
        }
      }

      // 2. Check Field survey DXF entities (only visible surveys with opacity > 0)
      const fieldSurveySets = [
        (state.showTrueDxf !== false && (state.trueDxfOpacity == null || state.trueDxfOpacity > 0)) ? state.trueEntities : null,
        (state.showSurveyValoy2025 !== false && (state.surveyValoy2025Opacity == null || state.surveyValoy2025Opacity > 0)) ? state.surveyValoy2025Entities : null,
        (state.showSurveyCortez2025 !== false && (state.surveyCortez2025Opacity == null || state.surveyCortez2025Opacity > 0)) ? state.surveyCortez2025Entities : null
      ].filter(Boolean);
      fieldSurveySets.forEach(surveyEnts => {
        if (!surveyEnts || surveyEnts.length === 0) return;
        for (let entIdx = 0; entIdx < surveyEnts.length; entIdx++) {
          const ent = surveyEnts[entIdx];
          if (!ent || !ent.points) continue;
          for (let ptIdx = 0; ptIdx < ent.points.length; ptIdx++) {
            const pt = ent.points[ptIdx];
            if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;
            const d = Math.hypot(pt.x - worldPt.x, pt.y - worldPt.y);
            if (d < minDist) {
              minDist = d;
              closest = { x: pt.x, y: pt.y, dist: d };
            }
          }
        }
      });

      // 3. Check added temporary Reference DXFs
      if (state.refDxfFiles && state.refDxfFiles.length > 0) {
        for (let r = 0; r < state.refDxfFiles.length; r++) {
          const ref = state.refDxfFiles[r];
          if (!ref.visible || ref.opacity <= 0 || !ref.entities) continue;
          for (let entIdx = 0; entIdx < ref.entities.length; entIdx++) {
            const ent = ref.entities[entIdx];
            if (!ent || !ent.points) continue;
            for (let ptIdx = 0; ptIdx < ent.points.length; ptIdx++) {
              const pt = ent.points[ptIdx];
              if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;
              const d = Math.hypot(pt.x - worldPt.x, pt.y - worldPt.y);
              if (d < minDist) {
                minDist = d;
                closest = { x: pt.x, y: pt.y, dist: d };
              }
            }
          }
        }
      }

      return closest;
    }

    /** Hit test existing measurement points/markers on true canvas (for dragging or deleting) */
    function findMeasureMarkerAt(mouseX, mouseY, vp, canvasH, hitRadiusPx = 16) {
      if (!state.measureTool || !state.measureTool.points || state.measureTool.points.length === 0) return null;
      const pts = state.measureTool.points;
      for (let i = 0; i < pts.length; i++) {
        const s = worldToScreenGIS(pts[i], vp, canvasH);
        const dist = Math.hypot(s.x - mouseX, s.y - mouseY);
        if (dist <= hitRadiusPx) {
          return { idx: i, pt: pts[i], screenPt: s, dist };
        }
      }
      return null;
    }

    /** Find nearest visible vertex across all active layers for Measuring Tool */
    function findMeasureSnapTarget(mouseX, mouseY, vp, canvasH) {
      if (state.measureTool && state.measureTool.snapEnabled === false) return null;
      const SNAP_RADIUS = 18; // screen pixels
      let best = null;
      let minDist = SNAP_RADIUS;

      // 0. If measuring and have >= 2 points, check point 0 to allow closing the polygon
      const mt = state.measureTool;
      if (mt && mt.active && !mt.closed && mt.points && mt.points.length >= 2) {
        const p0 = mt.points[0];
        const s0 = worldToScreenGIS(p0, vp, canvasH);
        const d0 = Math.hypot(s0.x - mouseX, s0.y - mouseY);
        if (d0 <= minDist) {
          minDist = d0;
          best = {
            worldPt: { x: p0.x, y: p0.y },
            screenPt: s0,
            label: '✓ Close Polygon (Pt #1)',
            sourceType: 'measure',
            isFirstMeasurePt: true
          };
        }
      }

      // 1. Reconstructed Lindero La Trinidad Polygon (state.userPolygon) - only when visible!
      if (state.userPolygon && state.userPolygon.show !== false && state.userPolygon.vertices && state.userPolygon.vertices.length > 0) {
        const verts = state.userPolygon.vertices;
        for (let i = 0; i < verts.length; i++) {
          const v = verts[i];
          if (!v || typeof v.x !== "number" || typeof v.y !== "number") continue;
          const sp = worldToScreenGIS(v, vp, canvasH);
          const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
          if (d <= minDist) {
            minDist = d;
            best = {
              worldPt: { x: v.x, y: v.y },
              screenPt: sp,
              label: `⚓ Lindero Reconstruido #${i + 1}`,
              sourceType: 'boundary'
            };
          }
        }
      }

      // 2. Custom Field Polygons (state.customPolygons) - only visible polygons!
      const customPolys = state.customPolygons || (state.customPolygon ? [state.customPolygon] : []);
      for (const cpoly of customPolys) {
        if (!cpoly || cpoly.visible === false || !cpoly.vertices || cpoly.vertices.length === 0) continue;
        for (let i = 0; i < cpoly.vertices.length; i++) {
          const cv = cpoly.vertices[i];
          if (!cv || typeof cv.x !== "number" || typeof cv.y !== "number") continue;
          const sp = worldToScreenGIS(cv, vp, canvasH);
          const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
          if (d <= minDist) {
            minDist = d;
            best = {
              worldPt: { x: cv.x, y: cv.y },
              screenPt: sp,
              label: `${cpoly.name || 'Custom'} #${i + 1}`,
              sourceType: 'custom'
            };
          }
        }
      }

      // 3. Field Surveys (DXF) - ONLY IF VISIBLE AND OPACITY > 0
      // 3a. Cortez 2019
      if (state.showTrueDxf !== false && (state.trueDxfOpacity == null || state.trueDxfOpacity > 0) && state.trueEntities && state.trueEntities.length > 0) {
        for (let entIdx = 0; entIdx < state.trueEntities.length; entIdx++) {
          const ent = state.trueEntities[entIdx];
          const pts = ent.points || ent.vertices;
          if (!pts) continue;
          for (let ptIdx = 0; ptIdx < pts.length; ptIdx++) {
            const pt = pts[ptIdx];
            if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;
            const sp = worldToScreenGIS(pt, vp, canvasH);
            const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
            if (d <= minDist) {
              minDist = d;
              best = {
                worldPt: { x: pt.x, y: pt.y },
                screenPt: sp,
                label: `Survey Cortez 2019 #${ptIdx + 1}`,
                sourceType: 'field'
              };
            }
          }
        }
      }

      // 3b. Valoy 2025
      if (state.showSurveyValoy2025 !== false && (state.surveyValoy2025Opacity == null || state.surveyValoy2025Opacity > 0) && state.surveyValoy2025Entities && state.surveyValoy2025Entities.length > 0) {
        for (let entIdx = 0; entIdx < state.surveyValoy2025Entities.length; entIdx++) {
          const ent = state.surveyValoy2025Entities[entIdx];
          const pts = ent.points || ent.vertices;
          if (!pts) continue;
          for (let ptIdx = 0; ptIdx < pts.length; ptIdx++) {
            const pt = pts[ptIdx];
            if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;
            const sp = worldToScreenGIS(pt, vp, canvasH);
            const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
            if (d <= minDist) {
              minDist = d;
              best = {
                worldPt: { x: pt.x, y: pt.y },
                screenPt: sp,
                label: `Survey Valoy 2025 #${ptIdx + 1}`,
                sourceType: 'field'
              };
            }
          }
        }
      }

      // 3c. Cortez 2026
      if (state.showSurveyCortez2025 !== false && (state.surveyCortez2025Opacity == null || state.surveyCortez2025Opacity > 0) && state.surveyCortez2025Entities && state.surveyCortez2025Entities.length > 0) {
        for (let entIdx = 0; entIdx < state.surveyCortez2025Entities.length; entIdx++) {
          const ent = state.surveyCortez2025Entities[entIdx];
          const pts = ent.points || ent.vertices;
          if (!pts) continue;
          for (let ptIdx = 0; ptIdx < pts.length; ptIdx++) {
            const pt = pts[ptIdx];
            if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;
            const sp = worldToScreenGIS(pt, vp, canvasH);
            const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
            if (d <= minDist) {
              minDist = d;
              best = {
                worldPt: { x: pt.x, y: pt.y },
                screenPt: sp,
                label: `Survey Cortez 2026 #${ptIdx + 1}`,
                sourceType: 'field'
              };
            }
          }
        }
      }

      // 4. Temporary Reference DXF Files (only visible)
      if (state.refDxfFiles && state.refDxfFiles.length > 0) {
        for (const ref of state.refDxfFiles) {
          if (!ref.visible || ref.opacity <= 0 || !ref.entities) continue;
          for (let entIdx = 0; entIdx < ref.entities.length; entIdx++) {
            const ent = ref.entities[entIdx];
            const pts = ent.points || ent.vertices;
            if (!pts) continue;
            for (let ptIdx = 0; ptIdx < pts.length; ptIdx++) {
              const pt = pts[ptIdx];
              if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;
              const sp = worldToScreenGIS(pt, vp, canvasH);
              const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
              if (d <= minDist) {
                minDist = d;
                best = {
                  worldPt: { x: pt.x, y: pt.y },
                  screenPt: sp,
                  label: `${ref.name || 'Ref DXF'} #${ptIdx + 1}`,
                  sourceType: 'ref'
                };
              }
            }
          }
        }
      }

      // 5. Warped Deed DXF boundary (Escritura 1073 overlay) - only when visible!
      if (state.showOverlay && state.showWarpedDxf !== false && (state.warpedDxfOpacity == null || state.warpedDxfOpacity > 0) && state.histEntities && state.histEntities.length > 0) {
        let warper = null;
        const activeAnchors = getActiveAnchors();
        if (activeAnchors.length >= 2) {
          try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
        }
        if (warper) {
          for (let entIdx = 0; entIdx < state.histEntities.length; entIdx++) {
            const ent = state.histEntities[entIdx];
            const pts = ent.points || ent.vertices;
            if (!pts) continue;
            for (let ptIdx = 0; ptIdx < pts.length; ptIdx++) {
              const rawPt = pts[ptIdx];
              if (!rawPt || typeof rawPt.x !== "number" || typeof rawPt.y !== "number") continue;
              const wPt = warper(rawPt);
              const sp = worldToScreenGIS(wPt, vp, canvasH);
              const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
              if (d <= minDist) {
                minDist = d;
                best = {
                  worldPt: { x: wPt.x, y: wPt.y },
                  screenPt: sp,
                  label: `📜 Escritura 1073 #${ptIdx + 1}`,
                  sourceType: 'deed'
                };
              }
            }
          }
        }
      }

      // 6. Mojones / Anchors (Escritura 1073 Control Points)
      if (state.anchors && state.anchors.length > 0) {
        for (const anc of state.anchors) {
          if (anc.active === false || anc.enabled === false) continue;
          const sp = worldToScreenGIS(anc.dst, vp, canvasH);
          const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
          if (d <= minDist) {
            minDist = d;
            best = {
              worldPt: { x: anc.dst.x, y: anc.dst.y },
              screenPt: sp,
              label: `Mojón ${anc.name || '#' + anc.id}`,
              sourceType: 'anchor'
            };
          }
        }
      }

      // 7. Temporary Checkpoint Markers
      if (state.tempMarkers && state.tempMarkers.length > 0) {
        for (const m of state.tempMarkers) {
          if (!m || typeof m.x !== "number" || typeof m.y !== "number") continue;
          const sp = worldToScreenGIS(m, vp, canvasH);
          const d = Math.hypot(sp.x - mouseX, sp.y - mouseY);
          if (d <= minDist) {
            minDist = d;
            best = {
              worldPt: { x: m.x, y: m.y },
              screenPt: sp,
              label: `Marker ${m.label || ''}`,
              sourceType: 'marker'
            };
          }
        }
      }

      return best;
    }

    /** Find nearest vertex from warped Deed DXF (state.histEntities warped to GIS space) */
    function findNearestWarpedDeedVertex(worldPt) {
      if (!state.histEntities || state.histEntities.length === 0 || !worldPt) return null;
      let warper = null;
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length >= 2) {
        try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
      }
      let closest = null;
      let minDist = Infinity;
      for (let entIdx = 0; entIdx < state.histEntities.length; entIdx++) {
        const ent = state.histEntities[entIdx];
        if (!ent || !ent.points) continue;
        for (let ptIdx = 0; ptIdx < ent.points.length; ptIdx++) {
          const rawPt = ent.points[ptIdx];
          if (!rawPt || typeof rawPt.x !== "number" || typeof rawPt.y !== "number") continue;
          const warpedPt = warper ? warper(rawPt) : { x: rawPt.x, y: rawPt.y };
          const d = Math.hypot(warpedPt.x - worldPt.x, warpedPt.y - worldPt.y);
          if (d < minDist) {
            minDist = d;
            closest = {
              x: warpedPt.x,
              y: warpedPt.y,
              deedPt: { x: rawPt.x, y: rawPt.y },
              dist: d
            };
          }
        }
      }
      return closest;
    }

    /** Draw snap target indicator on canvas with optional label badge and colored ring */
    function drawSnapTargetOnCanvas(ctx, screenPt, label, sourceType) {
      if (!screenPt) return;
      const { x: sx, y: sy } = screenPt;
      ctx.save();
      const ringColor = (sourceType === 'deed') ? "#ff1744" :
                        (sourceType === 'boundary') ? "#00e5ff" :
                        (sourceType === 'field') ? "#00e676" :
                        (sourceType === 'anchor') ? "#d500f9" :
                        (sourceType === 'marker') ? "#ff5252" :
                        (sourceType === 'custom') ? "#ffb300" :
                        (sourceType === 'measure') ? "#ffd600" : "#ffd600";

      ctx.beginPath(); ctx.arc(sx, sy, 13, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = ringColor; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 16, sy); ctx.lineTo(sx + 16, sy);
      ctx.moveTo(sx, sy - 16); ctx.lineTo(sx, sy + 16);
      ctx.strokeStyle = ringColor; ctx.lineWidth = 1.2; ctx.stroke();

      if (label) {
        ctx.font = "bold 11px sans-serif";
        const tm = ctx.measureText(label);
        const pw = tm.width + 12;
        const ph = 18;
        const px = sx + 14;
        const py = sy - 22;
        ctx.fillStyle = "rgba(18, 24, 38, 0.92)";
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 4);
        else ctx.rect(px, py, pw, ph);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ringColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, px + 6, py + ph / 2);
      }
      ctx.restore();
    }

    /** Determine whether polygon vertex i has an associated deed length on either adjacent segment */
    function vertexHasDeedLength(poly, i) {
      if (!poly || !poly.vertices || !poly.segmentLengths) return false;
      const N = poly.vertices.length;
      if (N === 0 || i < 0 || i >= N) return false;
      const lenNext = poly.segmentLengths[i];
      let lenPrev = null;
      if (poly.closed) {
        lenPrev = poly.segmentLengths[(i - 1 + N) % N];
      } else if (i > 0) {
        lenPrev = poly.segmentLengths[i - 1];
      }
      return (lenNext !== null && lenNext !== undefined && lenNext > 0) ||
             (lenPrev !== null && lenPrev !== undefined && lenPrev > 0);
    }

    /** Determine whether polygon vertex i is strictly deed-anchored and part of the active simulation */
    function vertexIsDeedConstrained(poly, i) {
      if (!poly || !poly.vertices) return false;
      const N = poly.vertices.length;
      if (N === 0 || i < 0 || i >= N) return false;
      const v = poly.vertices[i];
      if (!v || !v.deedPt) return false;

      // Must be adjacent to at least one segment selected for optimization
      if (poly.segmentOptimize && Array.isArray(poly.segmentOptimize)) {
        const prevIdx = (i - 1 + N) % N;
        const nextOpt = poly.segmentOptimize[i] === true;
        const prevOpt = poly.segmentOptimize[prevIdx] === true;
        if (!nextOpt && !prevOpt) return false;
      }
      return true;
    }

    /** Find nearest DXF vertex or other polygon vertex to snap to (matches index.html getFieldSnapTarget) */
    function getPolygonSnapTarget(mouseX, mouseY, vp, canvasH, ignorePtIdx = null) {
      const chk = document.getElementById("chk-polygon-snap");
      if ((chk && !chk.checked) || state.constrainPolyToDeed) return null;

      let minDistance = POLY_SNAP_RADIUS;
      let closestTarget = null;

      const checkPoint = (pt, sourceType, deedPt = null, isPolyPt = false, ptIdx = null) => {
        if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number" || isNaN(pt.x) || isNaN(pt.y)) return;
        if (isPolyPt && ignorePtIdx !== null && ptIdx === ignorePtIdx) return;
        const sp = worldToScreenGIS(pt, vp, canvasH);
        const dist = Math.hypot(sp.x - mouseX, sp.y - mouseY);
        if (dist <= minDistance) {
          minDistance = dist;
          closestTarget = {
            worldPt: { x: pt.x, y: pt.y },
            screenPt: { x: sp.x, y: sp.y },
            sourceType,
            deedPt: deedPt ? { x: deedPt.x, y: deedPt.y } : null,
            dist
          };
        }
      };

      // 1. Warped deed DXF vertices (Historical Deed) -> store original deedPt!
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length >= 2) {
        try {
          const warper = TransformMath.createWarper(state.algorithm, activeAnchors);
          (state.histEntities || []).forEach(ent => {
            (ent.points || []).forEach(dPt => {
              const wPt = warper(dPt);
              checkPoint(wPt, "deed", dPt);
            });
          });
        } catch (_) {}
      } else {
        (state.histEntities || []).forEach(ent => {
          (ent.points || []).forEach(dPt => {
            checkPoint(dPt, "deed", dPt);
          });
        });
      }

      // 2. True field DXF vertices (GIS ground truth)
      (state.trueEntities || []).forEach(ent => {
        (ent.points || []).forEach(pt => checkPoint(pt, "field", null));
      });

      // 2b. Temporary Reference DXF vertices
      (state.refDxfFiles || []).forEach(ref => {
        if (!ref.visible || ref.opacity <= 0) return;
        (ref.entities || []).forEach(ent => {
          (ent.points || []).forEach(pt => checkPoint(pt, "ref", null));
        });
      });

      // 3. User polygon's other vertices
      (state.userPolygon.vertices || []).forEach((pt, i) => {
        checkPoint(pt, "polygon", pt.deedPt || null, true, i);
      });

      return closestTarget;
    }

    /** Hit test deed DXF vertices on histCanvas */
    function findDeedNodeOnHistCanvas(mouseX, mouseY, vp, canvasH) {
      if (!state.histEntities || state.histEntities.length === 0) return null;
      const HIT_RADIUS = 14; // pixels
      for (let entIdx = 0; entIdx < state.histEntities.length; entIdx++) {
        const ent = state.histEntities[entIdx];
        if (!ent.points) continue;
        for (let ptIdx = 0; ptIdx < ent.points.length; ptIdx++) {
          const dPt = ent.points[ptIdx];
          const sp = worldToScreen(dPt, vp, canvasH);
          if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) {
            return { entIdx, ptIdx, deedPt: dPt, screenPt: sp };
          }
        }
      }
      return null;
    }

    /** Hit test deed DXF vertices on trueCanvas (warped to GIS space) */
    function findDeedNodeOnTrueCanvas(mouseX, mouseY, vp, canvasH) {
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length < 2 || !state.histEntities || state.histEntities.length === 0) return null;
      try {
        const warper = TransformMath.createWarper(state.algorithm, activeAnchors);
        const HIT_RADIUS = 14; // pixels
        for (let entIdx = 0; entIdx < state.histEntities.length; entIdx++) {
          const ent = state.histEntities[entIdx];
          if (!ent.points) continue;
          for (let ptIdx = 0; ptIdx < ent.points.length; ptIdx++) {
            const dPt = ent.points[ptIdx];
            const wPt = warper(dPt);
            const sp = worldToScreenGIS(wPt, vp, canvasH);
            if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) {
              return { entIdx, ptIdx, deedPt: dPt, warpedPt: wPt, screenPt: sp };
            }
          }
        }
      } catch (e) {}
      return null;
    }

    /** Hit test field DXF vertices on trueCanvas (GIS space) */
    function findFieldNodeOnTrueCanvas(mouseX, mouseY, vp, canvasH) {
      if (!state.trueEntities || state.trueEntities.length === 0) return null;
      const HIT_RADIUS = 14; // pixels
      for (let entIdx = 0; entIdx < state.trueEntities.length; entIdx++) {
        const ent = state.trueEntities[entIdx];
        if (!ent || !ent.points) continue;
        for (let ptIdx = 0; ptIdx < ent.points.length; ptIdx++) {
          const pt = ent.points[ptIdx];
          if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;
          const sp = worldToScreenGIS(pt, vp, canvasH);
          if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) {
            return { entIdx, ptIdx, fieldPt: pt, screenPt: sp };
          }
        }
      }
      return null;
    }

    /** Hit test temporary reference markers on trueCanvas */
    function findTempMarkerAt(mouseX, mouseY, vp, canvasH) {
      if (!state.tempMarkers || state.tempMarkers.length === 0) return null;
      const HIT_RADIUS = 14; // pixels
      for (let i = 0; i < state.tempMarkers.length; i++) {
        const m = state.tempMarkers[i];
        if (!m || typeof m.x !== "number" || typeof m.y !== "number") continue;
        const sp = worldToScreenGIS(m, vp, canvasH);
        if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) {
          return { idx: i, marker: m, screenPt: sp };
        }
      }
      return null;
    }

    /** Hit test user polygon nodes (matches index.html findMeasureMarkerAt) */
    function findUserPolyNodeAt(mouseX, mouseY, vp, canvasH) {
      const poly = state.userPolygon;
      if (!poly || !poly.vertices) return -1;
      const HIT_RADIUS = 12; // screen pixels
      for (let i = 0; i < poly.vertices.length; i++) {
        const sp = worldToScreenGIS(poly.vertices[i], vp, canvasH);
        if (Math.hypot(sp.x - mouseX, sp.y - mouseY) <= HIT_RADIUS) return i;
      }
      return -1;
    }

    /** Hit test user polygon segments to allow inserting a new vertex on click */
    function findUserPolySegmentAt(mouseX, mouseY, vp, canvasH, hitDist = 10) {
      const poly = state.userPolygon;
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

        // Project mouse coordinate onto segment line [sa, sb]
        const t = ((mouseX - sa.x) * dx + (mouseY - sa.y) * dy) / lenSq;
        // Keep clear of existing endpoints so node dragging and right-click delete are unaffected
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
                deedPt: null
              },
              dist: dist
            };
          }
        }
      }
      return best;
    }

    /**
     * Get error percentage and display color for a segment based on percent error
     * Color scale:
     *   < 2%   : Bright Green (#00e676) - Excellent match
     *   2 - 5% : Lime Green   (#aeea00) - Good match
     *   5 - 10%: Yellow       (#ffd600) - Moderate discrepancy
     *   10-20% : Orange       (#ff9100) - High error
     *   > 20%  : Red          (#ff1744) - Severe error
     *   No deed: Cyan         (#00e5ff) - Neutral unmeasured
     */
    function getSegmentErrorMeta(measLen, deedLen) {
      if (deedLen == null || isNaN(deedLen) || deedLen <= 0) {
        return { errPct: null, color: "#00e5ff", badgeColor: "rgba(0,229,255,0.18)" };
      }
      const errPct = Math.abs(measLen - deedLen) / deedLen * 100;
      let color, badgeColor;
      if (errPct < 2.0) {
        color = "#00e676"; // <2%
        badgeColor = "rgba(0,230,118,0.22)";
      } else if (errPct < 5.0) {
        color = "#aeea00"; // 2-5%
        badgeColor = "rgba(174,234,0,0.22)";
      } else if (errPct < 10.0) {
        color = "#ffd600"; // 5-10%
        badgeColor = "rgba(255,214,0,0.22)";
      } else if (errPct < 20.0) {
        color = "#ff9100"; // 10-20%
        badgeColor = "rgba(255,145,0,0.22)";
      } else {
        color = "#ff1744"; // >20%
        badgeColor = "rgba(255,23,68,0.25)";
      }
      return { errPct, color, badgeColor };
    }

    const SEG_GROUP_PALETTE = [
      "#00e5ff", // Bright Cyan
      "#ffd600", // Vibrant Yellow
      "#ff4081", // Rose / Pink
      "#00e676", // Bright Green
      "#ff9100", // Orange
      "#b388ff", // Lavender / Purple
      "#ff5252", // Coral Red
      "#76ff03", // Lime Green
      "#40c4ff", // Sky Blue
      "#e040fb", // Neon Orchid
      "#1de9b6", // Deep Teal
      "#ff6d00", // Dark Amber
    ];

    function getSectionStyle(name) {
      if (!state.defaultPolyStyle) {
        state.defaultPolyStyle = { color: "#0066ff", dash: "solid", width: 3.5, showNodes: false };
      }
      if (!name || typeof name !== "string") return state.defaultPolyStyle;
      const clean = name.trim();
      if (!clean || clean.toLowerCase().match(/^seg\s*\d+$/i)) return state.defaultPolyStyle;
      const key = clean.toLowerCase();

      if (!state.sectionStyles) state.sectionStyles = {};
      if (state.sectionStyles[key]) {
        return state.sectionStyles[key];
      }

      // Assign initial palette color
      const p = state.userPolygon;
      let color = SEG_GROUP_PALETTE[0];
      if (p && p.segmentSections) {
        const unique = [];
        p.segmentSections.forEach(s => {
          if (!s || typeof s !== "string") return;
          const c = s.trim().toLowerCase();
          if (c && !c.match(/^seg\s*\d+$/i) && !unique.includes(c)) unique.push(c);
        });
        const idx = unique.indexOf(key);
        if (idx >= 0) color = SEG_GROUP_PALETTE[idx % SEG_GROUP_PALETTE.length];
      }

      state.sectionStyles[key] = {
        color: color,
        dash: "solid",
        width: 3.5,
        showNodes: false
      };
      return state.sectionStyles[key];
    }

    function getSectionColor(name) {
      return getSectionStyle(name).color;
    }

    function updateSectionStyleControls() {
      const container = document.getElementById("section-styling-list");
      if (!container) return;

      const poly = state.userPolygon;
      if (!poly || !poly.vertices || poly.vertices.length < 2) {
        container.innerHTML = '<div style="font-size:0.67rem;color:var(--text-muted);font-style:italic;">No hay secciones definidas</div>';
        return;
      }

      const nSegs = poly.closed ? poly.vertices.length : poly.vertices.length - 1;
      const sectionCounts = {};
      let unassignedCount = 0;

      for (let i = 0; i < nSegs; i++) {
        const sec = poly.segmentSections ? poly.segmentSections[i] : null;
        if (sec && typeof sec === "string" && sec.trim() && !sec.trim().toLowerCase().match(/^seg\s*\d+$/i)) {
          const clean = sec.trim();
          sectionCounts[clean] = (sectionCounts[clean] || 0) + 1;
        } else {
          unassignedCount++;
        }
      }

      const sectionNames = Object.keys(sectionCounts);
      container.innerHTML = "";

      function createSectionCard(title, count, styleObj, onChange) {
        const card = document.createElement("div");
        card.style.cssText = "display:flex;flex-direction:column;gap:3px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06);";

        // Top line: Section Title & Nodes checkbox
        const topRow = document.createElement("div");
        topRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;font-size:0.69rem;font-weight:600;";

        const titleSpan = document.createElement("span");
        titleSpan.style.cssText = `color:${styleObj.color};display:flex;align-items:center;gap:4px;`;
        titleSpan.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:${styleObj.color};box-shadow:0 0 4px ${styleObj.color};"></span><strong>${title}</strong> <span style="font-size:0.62rem;color:var(--text-muted);font-weight:normal;">(${count} segs)</span>`;

        const nodesLabel = document.createElement("label");
        nodesLabel.className = "chk-nodes-label";
        nodesLabel.title = `Mostrar u ocultar nodos de vértice para ${title}`;
        nodesLabel.style.cssText = "display:flex;align-items:center;gap:4px;font-size:0.68rem;color:var(--text-muted);cursor:pointer;";
        const nodesChk = document.createElement("input");
        nodesChk.type = "checkbox";
        nodesChk.checked = !!styleObj.showNodes;
        nodesChk.style.cssText = "accent-color:var(--accent-cyan);cursor:pointer;margin:0;";
        nodesChk.addEventListener("change", e => {
          styleObj.showNodes = e.target.checked;
          onChange();
        });
        nodesLabel.appendChild(nodesChk);
        nodesLabel.appendChild(document.createTextNode(" Nodes"));

        topRow.appendChild(titleSpan);
        topRow.appendChild(nodesLabel);

        // Controls line: Color picker, Dash select, Width select
        const controlsRow = document.createElement("div");
        controlsRow.style.cssText = "display:flex;align-items:center;gap:5px;flex-wrap:wrap;";

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = styleObj.color;
        colorInput.className = "color-picker-swatch";
        colorInput.title = `Color de línea para ${title}`;
        colorInput.addEventListener("input", e => {
          styleObj.color = e.target.value;
          const str = titleSpan.querySelector("strong");
          if (str) str.style.color = e.target.value;
          const dot = titleSpan.querySelector("span");
          if (dot) {
            dot.style.background = e.target.value;
            dot.style.boxShadow = `0 0 4px ${e.target.value}`;
          }
          onChange();
        });

        const dashSelect = document.createElement("select");
        dashSelect.className = "style-select";
        dashSelect.title = `Estilo de línea para ${title}`;
        [
          { val: "solid", label: "Solid ──" },
          { val: "dashed", label: "Dashed ─ ─" },
          { val: "dotted", label: "Dotted · · ·" }
        ].forEach(optData => {
          const opt = document.createElement("option");
          opt.value = optData.val;
          opt.textContent = optData.label;
          if (styleObj.dash === optData.val) opt.selected = true;
          dashSelect.appendChild(opt);
        });
        dashSelect.addEventListener("change", e => {
          styleObj.dash = e.target.value;
          onChange();
        });

        const widthSelect = document.createElement("select");
        widthSelect.className = "style-select width-select";
        widthSelect.title = `Grosor de línea para ${title}`;
        [
          { val: 1, label: "1px" },
          { val: 2, label: "2px" },
          { val: 3, label: "3px" },
          { val: 3.5, label: "3.5px" },
          { val: 4, label: "4px" },
          { val: 5, label: "5px" }
        ].forEach(wData => {
          const opt = document.createElement("option");
          opt.value = wData.val;
          opt.textContent = wData.label;
          if (Number(styleObj.width) === wData.val) opt.selected = true;
          widthSelect.appendChild(opt);
        });
        widthSelect.addEventListener("change", e => {
          styleObj.width = parseFloat(e.target.value) || 3.5;
          onChange();
        });

        controlsRow.appendChild(colorInput);
        controlsRow.appendChild(dashSelect);
        controlsRow.appendChild(widthSelect);

        card.appendChild(topRow);
        card.appendChild(controlsRow);
        container.appendChild(card);
      }

      if (unassignedCount > 0 || sectionNames.length === 0) {
        if (!state.defaultPolyStyle) {
          state.defaultPolyStyle = { color: "#0066ff", dash: "solid", width: 3.5, showNodes: false };
        }
        createSectionCard("🌐 Sin Sección / General", unassignedCount || nSegs, state.defaultPolyStyle, () => {
          redrawTrueCanvas();
          rebuildSegmentInputs();
        });
      }

      sectionNames.forEach(secName => {
        const secStyle = getSectionStyle(secName);
        createSectionCard(`🏷️ ${secName}`, sectionCounts[secName], secStyle, () => {
          if (!state.sectionStyles) state.sectionStyles = {};
          state.sectionStyles[secName.toLowerCase()] = secStyle;
          if (state.userPolygon) state.userPolygon.sectionStyles = state.sectionStyles;
          redrawTrueCanvas();
          rebuildSegmentInputs();
        });
      });
    }

    /** Draw the user polygon on the true-field canvas */
    function drawUserPolygon(ctx, vp, canvasH) {
      const poly = state.userPolygon;
      if (!poly.show) return;
      const verts = poly.vertices;
      if (verts.length === 0) return;

      ctx.save();
      ctx.globalAlpha = 1;

      // 1. Polygon interior fill (when closed)
      if (poly.closed && verts.length >= 3) {
        const fillCol = poly.fillColor || "#00e5ff";
        const fillOp = poly.fillOpacity != null ? poly.fillOpacity : 0.08;
        if (fillOp > 0) {
          ctx.beginPath();
          const s0 = worldToScreenGIS(verts[0], vp, canvasH);
          ctx.moveTo(s0.x, s0.y);
          for (let i = 1; i < verts.length; i++) {
            const s = worldToScreenGIS(verts[i], vp, canvasH);
            ctx.lineTo(s.x, s.y);
          }
          ctx.closePath();
          ctx.save();
          ctx.globalAlpha = fillOp;
          ctx.fillStyle = fillCol;
          ctx.fill();
          ctx.restore();
        }
      }

      // 2. Individual segment strokes color-coded or styled by user preferences
      const nSegs = poly.closed ? verts.length : verts.length - 1;
      for (let i = 0; i < nSegs; i++) {
        const a = verts[i], b = verts[(i + 1) % verts.length];
        const measLen = Math.hypot(b.x - a.x, b.y - a.y);
        const deedLen = poly.segmentLengths[i];
        const hasDeedLen = deedLen != null && deedLen > 0;
        const meta = getSegmentErrorMeta(measLen, deedLen);

        // Stroke styled strictly by its Sección
        const secName = poly.segmentSections ? poly.segmentSections[i] : null;
        const secStyle = getSectionStyle(secName);

        const strokeCol = secStyle.color;
        const lineW = secStyle.width;
        const dash = secStyle.dash === "dashed" ? [6, 4] : (secStyle.dash === "dotted" ? [2, 3] : []);

        const sa = worldToScreenGIS(a, vp, canvasH);
        const sb = worldToScreenGIS(b, vp, canvasH);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = lineW;
        ctx.lineCap = "round";
        if (dash.length > 0) ctx.setLineDash(dash);
        else ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();
      }

      // 2.3. IGAC Corridor Ribbons (Thickness Buffers around raw deed segments with distance data)
      const is1073 = (!state.activeDeed || state.activeDeed === "1073");
      if (is1073 && (state.showCorridor104 || state.showCorridor520) && poly && poly.segmentLengths) {
        ctx.save();
        ctx.globalAlpha = (state.corridorOpacity !== undefined ? state.corridorOpacity : 0.5);
        let warper = null;
        const activeAnchors = getActiveAnchors();
        if (activeAnchors.length >= 2) {
          try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
        }
        const drawCorridorRibbon = (radiusM, fillColor, strokeColor, dash) => {
          const rPx = radiusM * vp.scale;
          if (rPx < 0.5) return;

          // 1. Draw rounded capsule ribbon fill along deed segments
          ctx.beginPath();
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = rPx * 2;
          ctx.strokeStyle = fillColor;

          for (let i = 0; i < nSegs; i++) {
            if (poly.segmentOptimize && !poly.segmentOptimize[i]) continue;
            if (poly.segmentLengths[i] == null || poly.segmentLengths[i] <= 0) continue;
            const a = verts[i], b = verts[(i + 1) % verts.length];
            const a0 = (a.origX != null && a.origY != null) ? { x: a.origX, y: a.origY } : (a.deedPt && warper ? warper(a.deedPt) : { x: a.x, y: a.y });
            const b0 = (b.origX != null && b.origY != null) ? { x: b.origX, y: b.origY } : (b.deedPt && warper ? warper(b.deedPt) : { x: b.x, y: b.y });
            const sa = worldToScreenGIS(a0, vp, canvasH);
            const sb = worldToScreenGIS(b0, vp, canvasH);
            ctx.moveTo(sa.x, sa.y);
            ctx.lineTo(sb.x, sb.y);
          }
          ctx.stroke();

          // 2. Draw contour outline borders for the ribbon
          if (strokeColor && rPx >= 2) {
            ctx.beginPath();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = strokeColor;
            if (dash) ctx.setLineDash(dash);
            else ctx.setLineDash([]);

            for (let i = 0; i < nSegs; i++) {
              if (poly.segmentOptimize && !poly.segmentOptimize[i]) continue;
              if (poly.segmentLengths[i] == null || poly.segmentLengths[i] <= 0) continue;
              const a = verts[i], b = verts[(i + 1) % verts.length];
              const a0 = (a.origX != null && a.origY != null) ? { x: a.origX, y: a.origY } : (a.deedPt && warper ? warper(a.deedPt) : { x: a.x, y: a.y });
              const b0 = (b.origX != null && b.origY != null) ? { x: b.origX, y: b.origY } : (b.deedPt && warper ? warper(b.deedPt) : { x: b.x, y: b.y });
              const sa = worldToScreenGIS(a0, vp, canvasH);
              const sb = worldToScreenGIS(b0, vp, canvasH);
              const dx = sb.x - sa.x, dy = sb.y - sa.y;
              const len = Math.hypot(dx, dy);
              if (len < 1e-3) continue;
              const nx = -dy / len * rPx, ny = dx / len * rPx;

              ctx.moveTo(sa.x + nx, sa.y + ny);
              ctx.lineTo(sb.x + nx, sb.y + ny);
              ctx.moveTo(sa.x - nx, sa.y - ny);
              ctx.lineTo(sb.x - nx, sb.y - ny);
              ctx.arc(sb.x, sb.y, rPx, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
              ctx.arc(sa.x, sa.y, rPx, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
        };

        if (state.showCorridor520) {
          drawCorridorRibbon(5.20, "rgba(0, 230, 118, 0.22)", "rgba(0, 230, 118, 0.90)", [3, 4]);
        }
        if (state.showCorridor104) {
          drawCorridorRibbon(1.04, "rgba(0, 229, 255, 0.35)", "rgba(0, 229, 255, 0.95)", [5, 4]);
        }
        ctx.restore();
      }

      // 2.5. Buffer halos and displacement vectors around DEED DXF vertices for segments with deed lengths!
      if (is1073 && (state.constrainPolyToDeed || state.showBufferDisks) && state.optBufferRadius > 0 && poly && poly.vertices) {
        ctx.save();
        let warper = null;
        const activeAnchors = getActiveAnchors();
        if (activeAnchors.length >= 2) {
          try { warper = TransformMath.createWarper(state.algorithm, activeAnchors); } catch (_) {}
        }
        const rPx = state.optBufferRadius * vp.scale;
        const drawnDeedBuffers = new Set();

        verts.forEach((v, idx) => {
          // Strictly only for deed-anchored vertices part of the active simulation
          if (!vertexIsDeedConstrained(poly, idx)) return;
          if (!v.deedPt) return;

          const w = warper ? warper(v.deedPt) : { x: v.deedPt.x, y: v.deedPt.y };
          const deedCenter = { x: w.x, y: w.y, deedPt: v.deedPt };
          v.origX = w.x;
          v.origY = w.y;

          // If no deed vertex is associated with this polygon vertex, DO NOT draw buffer around polygon vertex!
          if (!deedCenter) return;

          // If this vertex corresponds to a fixed anchor, lock vertex strictly to deed center (0 buffer)
          if (isVertexFixedAnchor(poly, idx)) {
            v.x = deedCenter.x;
            v.y = deedCenter.y;
            const sOrig = worldToScreenGIS(deedCenter, vp, canvasH);
            const key = `${Math.round(deedCenter.x * 100)}_${Math.round(deedCenter.y * 100)}`;
            if (!drawnDeedBuffers.has(key)) {
              drawnDeedBuffers.add(key);
              // Draw locked fixed pin indicator (solid pin dot, no buffer halo)
              ctx.beginPath();
              ctx.arc(sOrig.x, sOrig.y, 4, 0, Math.PI * 2);
              ctx.fillStyle = "#78909c";
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
            return;
          }

          const sOrig = worldToScreenGIS(deedCenter, vp, canvasH);
          const key = `${Math.round(deedCenter.x * 100)}_${Math.round(deedCenter.y * 100)}`;

          if (!drawnDeedBuffers.has(key)) {
            drawnDeedBuffers.add(key);

            // Buffer halo circle centered directly ON THE DEED VERTEX
            ctx.beginPath();
            ctx.arc(sOrig.x, sOrig.y, rPx, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 229, 255, 0.08)";
            ctx.fill();
            ctx.strokeStyle = "rgba(0, 229, 255, 0.65)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Nominal deed center marker (crosshair / dot directly on Deed.dxf vertex)
            ctx.beginPath();
            ctx.arc(sOrig.x, sOrig.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#00e5ff";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Displacement vector if polygon vertex shifted from deed vertex > 0.05m
          const disp = Math.hypot(v.x - deedCenter.x, v.y - deedCenter.y);
          if (disp > 0.05) {
            const sCurr = worldToScreenGIS(v, vp, canvasH);
            ctx.beginPath();
            ctx.moveTo(sOrig.x, sOrig.y);
            ctx.lineTo(sCurr.x, sCurr.y);
            ctx.strokeStyle = "#ffd600";
            ctx.lineWidth = 2.0;
            ctx.stroke();

            // Arrow head pointing from Deed vertex toward current Polygon vertex
            const angle = Math.atan2(sCurr.y - sOrig.y, sCurr.x - sOrig.x);
            const arrowSize = 6;
            ctx.beginPath();
            ctx.moveTo(sCurr.x, sCurr.y);
            ctx.lineTo(sCurr.x - arrowSize * Math.cos(angle - Math.PI / 6), sCurr.y - arrowSize * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(sCurr.x - arrowSize * Math.cos(angle + Math.PI / 6), sCurr.y - arrowSize * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fillStyle = "#ffd600";
            ctx.fill();
          }
        });
        ctx.restore();
      }

      // 3. Vertex dots (filtered by section showNodes preference, always visible on hover/drag)
      verts.forEach((v, i) => {
        const isHovered = (state.hoverPolyNode === i);
        const isDragging = (state.draggingUserPolyNode === i);

        const secNext = poly.segmentSections ? poly.segmentSections[i] : null;
        const secPrev = poly.segmentSections ? poly.segmentSections[(i - 1 + nSegs) % nSegs] : null;
        const styleNext = getSectionStyle(secNext);
        const stylePrev = getSectionStyle(secPrev);
        const shouldShowNode = styleNext.showNodes || stylePrev.showNodes;

        if (!isHovered && !isDragging && !shouldShowNode) return;

        const sp = worldToScreenGIS(v, vp, canvasH);
        const origX = v.origX != null ? v.origX : v.x;
        const origY = v.origY != null ? v.origY : v.y;
        const isShifted = vertexIsDeedConstrained(poly, i) && Math.hypot(v.x - origX, v.y - origY) > 0.05;

        const nodeColor = styleNext.color || stylePrev.color || "#00e5ff";
        const baseR = Math.max(styleNext.width, stylePrev.width) + 1.5;
        const r = (isHovered || isDragging) ? (baseR + 3) : (i === 0 ? (baseR + 2) : (isShifted ? (baseR + 1) : baseR));

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? "#00e5ff" : nodeColor;
        ctx.fill();
        ctx.strokeStyle = (isHovered || isDragging) ? "#ffffff" : (i === 0 ? "#ffffff" : (isShifted ? "#ffd600" : "#ffffff"));
        ctx.lineWidth = (isHovered || isDragging || i === 0 || isShifted) ? 2.5 : 1.5;
        ctx.stroke();

        if (isHovered && !isDragging) {
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 229, 255, 0.65)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // 3.5. Subtle dot on segment hover indicating double-click target
      if (state.hoverPolySegment && !poly.drawMode && state.draggingUserPolyNode === null) {
        const hp = state.hoverPolySegment.screenPt;
        ctx.save();
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#00e5ff";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Segment length labels with error percentage (when Labels checkbox is active)
      state.userPolyLabelBoxes = [];
      if (state.showSegmentLabels) {
        for (let i = 0; i < nSegs; i++) {
          const a = verts[i], b = verts[(i + 1) % verts.length];
          const mid = worldToScreenGIS({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, vp, canvasH);
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const deedLen = poly.segmentLengths[i];
          const meta = getSegmentErrorMeta(len, deedLen);

          const sec = (poly.segmentSections && poly.segmentSections[i]) || "";
          const part = (poly.segmentParts && poly.segmentParts[i]) || "";
          let segDisplayName = "";
          if (sec && part) segDisplayName = `${sec} ${part}`;
          else if (sec) segDisplayName = sec;
          else if (part) segDisplayName = `Part ${part}`;
          else segDisplayName = `Seg ${i + 1}`;

          const isDeed = (a.deedPt !== null && b.deedPt !== null);
          const secColor = sec ? getSectionColor(sec) : null;
          const label = meta.errPct != null
            ? `${segDisplayName}: ${len.toFixed(1)}m / ${Number(deedLen).toFixed(1)}m (${meta.errPct.toFixed(1)}%)`
            : `${segDisplayName}: ${len.toFixed(1)}m`;

          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          const tw = ctx.measureText(label).width;
          const bw = tw + 10, bh = 16;
          const boxX = mid.x - bw / 2;
          const boxY = mid.y - 10.5;
          const radius = 3.5;

          // Save bounding box for mouse hover detection and tooltip
          state.userPolyLabelBoxes.push({
            segIndex: i,
            segDisplayName,
            box: { x: boxX, y: boxY, w: bw, h: bh },
            len,
            deedLen,
            errPct: meta.errPct,
            secColor,
            metaColor: meta.color
          });

          const boxBorderCol = secColor || (isDeed ? state.stylePolyDeed.color : meta.color);

          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(boxX, boxY, bw, bh, radius);
          } else {
            ctx.moveTo(boxX + radius, boxY);
            ctx.arcTo(boxX + bw, boxY, boxX + bw, boxY + bh, radius);
            ctx.arcTo(boxX + bw, boxY + bh, boxX, boxY + bh, radius);
            ctx.arcTo(boxX, boxY + bh, boxX, boxY, radius);
            ctx.arcTo(boxX, boxY, boxX + bw, boxY, radius);
            ctx.closePath();
          }

          // White background with subtle curvature
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = boxBorderCol;
          ctx.lineWidth = secColor ? 1.8 : 1.3;
          ctx.stroke();

          // Dark sharp text on white background
          ctx.fillStyle = "#0f172a";
          ctx.fillText(label, mid.x, mid.y + 2);
        }
      }

      // Real-time Metrics HUD Card pinned to top-left of the field frame (when polygon is closed)
      if (poly.closed && verts.length >= 3) {
        let areaM2 = 0;
        for (let i = 0; i < verts.length; i++) {
          const j = (i + 1) % verts.length;
          areaM2 += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
        }
        areaM2 = Math.abs(areaM2) / 2;
        const REF_AREA = 162156.0;
        const areaErrPct = (Math.abs(areaM2 - REF_AREA) / REF_AREA) * 100;

        // Compute segment lengths stats for segments in 1073 (assigned deed lengths)
        let sumDeedLen = 0, sumFieldLen = 0, countDeedSegs = 0, segErrSum = 0;
        for (let i = 0; i < nSegs; i++) {
          const a = verts[i], b = verts[(i + 1) % verts.length];
          const deedLen = poly.segmentLengths ? poly.segmentLengths[i] : null;
          const isOpt = poly.segmentOptimize ? (poly.segmentOptimize[i] === true) : (a.deedPt !== null && b.deedPt !== null);
          if (deedLen != null && deedLen > 0 && isOpt) {
            const mLen = Math.hypot(b.x - a.x, b.y - a.y);
            sumDeedLen += deedLen;
            sumFieldLen += mLen;
            segErrSum += (Math.abs(mLen - deedLen) / deedLen) * 100;
            countDeedSegs++;
          }
        }
        const avgDeedLen = countDeedSegs > 0 ? (sumDeedLen / countDeedSegs) : 0;
        const avgFieldLen = countDeedSegs > 0 ? (sumFieldLen / countDeedSegs) : 0;
        const avgSegErrPct = countDeedSegs > 0 ? (segErrSum / countDeedSegs) : 0;

        // Overall simulation error
        const simAvgError = countDeedSegs > 0 ? (areaErrPct + avgSegErrPct) / 2 : areaErrPct;

        const boxX = 14;
        const boxY = 14;
        const bw = 276;
        const bh = 80;

        ctx.save();
        // Background card with blur and subtle glow
        ctx.fillStyle = "rgba(8, 14, 26, 0.92)";
        ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
        ctx.lineWidth = 1.4;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(boxX, boxY, bw, bh, 7);
        } else {
          ctx.rect(boxX, boxY, bw, bh);
        }
        ctx.fill();
        ctx.stroke();

        // Column X coordinates (compact layout with tight margins)
        const colLabelX = boxX + 8;
        const colDeedX = boxX + 154;
        const colFieldX = boxX + 220;
        const colErrX = boxX + bw - 8;

        // 1. Column Headers
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("En Escritura", colDeedX, boxY + 14);
        ctx.fillText("En Campo", colFieldX, boxY + 14);
        ctx.fillText("Error", colErrX, boxY + 14);

        // Divider under headers
        ctx.beginPath();
        ctx.moveTo(boxX + 6, boxY + 18);
        ctx.lineTo(boxX + bw - 6, boxY + 18);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Helper for error color
        function getErrColor(err) {
          if (err <= 0.05) return "#00e676";
          if (err <= 1.0) return "#ffd600";
          return "#ff5252";
        }

        // 2. Row 1: Área in 296
        const yRow1 = boxY + 31;
        ctx.textAlign = "left";
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 9.5px sans-serif";
        ctx.fillText("Área in 296", colLabelX, yRow1);

        ctx.textAlign = "right";
        ctx.font = "9.5px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("162,156 m²", colDeedX, yRow1);

        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`${Math.round(areaM2).toLocaleString('en-US')} m²`, colFieldX, yRow1);

        ctx.fillStyle = getErrColor(areaErrPct);
        ctx.font = "bold 9.5px monospace";
        ctx.fillText(`${areaErrPct.toFixed(2)}%`, colErrX, yRow1);

        // 3. Row 2: Tramo x̄ in 1073
        const yRow2 = boxY + 47;
        ctx.textAlign = "left";
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 9.5px sans-serif";
        ctx.fillText("Tramo x̄ in 1073", colLabelX, yRow2);

        ctx.textAlign = "right";
        ctx.font = "9.5px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`${avgDeedLen.toFixed(1)} m`, colDeedX, yRow2);

        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`${avgFieldLen.toFixed(1)} m`, colFieldX, yRow2);

        ctx.fillStyle = getErrColor(avgSegErrPct);
        ctx.font = "bold 9.5px monospace";
        ctx.fillText(`${avgSegErrPct.toFixed(2)}%`, colErrX, yRow2);

        // 4. Row 3: Bottom Highlight Pill — Error x̄ simulación
        const pillY = boxY + 54;
        const pillH = 20;
        ctx.fillStyle = "rgba(0, 229, 255, 0.08)";
        ctx.strokeStyle = "rgba(0, 229, 255, 0.28)";
        ctx.lineWidth = 1;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(boxX + 5, pillY, bw - 10, pillH, 4);
        } else {
          ctx.rect(boxX + 5, pillY, bw - 10, pillH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText("⚡ Error x̄ simulación:", boxX + 10, pillY + 13.5);

        const simErrColor = getErrColor(simAvgError);
        ctx.textAlign = "right";
        ctx.font = "bold 10.5px monospace";
        ctx.fillStyle = simErrColor;
        ctx.fillText(`${simAvgError.toFixed(2)}%`, boxX + bw - 10, pillY + 14);

        ctx.restore();
      }

      ctx.textAlign = "left";
      ctx.restore();
    }

    /* ═══════════════════════════════════════════════════════════════════════
       AUTONOMOUS CUSTOM FIELD MULTI-POLYGON LOGIC & RENDERING
       ═══════════════════════════════════════════════════════════════════════ */

    // [/SECTION: JS_POLYGON_DISTANCE_AREA]
