
    // ============================================================================
    // [SECTION: JS_BOUNDARY_OPTIMIZER_ENGINE] (DORMANT / PARKED)
    // ============================================================================
    /**
     * Identify polygon vertices that correspond to active fixed anchors (optimize:false and no axis).
     * These vertices must have buffer = 0 and remain strictly locked to their nominal anchor coordinates.
     */
    function getFixedVertexIndices(polygonVertices, anchors = (typeof state !== "undefined" ? state.anchors : [])) {
      const fixedSet = new Set();
      if (!polygonVertices || !anchors) return fixedSet;
      const activeFixed = (anchors || []).filter(a => a.active !== false && a.enabled !== false && a.optimize !== true && a.axisId == null);
      if (activeFixed.length === 0) return fixedSet;

      polygonVertices.forEach((v, idx) => {
        for (const anc of activeFixed) {
          if (v.deedPt && Math.hypot(v.deedPt.x - anc.src.x, v.deedPt.y - anc.src.y) <= 1.5) {
            fixedSet.add(idx);
            break;
          }
          const ox = (v.origX !== undefined && v.origX !== null) ? v.origX : v.x;
          const oy = (v.origY !== undefined && v.origY !== null) ? v.origY : v.y;
          if (Math.hypot(ox - anc.dst.x, oy - anc.dst.y) <= 2.0 || Math.hypot(v.x - anc.dst.x, v.y - anc.dst.y) <= 2.0) {
            fixedSet.add(idx);
            break;
          }
        }
      });
      return fixedSet;
    }

    function isVertexFixedAnchor(poly, i, anchors = (typeof state !== "undefined" ? state.anchors : [])) {
      if (!poly || !poly.vertices) return false;
      const v = poly.vertices[i];
      if (!v) return false;
      let ancList = anchors;
      if (typeof state !== "undefined" && state.activeDeed && state.activeDeed !== "1073" && poly === state.userPolygon) {
        ancList = (state.deeds && state.deeds["1073"] && state.deeds["1073"].anchors) ? state.deeds["1073"].anchors : [];
      }
      const activeFixed = (ancList || []).filter(a => a.active !== false && a.enabled !== false && a.optimize !== true && a.axisId == null);
      if (activeFixed.length === 0) return false;

      for (const anc of activeFixed) {
        if (v.deedPt && Math.hypot(v.deedPt.x - anc.src.x, v.deedPt.y - anc.src.y) <= 1.5) {
          return true;
        }
        const ox = (v.origX !== undefined && v.origX !== null) ? v.origX : v.x;
        const oy = (v.origY !== undefined && v.origY !== null) ? v.origY : v.y;
        if (Math.hypot(ox - anc.dst.x, oy - anc.dst.y) <= 2.0 || Math.hypot(v.x - anc.dst.x, v.y - anc.dst.y) <= 2.0) {
          return true;
        }
      }
      return false;
    }

    /* ==========================================================================
       3.5. BOUNDARY OPTIMIZATION ENGINE (Constrained Relaxation: Spring & Area Model)
       ========================================================================== */
    class BoundaryOptimizer {
      /**
       * Optimize dynamic vertices of userPolygon within buffer radius R.
       * Vertices corresponding to fixed anchors are locked to nominal with 0 buffer.
       * @param {Object} options
       *   - vertices: Array<{ x, y, deedPt, origX?, origY? }>
       *   - segmentLengths: Array<number|null>
       *   - bufferRadius: number (meters, e.g. 3.0)
       *   - balance: number (0 = distance focus, 50 = balanced, 100 = area focus)
       *   - targetArea: number (default 162156.0 m²)
       *   - iterations: number (default 220)
       *   - fixedIndices: Set<number>
       * @returns {{ success: boolean, vertices: Array, maxDisplacement: number, initialLoss: number, finalLoss: number, reason?: string }}
       */
      static optimize(options) {
        const {
          vertices,
          segmentLengths,
          segmentOptimize,
          bufferRadius = 3.0,
          balance = 50,
          targetArea = 162156.0,
          iterations = 220
        } = options;

        if (!vertices || vertices.length < 3) {
          return { success: false, reason: "Polygon requires ≥ 3 vertices." };
        }

        const N = vertices.length;
        const fixedIndices = options.fixedIndices || (typeof getFixedVertexIndices === "function" ? getFixedVertexIndices(vertices) : new Set());

        // Clone vertices and ensure baseline nominal coordinates (origX, origY)
        const pts = vertices.map((v, idx) => {
          const ox = (v.origX !== undefined && v.origX !== null) ? v.origX : v.x;
          const oy = (v.origY !== undefined && v.origY !== null) ? v.origY : v.y;
          const isFixed = fixedIndices.has(idx) || v.isFixed === true;
          return {
            x: isFixed ? ox : v.x,
            y: isFixed ? oy : v.y,
            deedPt: v.deedPt ? { ...v.deedPt } : null,
            origX: ox,
            origY: oy,
            isFixed
          };
        });

        // Identify dynamic vertex indices (strictly deed-anchored vertices adjacent to segments selected for optimization, NOT fixed)
        const dynamicIndices = [];
        for (let i = 0; i < N; i++) {
          const prevIdx = (i - 1 + N) % N;
          const isAdjToOpt = segmentOptimize ? (
            (segmentOptimize[i] && segmentLengths[i] > 0) ||
            (segmentOptimize[prevIdx] && segmentLengths[prevIdx] > 0)
          ) : (pts[i].deedPt !== null);

          const isFixed = pts[i].isFixed === true;

          if (pts[i].deedPt !== null && isAdjToOpt && !isFixed) {
            dynamicIndices.push(i);
          } else if (isFixed) {
            // Strictly clamp fixed vertex to nominal
            pts[i].x = pts[i].origX;
            pts[i].y = pts[i].origY;
          }
        }

        if (dynamicIndices.length === 0) {
          return { success: false, reason: "No dynamic deed vertices found to optimize." };
        }

        // Count segments selected for optimization
        let countSegs = 0;
        for (let i = 0; i < N; i++) {
          const dl = segmentLengths[i];
          const nextIdx = (i + 1) % N;
          const isSelected = segmentOptimize ? (segmentOptimize[i] === true) : (pts[i].deedPt !== null && pts[nextIdx].deedPt !== null);
          if (isSelected && dl !== null && dl !== undefined && dl > 0) countSegs++;
        }

        // Weighting from balance slider (0..100)
        const b = Math.max(0, Math.min(100, balance));
        const wDist = b <= 50 ? 1.0 : (100 - b) / 50;
        const wArea = b >= 50 ? 1.0 : b / 50;

        // Loss and analytical gradients
        function evaluate(currentPts) {
          let distLoss = 0;
          const gradDist = Array.from({ length: N }, () => ({ x: 0, y: 0 }));

          // 1. Distance loss & gradients (strictly for segments selected via checkbox)
          for (let i = 0; i < N; i++) {
            const isSelected = segmentOptimize ? (segmentOptimize[i] === true) : (currentPts[i].deedPt !== null && currentPts[(i + 1) % N].deedPt !== null);
            if (!isSelected) continue; // Skip unselected segments from optimization calculation

            const deedLen = segmentLengths[i];
            const nextIdx = (i + 1) % N;

            if (deedLen !== null && deedLen !== undefined && deedLen > 0) {
              const a = currentPts[i];
              const nextPt = currentPts[nextIdx];

              const dx = nextPt.x - a.x;
              const dy = nextPt.y - a.y;
              const currLen = Math.hypot(dx, dy);

              if (currLen > 1e-6) {
                const diff = currLen - deedLen;
                const relErr = diff / deedLen;
                distLoss += relErr * relErr;

                // Gradient of ( (currLen - deedLen) / deedLen )^2
                const factor = (2 * diff) / (deedLen * deedLen * currLen);
                const gbx = factor * dx;
                const gby = factor * dy;

                gradDist[nextIdx].x += gbx;
                gradDist[nextIdx].y += gby;
                gradDist[i].x -= gbx;
                gradDist[i].y -= gby;
              }
            }
          }

          // 2. Shoelace Area loss & gradients
          let signedArea = 0;
          for (let i = 0; i < N; i++) {
            const j = (i + 1) % N;
            signedArea += currentPts[i].x * currentPts[j].y - currentPts[j].x * currentPts[i].y;
          }
          signedArea /= 2;
          const currArea = Math.abs(signedArea);
          const areaSign = signedArea >= 0 ? 1 : -1;

          const areaDiff = currArea - targetArea;
          const relAreaErr = areaDiff / targetArea;
          const areaLoss = relAreaErr * relAreaErr;

          const gradArea = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
          const aFactor = (2 * areaDiff) / (targetArea * targetArea);

          for (let i = 0; i < N; i++) {
            const prev = (i - 1 + N) % N;
            const next = (i + 1) % N;
            const dAdx = areaSign * 0.5 * (currentPts[next].y - currentPts[prev].y);
            const dAdy = areaSign * 0.5 * (currentPts[prev].x - currentPts[next].x);

            gradArea[i].x = aFactor * dAdx;
            gradArea[i].y = aFactor * dAdy;
          }

          // Normalized composite loss
          const normDistLoss = countSegs > 0 ? (distLoss / countSegs) : 0;
          const totalLoss = wDist * normDistLoss + wArea * areaLoss;

          // Composite gradient for dynamic vertices only
          const grad = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
          const distScale = countSegs > 0 ? (1 / countSegs) : 1;
          for (const idx of dynamicIndices) {
            grad[idx].x = wDist * distScale * gradDist[idx].x + wArea * gradArea[idx].x;
            grad[idx].y = wDist * distScale * gradDist[idx].y + wArea * gradArea[idx].y;
          }

          return { totalLoss, grad, normDistLoss, areaLoss, currArea };
        }

        // Adam Optimizer state
        const m = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
        const v = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
        const beta1 = 0.9;
        const beta2 = 0.999;
        const eps = 1e-8;
        const baseLr = 0.14;

        // Radial projection before initial evaluation: ensure all vertices start strictly within the target bufferRadius
        for (const i of dynamicIndices) {
          const ox = pts[i].origX;
          const oy = pts[i].origY;
          const dx = pts[i].x - ox;
          const dy = pts[i].y - oy;
          const distFromOrig = Math.hypot(dx, dy);
          if (distFromOrig > bufferRadius) {
            const scale = bufferRadius / distFromOrig;
            pts[i].x = ox + dx * scale;
            pts[i].y = oy + dy * scale;
          }
        }

        const initialEval = evaluate(pts);
        let bestLoss = initialEval.totalLoss;
        let bestPts = pts.map(p => ({ ...p }));

        for (let t = 1; t <= iterations; t++) {
          const { totalLoss, grad } = evaluate(pts);

          if (totalLoss < bestLoss) {
            bestLoss = totalLoss;
            bestPts = pts.map(p => ({ ...p }));
          }

          // Learning rate decay for fine convergence
          const lr = baseLr * (1.0 - 0.45 * (t / iterations));

          for (const i of dynamicIndices) {
            // Update biased 1st moment estimate
            m[i].x = beta1 * m[i].x + (1 - beta1) * grad[i].x;
            m[i].y = beta1 * m[i].y + (1 - beta1) * grad[i].y;

            // Update biased 2nd raw moment estimate
            v[i].x = beta2 * v[i].x + (1 - beta2) * (grad[i].x * grad[i].x);
            v[i].y = beta2 * v[i].y + (1 - beta2) * (grad[i].y * grad[i].y);

            // Compute bias-corrected estimates
            const mHatX = m[i].x / (1 - Math.pow(beta1, t));
            const mHatY = m[i].y / (1 - Math.pow(beta1, t));
            const vHatX = v[i].x / (1 - Math.pow(beta2, t));
            const vHatY = v[i].y / (1 - Math.pow(beta2, t));

            // Position step
            pts[i].x -= lr * mHatX / (Math.sqrt(vHatX) + eps);
            pts[i].y -= lr * mHatY / (Math.sqrt(vHatY) + eps);

            // Strict Radial Projection (Clamp to buffer disk radius R from origX, origY)
            const ox = pts[i].origX;
            const oy = pts[i].origY;
            const dx = pts[i].x - ox;
            const dy = pts[i].y - oy;
            const distFromOrig = Math.hypot(dx, dy);

            if (distFromOrig > bufferRadius) {
              const scale = bufferRadius / distFromOrig;
              pts[i].x = ox + dx * scale;
              pts[i].y = oy + dy * scale;
            }
          }
        }

        const finalEval = evaluate(bestPts);
        let maxDisplacement = 0;
        for (const i of dynamicIndices) {
          const d = Math.hypot(bestPts[i].x - bestPts[i].origX, bestPts[i].y - bestPts[i].origY);
          if (d > maxDisplacement) maxDisplacement = d;
        }

        return {
          success: true,
          vertices: bestPts,
          maxDisplacement,
          initialLoss: initialEval.totalLoss,
          finalLoss: finalEval.totalLoss,
          initialArea: initialEval.currArea,
          finalArea: finalEval.currArea
        };
      }
    }

    // [/SECTION: JS_BOUNDARY_OPTIMIZER_ENGINE]
