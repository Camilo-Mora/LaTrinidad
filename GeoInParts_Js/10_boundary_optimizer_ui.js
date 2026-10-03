
    // ============================================================================
    // [SECTION: JS_BOUNDARY_OPTIMIZER_UI] (DORMANT / PARKED)
    // ============================================================================
    const chkOptAll = document.getElementById("chk-opt-all");
    const chkOptGenetic = document.getElementById("chk-opt-genetic");
    const lblOptAll = document.getElementById("lbl-opt-all");
    const lblOptGenetic = document.getElementById("lbl-opt-genetic");

    function setSearchStrategy(isAll) {
      if (chkOptAll) chkOptAll.checked = isAll;
      if (chkOptGenetic) chkOptGenetic.checked = !isAll;
      if (lblOptAll) lblOptAll.style.color = isAll ? "#ffb300" : "var(--text-muted)";
      if (lblOptGenetic) lblOptGenetic.style.color = isAll ? "var(--text-muted)" : "var(--accent-cyan)";
      updateStatus(`Auto-Tune search set to: ${isAll ? "All Combinations (exhaustive grid search)" : "Genetic Algorithm (Differential Evolution)"}.`);
    }

    if (chkOptAll) {
      chkOptAll.addEventListener("change", () => setSearchStrategy(true));
    }
    if (chkOptGenetic) {
      chkOptGenetic.addEventListener("change", () => setSearchStrategy(false));
    }

    if (btnRunOpt) {
      btnRunOpt.addEventListener("click", () => {
        if (state.tuningAnchorsActive) {
          alert("Auto-Tune is currently running. Please stop or wait for it to complete.");
          return;
        }
        const poly = state.userPolygon;
        if (!poly || !poly.vertices || poly.vertices.length < 3) {
          alert("Polygon requires ≥ 3 vertices to optimize.");
          return;
        }

        // Ensure each vertex has baseline origX, origY
        poly.vertices.forEach(v => {
          if (v.origX === undefined || v.origX === null) v.origX = v.x;
          if (v.origY === undefined || v.origY === null) v.origY = v.y;
        });

        if (optStatusBadge) {
          optStatusBadge.textContent = "Optimizing…";
          optStatusBadge.style.color = "var(--accent-cyan)";
        }

        setTimeout(() => {
          const fixedIndices = getFixedVertexIndices(poly.vertices);
          const result = BoundaryOptimizer.optimize({
            vertices: poly.vertices,
            segmentLengths: poly.segmentLengths,
            segmentOptimize: poly.segmentOptimize,
            bufferRadius: state.optBufferRadius,
            balance: state.optBalance,
            targetArea: 162156.0,
            iterations: 240,
            fixedIndices
          });

          if (!result.success) {
            if (optStatusBadge) {
              optStatusBadge.textContent = "Notice";
              optStatusBadge.style.color = "var(--accent-orange)";
            }
            alert(`Optimization notice: ${result.reason || "Unable to optimize."}`);
            return;
          }

          // Apply optimized vertices
          poly.vertices = result.vertices;
          recomputeUserPolygonMetrics();
          rebuildSegmentInputs();
          redrawTrueCanvas();

          if (optStatusBadge) {
            optStatusBadge.textContent = `✓ Fitted (Max: ${result.maxDisplacement.toFixed(2)}m)`;
            optStatusBadge.style.background = "rgba(0, 230, 118, 0.22)";
            optStatusBadge.style.color = "#00e676";
          }

          updateStatus(`⚡ Boundary optimized: max vertex shift = ${result.maxDisplacement.toFixed(2)}m within ±${state.optBufferRadius.toFixed(1)}m pen buffer.`);
        }, 15);
      });
    }

    if (btnResetOpt) {
      btnResetOpt.addEventListener("click", () => {
        if (state.tuningAnchorsActive) return;
        const poly = state.userPolygon;
        if (!poly || !poly.vertices) return;
        let count = 0;
        poly.vertices.forEach((v, idx) => {
          if (v.deedPt && v.origX !== undefined && v.origX !== null && vertexIsDeedConstrained(poly, idx)) {
            v.x = v.origX;
            v.y = v.origY;
            count++;
          }
        });
        recomputeUserPolygonMetrics();
        rebuildSegmentInputs();
        redrawTrueCanvas();

        if (optStatusBadge) {
          optStatusBadge.textContent = "Reset to deed";
          optStatusBadge.style.background = "rgba(255, 255, 255, 0.08)";
          optStatusBadge.style.color = "var(--text-muted)";
        }
        updateStatus(`↺ Reset ${count} dynamic vertices back to unadjusted deed centers.`);
      });
    }

    // ── Auto-Tune Anchors (Global Heuristic Optimizer) ─────────────────
    const btnAutoTune = document.getElementById("btn-autotune-anchors");

    async function runAutoTuneAnchors() {
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length < 2) {
        alert("Auto-Tune requires ≥ 2 active anchor pairs.");
        return;
      }
      const poly = state.userPolygon;
      if (!poly || !poly.vertices || poly.vertices.length < 3) {
        alert("Polygon requires ≥ 3 vertices to auto-tune.");
        return;
      }
      const hasDeedNodes = poly.vertices.some(v => v.deedPt != null);
      if (!hasDeedNodes) {
        alert("Polygon vertices must be anchored to Deed DXF vertices to auto-tune.");
        return;
      }

      const M = state.anchors.length;
      const chkAutoMin = document.getElementById("chk-auto-min-buffer");
      const isAutoMin = chkAutoMin ? chkAutoMin.checked : false;

      const chkOptAlongAxis = document.getElementById("chk-opt-along-axis");
      const useAxisOnly = chkOptAlongAxis ? chkOptAlongAxis.checked : (state.optAlongAxisOnly || false);

      const chkOptCdsOnly = document.getElementById("chk-opt-casa-del-sol-only");
      const useCdsOnly = chkOptCdsOnly ? chkOptCdsOnly.checked : (state.optCasaDelSolOnly || false);

      const chkOptIgacFilter = document.getElementById("chk-opt-igac-filter");
      const isFilterIgac = chkOptIgacFilter ? chkOptIgacFilter.checked : true;

      const optimizableAnchors = state.anchors.filter(anc => anc.active !== false && anc.enabled !== false && anc.optimize === true);
      const isAllAnchorsFixed = optimizableAnchors.length === 0;

      if (useCdsOnly) {
        const activeCdsPolys = (state.customPolygons || []).filter(cp => cp.optArea !== false && cp.targetArea > 0 && cp.closed && cp.vertices && cp.vertices.length >= 3);
        if (activeCdsPolys.length === 0) {
          alert("Optimize for Casa del Sol Area is enabled, but no custom polygons with a Target Area are active.\n\nPlease define/enable Casa del Sol parcels with target areas or untick 'Optimize Casa del Sol Area Only'.");
          return;
        }
      }

      // If in 1D Axis Mode, perform a single sweep across the entire length [0.0, 1.0] of each axis.
      // Otherwise, if Auto-Detect Min Buffer is ticked, sweep from 0.1m up to 3.0m in increments of 0.1m.
      const rSweepList = useAxisOnly
        ? [state.optBufferRadius > 0 ? state.optBufferRadius : 3.0]
        : (isAutoMin
            ? Array.from({ length: 30 }, (_, i) => +(0.1 * (i + 1)).toFixed(1))
            : [state.optBufferRadius > 0 ? state.optBufferRadius : 3.0]);

      // Identify buffer centers for each anchor:
      // If "Constrain to Vertices / Markers" is ticked, start/center from the snapped vertex or temporary marker.
      // If unticked, start/center from the exact point where the anchor is currently located.
      const baseR = Math.max(state.optBufferRadius > 0 ? state.optBufferRadius : 3.0, 3.0);
      const anchorCenters = state.anchors.map(anc => {
        if (state.constrainAnchorsToField) {
          const nearestField = findNearestFieldVertex(anc.dst);
          if (nearestField && nearestField.dist <= baseR * 2.5) {
            return { x: nearestField.x, y: nearestField.y, isMarker: !!nearestField.isMarker, label: nearestField.label };
          }
        }
        return { x: anc.dst.x, y: anc.dst.y };
      });

      // UI state setup
      state.tuningAnchorsActive = true;
      state.tuningCancelRequested = false;
      state.tuningAnchorCenters = anchorCenters;

      if (btnAutoTune) {
        btnAutoTune.innerHTML = "⏹ Stop Auto-Tune";
        btnAutoTune.style.background = "linear-gradient(135deg, #ff1744, #ff9100)";
        btnAutoTune.style.boxShadow = "0 0 14px rgba(255, 23, 68, 0.45)";
      }
      if (btnRunOpt) btnRunOpt.disabled = true;
      if (btnResetOpt) btnResetOpt.disabled = true;

      const POP_SIZE = isAllAnchorsFixed ? 2 : 16;
      const MAX_GEN = isAllAnchorsFixed ? 1 : (isAutoMin ? 10 : 22);

      function sampleCandidateOffset(ancIdx) {
        const anc = state.anchors[ancIdx];
        if (!anc) return { u: 0, v: 0, t: 0.5 };
        if (anc.optimize !== true) {
          if (anc.axisId != null) {
            return { isFloating: true, t: anc.axisT ?? 0.5, u: 0, v: 0 };
          }
          return { isFixed: true, u: 0, v: 0, t: 0.5 };
        }
        if (anc.axisId != null && (state.testAxes || []).some(a => a.id === anc.axisId)) {
          return { t: Math.random(), u: 0, v: 0 };
        }
        const theta = Math.random() * 2 * Math.PI;
        const rad = Math.sqrt(Math.random());
        return { u: rad * Math.cos(theta), v: rad * Math.sin(theta), t: 0.5 };
      }

      function sampleDisk() {
        return sampleCandidateOffset(0);
      }

      const chkOptAll = document.getElementById("chk-opt-all");
      const useAllCombos = chkOptAll ? chkOptAll.checked : false;

      function cartesianProduct(sets) {
        let result = [[]];
        for (const set of sets) {
          const temp = [];
          for (const prefix of result) {
            for (const item of set) {
              temp.push([...prefix, item]);
            }
          }
          result = temp;
        }
        return result;
      }

      function getGridOffsetsForM(numAnchors) {
        if (numAnchors <= 2) {
          // 17 ordered points: Center (0,0), then inner ring r=0.50 (8 pts), then outer ring r=0.92 (8 pts)
          const pts = [{ u: 0, v: 0, t: 0.5 }];
          const r1 = 0.50;
          const r2 = 0.92;
          for (let k = 0; k < 8; k++) {
            const th = (k * Math.PI) / 4;
            pts.push({ u: +(r1 * Math.cos(th)).toFixed(4), v: +(r1 * Math.sin(th)).toFixed(4), t: 0.5 });
          }
          for (let k = 0; k < 8; k++) {
            const th = (k * Math.PI) / 4;
            pts.push({ u: +(r2 * Math.cos(th)).toFixed(4), v: +(r2 * Math.sin(th)).toFixed(4), t: 0.5 });
          }
          return pts;
        } else if (numAnchors === 3) {
          return [
            { u: 0, v: 0, t: 0.5 },
            { u: 0.80, v: 0, t: 0.5 }, { u: -0.80, v: 0, t: 0.5 },
            { u: 0.40, v: 0.69, t: 0.5 }, { u: -0.40, v: 0.69, t: 0.5 },
            { u: 0.40, v: -0.69, t: 0.5 }, { u: -0.40, v: -0.69, t: 0.5 }
          ];
        } else {
          return [
            { u: 0, v: 0, t: 0.5 },
            { u: 0.80, v: 0, t: 0.5 }, { u: -0.80, v: 0, t: 0.5 },
            { u: 0, v: 0.80, t: 0.5 }, { u: 0, v: -0.80, t: 0.5 }
          ];
        }
      }

      let globalOverallBest = null;
      let winningR = rSweepList[0];
      let prevStepLoss = Infinity;

      for (let rIdx = 0; rIdx < rSweepList.length; rIdx++) {
        if (!state.tuningAnchorsActive || state.tuningCancelRequested) break;

        const currentR = rSweepList[rIdx];
        state.optBufferRadius = currentR;

        // Update slider and label visually
        if (optBufferSlider) optBufferSlider.value = currentR;
        if (optBufferVal) optBufferVal.textContent = `±${currentR.toFixed(1)} m`;

        // Current normalized offsets inside unit disk or full-axis parameter t
        const currentOffsets = state.anchors.map((anc, idx) => {
          if (anc.axisId != null) {
            const ax = (state.testAxes || []).find(a => a.id === anc.axisId);
            if (ax) {
              let t = anc.axisT;
              if (typeof t !== "number") {
                const pr = projectPointOnAxis(anc.dst, ax);
                t = pr.t;
              }
              t = Math.max(0.0, Math.min(1.0, t));
              return { t, u: 0, v: 0, isFloating: (anc.optimize !== true) };
            }
          }
          if (anc.optimize !== true) {
            return { u: 0, v: 0, t: 0.5, isFixed: true };
          }
          const center = anchorCenters[idx];
          let du = (anc.dst.x - center.x) / currentR;
          let dv = (anc.dst.y - center.y) / currentR;
          const d = Math.hypot(du, dv);
          if (d > 1) { du /= d; dv /= d; }
          return { u: du, v: dv, t: 0.5 };
        });

        // Candidate fitness evaluation function for currentR
        function evaluateCandidate(offsets) {
          try {
            const candAnchors = state.anchors.map((anc, idx) => {
              const off = offsets[idx] || {};
              // 1. If anchor is on an axis:
              if (anc.axisId != null) {
                const ax = (state.testAxes || []).find(a => a.id === anc.axisId);
                if (ax) {
                  if (anc.optimize === true) {
                    let t = off.t !== undefined ? off.t : (off.u !== undefined ? (off.u + 1) / 2 : 0.5);
                    t = Math.max(0.0, Math.min(1.0, t));
                    return {
                      ...anc,
                      axisT: t,
                      dst: {
                        x: ax.p1.x + t * (ax.p2.x - ax.p1.x),
                        y: ax.p1.y + t * (ax.p2.y - ax.p1.y)
                      }
                    };
                  }
                  // Otherwise: Floating Guide (relaxed below)
                  return { ...anc, isFloatingGuide: true };
                }
              }
              // 2. Normal anchor with optimization enabled:
              if (anc.optimize === true) {
                const u = off.u || 0;
                const v = off.v || 0;
                return {
                  ...anc,
                  dst: {
                    x: anchorCenters[idx].x + u * currentR,
                    y: anchorCenters[idx].y + v * currentR
                  }
                };
              }
              // 3. Fixed anchor (0 DOF):
              return {
                ...anc,
                dst: { x: anc.dst.x, y: anc.dst.y }
              };
            });

            // Relax floating guide anchors to orthogonal projection of current candidate warper
            const hasFloating = candAnchors.some(a => a.isFloatingGuide);
            if (hasFloating) {
              const nonFloating = candAnchors.filter(a => !a.isFloatingGuide && a.active !== false && a.enabled !== false);
              let tempWarper = null;
              if (nonFloating.length >= 2) {
                try { tempWarper = TransformMath.createWarper(state.algorithm, nonFloating); } catch(_) {}
              }
              if (!tempWarper) {
                const allActive = candAnchors.filter(a => a.active !== false && a.enabled !== false);
                if (allActive.length >= 2) {
                  try { tempWarper = TransformMath.createWarper(state.algorithm, allActive); } catch(_) {}
                }
              }
              candAnchors.forEach((ca, ci) => {
                if (ca.isFloatingGuide) {
                  const ax = (state.testAxes || []).find(a => a.id === ca.axisId);
                  if (ax) {
                    let pNat = ca.dst;
                    if (tempWarper) {
                      try { pNat = tempWarper(ca.src); } catch(_) {}
                    }
                    const pr = projectPointOnAxis(pNat, ax);
                    const clampedT = Math.max(0.0, Math.min(1.0, pr.t));
                    candAnchors[ci] = {
                      ...ca,
                      axisT: clampedT,
                      dst: { x: pr.projPt.x, y: pr.projPt.y },
                      isFloatingGuide: false
                    };
                  }
                }
              });
            }

            const candWarper = TransformMath.createWarper(state.algorithm, candAnchors);

            const candVertices = poly.vertices.map(v => {
              if (v.deedPt) {
                const w = candWarper(v.deedPt);
                return { x: w.x, y: w.y, deedPt: v.deedPt, origX: w.x, origY: w.y };
              }
              return { x: v.x, y: v.y, deedPt: null, origX: v.origX ?? v.x, origY: v.origY ?? v.y };
            });

            const fixedIndices = getFixedVertexIndices(candVertices, candAnchors);
            const optRes = BoundaryOptimizer.optimize({
              vertices: candVertices,
              segmentLengths: poly.segmentLengths,
              segmentOptimize: poly.segmentOptimize,
              bufferRadius: currentR,
              balance: state.optBalance,
              targetArea: 162156.0,
              iterations: 120,
              fixedIndices
            });

            if (!optRes.success) {
              return { loss: 999999, optRes: null, candAnchors, offsets, areaDiffPct: 999, avgSegErr: 999, radius: currentR };
            }

            const V = optRes.vertices;
            let areaM2 = 0;
            for (let i = 0; i < V.length; i++) {
              const j = (i + 1) % V.length;
              areaM2 += V[i].x * V[j].y - V[j].x * V[i].y;
            }
            areaM2 = Math.abs(areaM2) / 2;
            const trinidadAreaDiffPct = (Math.abs(areaM2 - 162156.0) / 162156.0) * 100;

            // Multi-parcel area evaluation for Custom Polygons (e.g. Casa del Sol Lotes 5-8)
            let customAreaErrSum = 0;
            let countOptPolys = 0;
            const customPolys = state.customPolygons || [];
            for (let pIdx = 0; pIdx < customPolys.length; pIdx++) {
              const cp = customPolys[pIdx];
              if (cp.optArea !== false && cp.targetArea > 0 && cp.closed && cp.vertices && cp.vertices.length >= 3) {
                let cpArea = 0;
                const cpLen = cp.vertices.length;
                for (let k = 0; k < cpLen; k++) {
                  const m = (k + 1) % cpLen;
                  const vk = cp.vertices[k];
                  const vm = cp.vertices[m];
                  const ptk = (vk.anchor && vk.anchor.type === 'deed' && vk.anchor.deedPt) ? candWarper(vk.anchor.deedPt) : vk;
                  const ptm = (vm.anchor && vm.anchor.type === 'deed' && vm.anchor.deedPt) ? candWarper(vm.anchor.deedPt) : vm;
                  cpArea += ptk.x * ptm.y - ptm.x * ptk.y;
                }
                cpArea = Math.abs(cpArea) / 2;
                const pErr = (Math.abs(cpArea - cp.targetArea) / cp.targetArea) * 100;
                customAreaErrSum += pErr;
                countOptPolys++;
              }
            }

            const avgCdsErr = countOptPolys > 0 ? (customAreaErrSum / countOptPolys) : 0;
            const combinedAreaDiffPct = (countOptPolys > 0)
              ? (trinidadAreaDiffPct + customAreaErrSum) / (1 + countOptPolys)
              : trinidadAreaDiffPct;

            const nSegs = V.length;
            let segErrSum = 0, countSegs = 0;
            for (let i = 0; i < nSegs; i++) {
              const dLen = poly.segmentLengths[i];
              const isSelected = poly.segmentOptimize ? (poly.segmentOptimize[i] === true) : (candVertices[i].deedPt !== null && candVertices[(i + 1) % nSegs].deedPt !== null);
              if (isSelected && dLen != null && dLen > 0) {
                const mLen = Math.hypot(V[(i + 1) % nSegs].x - V[i].x, V[(i + 1) % nSegs].y - V[i].y);
                segErrSum += (Math.abs(mLen - dLen) / dLen) * 100;
                countSegs++;
              }
            }
            const avgSegErr = countSegs > 0 ? (segErrSum / countSegs) : 0;

            let compositeLoss, overallErr;
            if (useCdsOnly) {
              compositeLoss = avgCdsErr;
              overallErr = avgCdsErr;
            } else {
              const b = Math.max(0, Math.min(100, state.optBalance));
              const wDist = b <= 50 ? 1.0 : (100 - b) / 50;
              const wArea = b >= 50 ? 1.0 : b / 50;
              compositeLoss = (wDist * avgSegErr + wArea * combinedAreaDiffPct) / (wDist + wArea);
              overallErr = countSegs > 0 ? (avgSegErr + combinedAreaDiffPct) / 2 : combinedAreaDiffPct;
            }

            let pct104 = 0;
            if (optRes && optRes.vertices) {
              try {
                const evalPoly = {
                  vertices: optRes.vertices.map((v, idx) => ({
                    ...v,
                    origX: candVertices[idx]?.origX ?? v.origX ?? v.x,
                    origY: candVertices[idx]?.origY ?? v.origY ?? v.y,
                    deedPt: candVertices[idx]?.deedPt ?? v.deedPt
                  })),
                  closed: poly.closed,
                  segmentLengths: poly.segmentLengths,
                  segmentOptimize: poly.segmentOptimize
                };
                const igac = computeIgacCompliance(evalPoly);
                pct104 = igac ? (igac.pct104 || 0) : 0;
              } catch (_) {}
            }

            return {
              loss: compositeLoss,
              overallErr,
              pct104,
              optRes,
              candAnchors,
              areaDiffPct: useCdsOnly ? avgCdsErr : combinedAreaDiffPct,
              avgCdsErr,
              trinidadAreaDiffPct,
              avgSegErr,
              radius: currentR,
              offsets: offsets.map(o => ({ ...o }))
            };
          } catch (e) {
            return { loss: 999999, overallErr: 999, pct104: 0, optRes: null, candAnchors: null, offsets, areaDiffPct: 999, avgSegErr: 999, radius: currentR };
          }
        }

        // Comparison helper: determines if candidate A is strictly better than candidate B
        function isCandidateBetter(candA, candB) {
          if (!candA || candA.loss >= 99999) return false;
          if (!candB || candB.loss >= 99999) return true;

          if (isFilterIgac) {
            // Strict legal gate: both distance and area errors are virtually zero (<= 0.01%)
            const aInGate = (candA.avgSegErr <= 0.01 && candA.areaDiffPct <= 0.01) || (candA.overallErr <= 0.01);
            const bInGate = (candB.avgSegErr <= 0.01 && candB.areaDiffPct <= 0.01) || (candB.overallErr <= 0.01);

            if (aInGate && bInGate) {
              // Both satisfy <= 0.01%: secondary optimization objective is to maximize IGAC ±1.04m compliance
              if (Math.abs(candA.pct104 - candB.pct104) > 0.05) {
                return candA.pct104 > candB.pct104;
              }
              // If IGAC % is tied, pick smaller overall error / loss
              return candA.loss < candB.loss;
            }
            if (aInGate && !bInGate) return true;
            if (!aInGate && bInGate) return false;
          }

          return candA.loss < candB.loss;
        }

        let globalBest = null;

        if (useAllCombos) {
          // ── STRATEGY A: ALL COMBINATIONS (ORDERED GRID SEARCH) ──────────────
          const optAnchors = state.anchors.filter(a => a.active !== false && a.enabled !== false && a.optimize === true);
          const optCount = Math.max(1, optAnchors.length);
          const baseGrid = getGridOffsetsForM(optCount);

          let pointSets = state.anchors.map((anc, idx) => {
            if (anc.optimize !== true) {
              return [{ u: 0, v: 0, t: anc.axisT ?? 0.5, isFixed: anc.axisId == null, isFloating: anc.axisId != null }];
            }
            if (anc.axisId != null && (state.testAxes || []).some(a => a.id === anc.axisId)) {
              let nSteps = 25;
              if (optCount >= 3) nSteps = 11;
              if (optCount >= 4) nSteps = 6;
              const tVals = [];
              for (let s = 0; s < nSteps; s++) {
                tVals.push(+(s / (nSteps - 1)).toFixed(4));
              }
              return tVals.map(t => ({ t, u: 0, v: 0 }));
            }
            return [...baseGrid];
          });

          const allCombos = cartesianProduct(pointSets);
          globalBest = evaluateCandidate(currentOffsets);

          const totalCombos = allCombos.length;
          // Step interval for animation updates so the scanning motion across buffers is smooth and responsive
          const yieldInterval = isAutoMin ? Math.max(1, Math.floor(totalCombos / 28)) : Math.max(1, Math.floor(totalCombos / 48));

          for (let cIdx = 0; cIdx < totalCombos; cIdx++) {
            if (!state.tuningAnchorsActive || state.tuningCancelRequested) break;

            const trialOffsets = allCombos[cIdx];
            const trialEval = evaluateCandidate(trialOffsets);

            const isNewBest = isCandidateBetter(trialEval, globalBest);
            if (isNewBest) {
              globalBest = trialEval;
            }

            // Animate orderly movement across buffer disks / axes so the user sees the sequential sweep
            if (cIdx % yieldInterval === 0 || cIdx === totalCombos - 1 || isNewBest) {
              for (let k = 0; k < M; k++) {
                if (state.anchors[k].active !== false && state.anchors[k].enabled !== false) {
                  state.anchors[k].dst.x = trialEval.candAnchors[k].dst.x;
                  state.anchors[k].dst.y = trialEval.candAnchors[k].dst.y;
                  if (trialEval.candAnchors[k].axisT !== undefined) {
                    state.anchors[k].axisT = trialEval.candAnchors[k].axisT;
                  }
                }
              }
              if (trialEval.optRes) {
                poly.vertices = trialEval.optRes.vertices.map(v => ({ ...v }));
                recomputeUserPolygonMetrics();
              }
              redrawTrueCanvas();

              if (optStatusBadge) {
                let prefix = "";
                if (isAllAnchorsFixed) prefix = isAutoMin ? `Fixed MinR ±${currentR.toFixed(1)}m` : `Fixed ±${currentR.toFixed(1)}m`;
                else if (useCdsOnly) prefix = "CdS Area";
                else if (isAutoMin) prefix = `MinR ±${currentR.toFixed(1)}m`;
                else prefix = "Combos";
                const igacInfo = (isFilterIgac && globalBest.pct104 != null) ? ` | IGAC: ${globalBest.pct104.toFixed(1)}%` : "";
                optStatusBadge.textContent = `${prefix} [${cIdx + 1}/${totalCombos}] (Best: ${globalBest.loss.toFixed(2)}%${igacInfo})`;
                optStatusBadge.style.color = "#ffb300";
                optStatusBadge.style.background = "rgba(255, 179, 0, 0.15)";
              }
              await new Promise(resolve => setTimeout(resolve, isAutoMin ? 3 : 8));
            }
          }

          // At the end of combinations for this radius, snap display to the winning combo found
          if (globalBest.candAnchors && globalBest.optRes) {
            for (let k = 0; k < M; k++) {
              if (state.anchors[k].active !== false && state.anchors[k].enabled !== false) {
                state.anchors[k].dst.x = globalBest.candAnchors[k].dst.x;
                state.anchors[k].dst.y = globalBest.candAnchors[k].dst.y;
                if (globalBest.candAnchors[k].axisT !== undefined) {
                  state.anchors[k].axisT = globalBest.candAnchors[k].axisT;
                }
              }
            }
            poly.vertices = globalBest.optRes.vertices.map(v => ({ ...v }));
            recomputeUserPolygonMetrics();
            redrawTrueCanvas();
          }
        } else {
          // ── STRATEGY B: GENETIC ALGORITHM (DIFFERENTIAL EVOLUTION) ───────────
          const population = [];
          population.push(evaluateCandidate(currentOffsets));

          while (population.length < POP_SIZE) {
            const offsetArr = Array.from({ length: M }, (_, k) => sampleCandidateOffset(k));
            population.push(evaluateCandidate(offsetArr));
          }

          globalBest = population.reduce((best, cur) => cur.loss < best.loss ? cur : best, population[0]);

          // Evolutionary generations loop for this radius
          for (let gen = 1; gen <= MAX_GEN; gen++) {
            if (!state.tuningAnchorsActive || state.tuningCancelRequested) break;

            for (let i = 0; i < POP_SIZE; i++) {
              if (!state.tuningAnchorsActive || state.tuningCancelRequested) break;

              let r1, r2, r3;
              do { r1 = Math.floor(Math.random() * POP_SIZE); } while (r1 === i);
              do { r2 = Math.floor(Math.random() * POP_SIZE); } while (r2 === i || r2 === r1);
              do { r3 = Math.floor(Math.random() * POP_SIZE); } while (r3 === i || r3 === r1 || r3 === r2);

              const F = 0.65;
              const CR = 0.85;
              const trialOffsets = [];

              for (let k = 0; k < M; k++) {
                const anc = state.anchors[k];
                if (anc.optimize !== true) {
                  trialOffsets.push(sampleCandidateOffset(k));
                } else if (anc.axisId != null && (state.testAxes || []).some(a => a.id === anc.axisId)) {
                  let t;
                  if (Math.random() < CR || k === 0) {
                    const t1 = population[r1].offsets[k].t ?? 0.5;
                    const t2 = population[r2].offsets[k].t ?? 0.5;
                    const t3 = population[r3].offsets[k].t ?? 0.5;
                    const tBest = globalBest.offsets[k].t ?? 0.5;
                    const tCur = population[i].offsets[k].t ?? 0.5;
                    t = t1 + F * (t2 - t3) + 0.15 * (tBest - tCur);
                    if (Math.random() < 0.15) {
                      t += (Math.random() - 0.5) * 0.12;
                    }
                  } else {
                    t = population[i].offsets[k].t ?? 0.5;
                  }
                  t = Math.max(0.0, Math.min(1.0, t));
                  trialOffsets.push({ t, u: 0, v: 0 });
                } else {
                  let u, v;
                  if (Math.random() < CR || k === 0) {
                    u = population[r1].offsets[k].u + F * (population[r2].offsets[k].u - population[r3].offsets[k].u)
                        + 0.15 * (globalBest.offsets[k].u - population[i].offsets[k].u);
                    v = population[r1].offsets[k].v + F * (population[r2].offsets[k].v - population[r3].offsets[k].v)
                        + 0.15 * (globalBest.offsets[k].v - population[i].offsets[k].v);
                    if (Math.random() < 0.12) {
                      u += (Math.random() - 0.5) * 0.18;
                      v += (Math.random() - 0.5) * 0.18;
                    }
                  } else {
                    u = population[i].offsets[k].u;
                    v = population[i].offsets[k].v;
                  }
                  const dist = Math.hypot(u, v);
                  if (dist > 1.0) {
                    u /= dist;
                    v /= dist;
                  }
                  trialOffsets.push({ u, v, t: 0.5 });
                }
              }

              const trialEval = evaluateCandidate(trialOffsets);
              if (isCandidateBetter(trialEval, population[i])) {
                population[i] = trialEval;
              }
              if (isCandidateBetter(population[i], globalBest)) {
                globalBest = population[i];
              }
            }

            // Live screen animation update
            if (globalBest.candAnchors && globalBest.optRes) {
              for (let k = 0; k < M; k++) {
                if (state.anchors[k].active !== false && state.anchors[k].enabled !== false) {
                  state.anchors[k].dst.x = globalBest.candAnchors[k].dst.x;
                  state.anchors[k].dst.y = globalBest.candAnchors[k].dst.y;
                  if (globalBest.candAnchors[k].axisT !== undefined) {
                    state.anchors[k].axisT = globalBest.candAnchors[k].axisT;
                  }
                }
              }
              poly.vertices = globalBest.optRes.vertices.map(v => ({ ...v }));
              recomputeUserPolygonMetrics();
              redrawTrueCanvas();

              if (optStatusBadge) {
                let prefix = "";
                if (isAllAnchorsFixed) prefix = isAutoMin ? `Fixed MinR ±${currentR.toFixed(1)}m` : `Fixed ±${currentR.toFixed(1)}m`;
                else if (useCdsOnly && useAxisOnly) prefix = `1D+CdS ${gen}/${MAX_GEN}`;
                else if (useCdsOnly) prefix = `CdS ${gen}/${MAX_GEN}`;
                else if (useAxisOnly) prefix = `1D Axis Gen ${gen}/${MAX_GEN}`;
                else if (isAutoMin) prefix = `MinR ±${currentR.toFixed(1)}m`;
                else prefix = `Tune ${gen}/${MAX_GEN}`;
                const igacInfo = (isFilterIgac && globalBest.pct104 != null) ? ` | IGAC: ${globalBest.pct104.toFixed(1)}%` : "";
                optStatusBadge.textContent = `${prefix} (${globalBest.loss.toFixed(2)}%${igacInfo})`;
                optStatusBadge.style.color = "var(--accent-cyan)";
                optStatusBadge.style.background = "rgba(0, 229, 255, 0.15)";
              }
            }

            await new Promise(resolve => setTimeout(resolve, isAutoMin ? 15 : 40));
          }
        }

        const currentOverallErr = (globalBest.overallErr != null)
          ? globalBest.overallErr
          : ((globalBest.avgSegErr != null && globalBest.areaDiffPct != null)
              ? (globalBest.avgSegErr + globalBest.areaDiffPct) / 2
              : globalBest.loss);

        // Convergence check: stops ONLY when the overall error reaches zero (< 0.005%)
        const isZeroError = currentOverallErr < 0.005;

        if (!globalOverallBest || isCandidateBetter(globalBest, globalOverallBest)) {
          globalOverallBest = globalBest;
          winningR = currentR;
        }

        // Convergence check: stops ONLY when first reaching 0 overall error (0.00%) or completes sweep till 3.0m
        if (isAutoMin && isZeroError) {
          winningR = currentR;
          globalOverallBest = globalBest;
          const igacMsg = (isFilterIgac && globalBest.pct104 != null) ? ` (IGAC ±1.04m: ${globalBest.pct104.toFixed(1)}%)` : "";
          updateStatus(`⚡ Auto-Detect: Overall error cero (0.00%) alcanzado en radio mínimo de ±${currentR.toFixed(1)}m${igacMsg}.`);
          break;
        }
      }

      // Final thorough relaxation (240 iterations) on winning anchors & winning radius
      if (globalOverallBest && globalOverallBest.candAnchors) {
        state.optBufferRadius = winningR;
        if (optBufferSlider) optBufferSlider.value = winningR;
        if (optBufferVal) optBufferVal.textContent = `±${winningR.toFixed(1)} m`;

        for (let k = 0; k < M; k++) {
          if (state.anchors[k].active !== false && state.anchors[k].enabled !== false) {
            state.anchors[k].dst.x = globalOverallBest.candAnchors[k].dst.x;
            state.anchors[k].dst.y = globalOverallBest.candAnchors[k].dst.y;
            if (globalOverallBest.candAnchors[k].axisT !== undefined) {
              state.anchors[k].axisT = globalOverallBest.candAnchors[k].axisT;
            }
          }
        }

        const finalWarper = TransformMath.createWarper(state.algorithm, getActiveAnchors());
        const finalNominal = poly.vertices.map(v => {
          if (v.deedPt) {
            const w = finalWarper(v.deedPt);
            return { x: w.x, y: w.y, deedPt: v.deedPt, origX: w.x, origY: w.y };
          }
          return { x: v.x, y: v.y, deedPt: null, origX: v.origX ?? v.x, origY: v.origY ?? v.y };
        });

        const fixedIndices = getFixedVertexIndices(finalNominal, state.anchors);
        const finalOpt = BoundaryOptimizer.optimize({
          vertices: finalNominal,
          segmentLengths: poly.segmentLengths,
          segmentOptimize: poly.segmentOptimize,
          bufferRadius: winningR,
          balance: state.optBalance,
          targetArea: 162156.0,
          iterations: 240,
          fixedIndices
        });

        if (finalOpt.success) {
          poly.vertices = finalOpt.vertices;
        }

        state.tuningAnchorsActive = false;
        recomputeUserPolygonMetrics();
        rebuildSegmentInputs();
        redrawAll();

        const finalOverall = document.getElementById("overall-error")?.textContent || globalOverallBest.loss.toFixed(2);
        const finalIgacStr = (isFilterIgac && globalOverallBest.pct104 != null) ? ` | IGAC: ${globalOverallBest.pct104.toFixed(1)}%` : "";
        if (optStatusBadge) {
          const badgeText = isAllAnchorsFixed
            ? (isAutoMin ? `✓ Fixed Anchors: Min R ±${winningR.toFixed(1)}m (${finalOverall}%${finalIgacStr})` : `✓ Fixed Anchors Fitted (${finalOverall}%${finalIgacStr})`)
            : (useCdsOnly
                ? `✓ CdS Area Fitted (${globalOverallBest.loss.toFixed(2)}%)`
                : (useAxisOnly
                    ? `✓ 1D Axis Fitted (${finalOverall}%${finalIgacStr})`
                    : (isAutoMin ? `✓ Min R: ±${winningR.toFixed(1)}m (${finalOverall}%${finalIgacStr})` : `✓ Auto-Tuned (${finalOverall}%${finalIgacStr})`)));
          optStatusBadge.textContent = badgeText;
          optStatusBadge.style.background = "rgba(0, 230, 118, 0.22)";
          optStatusBadge.style.color = "#00e676";
        }
        updateStatus(`⚡ Auto-Tune finalizado: solución óptima ${isAllAnchorsFixed ? 'con anclajes fijos (optimizando buffers de nodos)' : (useCdsOnly ? 'para áreas Casa del Sol' : (useAxisOnly ? 'a lo largo de ejes de prueba' : `con radio ±${winningR.toFixed(1)}m`))}, error = ${(useCdsOnly ? globalOverallBest.loss.toFixed(2) : finalOverall)}%${(isFilterIgac && globalOverallBest.pct104 != null) ? ` (Cumplimiento IGAC ±1.04m: ${globalOverallBest.pct104.toFixed(1)}%)` : ''}.`);
      }

      // Cleanup state & UI
      state.tuningAnchorsActive = false;
      state.tuningCancelRequested = false;
      state.tuningAnchorCenters = null;
      if (btnRunOpt) btnRunOpt.disabled = false;
      if (btnResetOpt) btnResetOpt.disabled = false;
      if (btnAutoTune) {
        btnAutoTune.innerHTML = "⚡ Auto-Tune Anchors";
        btnAutoTune.style.background = "linear-gradient(135deg, #00b0ff, #7c4dff)";
        btnAutoTune.style.boxShadow = "0 2px 8px rgba(0, 176, 255, 0.25)";
      }
    }

    if (btnAutoTune) {
      btnAutoTune.addEventListener("click", () => {
        if (state.tuningAnchorsActive) {
          state.tuningCancelRequested = true;
          updateStatus("Stopping Auto-Tune… applying best solution found so far.");
          return;
        }
        runAutoTuneAnchors();
      });
    }

    // ── Legal Help Modal Event Handlers ──
    // [/SECTION: JS_BOUNDARY_OPTIMIZER_UI]
