
    // ============================================================================
    // [SECTION: JS_TRANSFORM_MATH]
    // ============================================================================
    /* ==========================================================================
       2. TRANSFORMATION MATHEMATICAL ENGINE (TPS, AFFINE, HELMERT, PROJECTIVE)
       ========================================================================== */
    class TransformMath {
      static tpsKernel(r) {
        if (r <= 1e-9) return 0;
        return r * r * Math.log(r);
      }

      static solveLinearSystem(A, b) {
        const n = A.length;
        const M = A.map((row, i) => [...row, b[i]]);

        for (let i = 0; i < n; i++) {
          let maxRow = i;
          for (let k = i + 1; k < n; k++) {
            if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
          }
          const temp = M[i]; M[i] = M[maxRow]; M[maxRow] = temp;

          if (Math.abs(M[i][i]) < 1e-12) {
            throw new Error("Matrix is singular.");
          }

          for (let k = i + 1; k < n; k++) {
            const factor = M[k][i] / M[i][i];
            for (let j = i; j <= n; j++) {
              M[k][j] -= factor * M[i][j];
            }
          }
        }

        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
          let sum = M[i][n];
          for (let j = i + 1; j < n; j++) {
            sum -= M[i][j] * x[j];
          }
          x[i] = sum / M[i][i];
        }
        return x;
      }

      static buildTPSWarper(anchors) {
        const N = anchors.length;
        if (N < 3) throw new Error("TPS requires >= 3 anchor pairs.");

        const sysSize = N + 3;
        const K = Array.from({ length: sysSize }, () => new Array(sysSize).fill(0));
        const bx = new Array(sysSize).fill(0);
        const by = new Array(sysSize).fill(0);

        for (let i = 0; i < N; i++) {
          bx[i] = anchors[i].dst.x;
          by[i] = anchors[i].dst.y;

          for (let j = 0; j < N; j++) {
            if (i !== j) {
              const dx = anchors[i].src.x - anchors[j].src.x;
              const dy = anchors[i].src.y - anchors[j].src.y;
              K[i][j] = TransformMath.tpsKernel(Math.hypot(dx, dy));
            }
          }

          K[i][N] = 1; K[i][N + 1] = anchors[i].src.x; K[i][N + 2] = anchors[i].src.y;
          K[N][i] = 1; K[N + 1][i] = anchors[i].src.x; K[N + 2][i] = anchors[i].src.y;
        }

        const solX = TransformMath.solveLinearSystem(K, bx);
        const solY = TransformMath.solveLinearSystem(K, by);

        return (pt) => {
          let xWarp = solX[N] + solX[N + 1] * pt.x + solX[N + 2] * pt.y;
          let yWarp = solY[N] + solY[N + 1] * pt.x + solY[N + 2] * pt.y;

          for (let i = 0; i < N; i++) {
            const dx = pt.x - anchors[i].src.x;
            const dy = pt.y - anchors[i].src.y;
            const U = TransformMath.tpsKernel(Math.hypot(dx, dy));
            xWarp += solX[i] * U;
            yWarp += solY[i] * U;
          }
          return { x: xWarp, y: yWarp };
        };
      }

      static buildAffineWarper(anchors) {
        const AtA = Array.from({ length: 3 }, () => new Array(3).fill(0));
        const AtBx = new Array(3).fill(0);
        const AtBy = new Array(3).fill(0);

        anchors.forEach(a => {
          const row = [a.src.x, a.src.y, 1];
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) AtA[i][j] += row[i] * row[j];
            AtBx[i] += row[i] * a.dst.x;
            AtBy[i] += row[i] * a.dst.y;
          }
        });

        const cX = TransformMath.solveLinearSystem(AtA, AtBx);
        const cY = TransformMath.solveLinearSystem(AtA, AtBy);

        return (pt) => ({
          x: cX[0] * pt.x + cX[1] * pt.y + cX[2],
          y: cY[0] * pt.x + cY[1] * pt.y + cY[2]
        });
      }

      static buildSimilarityWarper(anchors) {
        if (!anchors || anchors.length < 2) return (pt) => ({ ...pt });

        // Helper to solve 4-param similarity system
        function fit(isReflected) {
          const A = Array.from({ length: 4 }, () => new Array(4).fill(0));
          const B = new Array(4).fill(0);

          anchors.forEach(anc => {
            const x = anc.src.x, y = anc.src.y;
            const x_ = anc.dst.x, y_ = anc.dst.y;
            // When isReflected is true: x' = a*x + b*y + c, y' = b*x - a*y + d.
            // This inverts Y (essential because deed space is Y-down, but GIS UTM is Y-up).
            // On screen, this results in a true rigid rotation with NO sideways mirroring.
            // When isReflected is false: x' = a*x - b*y + c, y' = b*x + a*y + d.
            const rows = isReflected
              ? [[x, y, 1, 0], [-y, x, 0, 1]]
              : [[x, -y, 1, 0], [y, x, 0, 1]];
            const targets = [x_, y_];

            for (let r = 0; r < 2; r++) {
              for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) A[i][j] += rows[r][i] * rows[r][j];
                B[i] += rows[r][i] * targets[r];
              }
            }
          });

          const c = TransformMath.solveLinearSystem(A, B);
          if (isReflected) {
            return (pt) => ({
              x: c[0] * pt.x + c[1] * pt.y + c[2],
              y: c[1] * pt.x - c[0] * pt.y + c[3]
            });
          } else {
            return (pt) => ({
              x: c[0] * pt.x - c[1] * pt.y + c[2],
              y: c[1] * pt.x + c[0] * pt.y + c[3]
            });
          }
        }

        // For 2 anchors, always use the reflected model: since deed space has Y growing
        // downwards (PDF coordinates) while GIS UTM has Y growing upwards (North),
        // reflecting Y produces a pure physical rotation on screen with zero sideways reversal.
        // For >= 3 anchors, automatically pick the orientation that produces lower RMSE.
        if (anchors.length === 2) {
          return fit(true);
        }

        const warperReflected = fit(true);
        const warperDirect = fit(false);
        const rmseReflected = TransformMath.computeRMSE(warperReflected, anchors).totalRMSE;
        const rmseDirect = TransformMath.computeRMSE(warperDirect, anchors).totalRMSE;

        return rmseReflected <= rmseDirect ? warperReflected : warperDirect;
      }

      static buildProjectiveWarper(anchors) {
        const A = Array.from({ length: 8 }, () => new Array(8).fill(0));
        const B = new Array(8).fill(0);

        anchors.forEach(anc => {
          const x = anc.src.x, y = anc.src.y;
          const x_ = anc.dst.x, y_ = anc.dst.y;
          const rows = [
            [x, y, 1, 0, 0, 0, -x * x_, -y * x_],
            [0, 0, 0, x, y, 1, -x * y_, -y * y_]
          ];
          const targets = [x_, y_];

          for (let r = 0; r < 2; r++) {
            for (let i = 0; i < 8; i++) {
              for (let j = 0; j < 8; j++) A[i][j] += rows[r][i] * rows[r][j];
              B[i] += rows[r][i] * targets[r];
            }
          }
        });

        const h = TransformMath.solveLinearSystem(A, B);

        return (pt) => {
          const denom = h[6] * pt.x + h[7] * pt.y + 1;
          return {
            x: (h[0] * pt.x + h[1] * pt.y + h[2]) / denom,
            y: (h[3] * pt.x + h[4] * pt.y + h[5]) / denom
          };
        };
      }

      static _buildRawWarper(algorithm, active) {
        const algo = (algorithm || "").toUpperCase();
        switch (algo) {
          case "TPS":
            return active.length >= 3 ? TransformMath.buildTPSWarper(active) : TransformMath.buildSimilarityWarper(active);
          case "AFFINE":
            return active.length >= 3 ? TransformMath.buildAffineWarper(active) : TransformMath.buildSimilarityWarper(active);
          case "PROJECTIVE":
            return active.length >= 4 ? TransformMath.buildProjectiveWarper(active) : (active.length >= 3 ? TransformMath.buildAffineWarper(active) : TransformMath.buildSimilarityWarper(active));
          case "SIMILARITY":
          default:
            return TransformMath.buildSimilarityWarper(active);
        }
      }

      static createWarper(algorithm, anchors, deedScale) {
        const active = (anchors || []).filter(a => a.active !== false && a.enabled !== false);
        if (!active || active.length === 0) return (pt) => ({ ...pt });

        const rawWarper = TransformMath._buildRawWarper(algorithm, active);

        const scale = deedScale || (typeof state !== "undefined" && state.deedScale) || { x: 1.0, y: 1.0, ratio: 1.0 };
        const ratio = (scale.ratio !== undefined) ? scale.ratio : (scale.x || 1.0);
        const hasScale = Math.abs(ratio - 1.0) > 1e-5;

        if (!hasScale || active.length < 2) {
          return rawWarper;
        }

        // Baseline-Anchored Perpendicular Squeeze:
        // Anchors active[0].src (Mojón 1) & active[1].src (Mojón 2) define the fixed baseline.
        // Points on the baseline have dPerp = 0 and stay 100% pinned (0.00 m drift).
        // Points away from the baseline scale their perpendicular distance by ratio R.
        const p1 = active[0].src;
        const p2 = active[1].src;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-9) return rawWarper;

        const uParX = dx / len;
        const uParY = dy / len;
        const uPerpX = -uParY;
        const uPerpY = uParX;

        const transformPt = (p) => {
          const rx = p.x - p1.x;
          const ry = p.y - p1.y;
          const dPar = rx * uParX + ry * uParY;
          const dPerp = rx * uPerpX + ry * uPerpY;
          return {
            x: p1.x + dPar * uParX + (ratio * dPerp) * uPerpX,
            y: p1.y + dPar * uParY + (ratio * dPerp) * uPerpY
          };
        };

        return (pt) => rawWarper(transformPt(pt));
      }

      /** Construct inverse warper mapping Field GIS coordinates back to Historical Deed coordinates */
      static createInverseWarper(algorithm, anchors, deedScale) {
        const active = (anchors || []).filter(a => a.active !== false && a.enabled !== false);
        if (!active || active.length < 2) return null;

        const invAnchors = active.map(a => ({
          id: a.id,
          color: a.color,
          src: { x: a.dst.x, y: a.dst.y },
          dst: { x: a.src.x, y: a.src.y },
          active: true,
          enabled: true
        }));
        const rawInvWarper = TransformMath._buildRawWarper(algorithm, invAnchors);

        const scale = deedScale || (typeof state !== "undefined" && state.deedScale) || { x: 1.0, y: 1.0, ratio: 1.0 };
        const ratio = (scale.ratio !== undefined) ? scale.ratio : (scale.x || 1.0);
        const hasScale = Math.abs(ratio - 1.0) > 1e-5;

        if (!hasScale) {
          return rawInvWarper;
        }

        const p1 = active[0].src;
        const p2 = active[1].src;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-9) return rawInvWarper;

        const uParX = dx / len;
        const uParY = dy / len;
        const uPerpX = -uParY;
        const uPerpY = uParX;

        const unTransformPt = (p) => {
          const rx = p.x - p1.x;
          const ry = p.y - p1.y;
          const dPar = rx * uParX + ry * uParY;
          const dPerpSqueezed = rx * uPerpX + ry * uPerpY;
          const dPerpOriginal = dPerpSqueezed / ratio;
          return {
            x: p1.x + dPar * uParX + dPerpOriginal * uPerpX,
            y: p1.y + dPar * uParY + dPerpOriginal * uPerpY
          };
        };

        return (gisPt) => {
          const rawDeedPt = rawInvWarper(gisPt);
          return unTransformPt(rawDeedPt);
        };
      }

      static computeRMSE(warper, anchors) {
        const active = (anchors || []).filter(a => a.active !== false && a.enabled !== false);
        if (!active || active.length === 0 || !warper) return { totalRMSE: 0, residuals: [] };
        let sumSqErr = 0;
        const residuals = active.map((anc) => {
          const warped = warper(anc.src);
          const err = Math.hypot(warped.x - anc.dst.x, warped.y - anc.dst.y);
          sumSqErr += err * err;
          return err;
        });
        return { totalRMSE: Math.sqrt(sumSqErr / active.length), residuals };
      }
    }

    // [/SECTION: JS_TRANSFORM_MATH]
