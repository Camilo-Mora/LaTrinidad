
    // ============================================================================
    // [SECTION: JS_VECTORIZER_LOGIC]
    // ============================================================================
    const vecState = {
      activeMapKey: "1073",
      pdfDoc: null,
      pageNum: 1,
      scale: 1.5,
      outlineThickness: (function() {
        try {
          const v = parseFloat(localStorage.getItem("vec_outline_thickness"));
          return Number.isFinite(v) && v > 0 ? v : 3;
        } catch (e) { return 3; }
      })(),
      vertexSize: (function() {
        try {
          const v = parseFloat(localStorage.getItem("vec_vertex_size"));
          return Number.isFinite(v) && v > 0 ? v : 6;
        } catch (e) { return 6; }
      })(),
      vertexStroke: (function() {
        try {
          const v = parseFloat(localStorage.getItem("vec_vertex_stroke"));
          return Number.isFinite(v) && v > 0 ? v : 2;
        } catch (e) { return 2; }
      })(),
      vertexHollow: (function() {
        try { return localStorage.getItem("vec_vertex_hollow") === "true"; }
        catch (e) { return false; }
      })(),
      polygons: [],
      activePolyIndex: 0,
      isDraggingVertex: false,
      draggedVertexIndex: null,
      currentSnapTarget: null,
      snapEnabled: true,
      snapRadius: 15,
      isPanning: false,
      panStart: { x: 0, y: 0 },
      scrollStart: { x: 0, y: 0 },
      isSpacePressed: false
    };

    function syncVecStyleControls() {
      const thickSlider = document.getElementById("vec-outline-thickness");
      const thickVal = document.getElementById("vec-outline-thickness-val");
      if (thickSlider && thickVal) {
        thickSlider.value = vecState.outlineThickness;
        thickVal.textContent = `${vecState.outlineThickness} px`;
      }
      const sizeSlider = document.getElementById("vec-vertex-size");
      const sizeVal = document.getElementById("vec-vertex-size-val");
      if (sizeSlider && sizeVal) {
        sizeSlider.value = vecState.vertexSize;
        sizeVal.textContent = `${vecState.vertexSize} px`;
      }
      const strokeSlider = document.getElementById("vec-vertex-stroke");
      const strokeVal = document.getElementById("vec-vertex-stroke-val");
      if (strokeSlider && strokeVal) {
        strokeSlider.value = vecState.vertexStroke;
        strokeVal.textContent = `${vecState.vertexStroke} px`;
      }
      const hollowChk = document.getElementById("vec-vertex-hollow");
      if (hollowChk) hollowChk.checked = vecState.vertexHollow;
    }

    const vecModal = document.getElementById("vectorizer-modal");
    const vecPdfCanvas = document.getElementById("vec-pdf-canvas");
    const vecPdfCtx = vecPdfCanvas ? vecPdfCanvas.getContext("2d") : null;
    const vecDrawCanvas = document.getElementById("vec-draw-canvas");
    const vecDrawCtx = vecDrawCanvas ? vecDrawCanvas.getContext("2d") : null;

    function openVectorizerModal(mapKey = "1073") {
      vecState.activeMapKey = mapKey;
      syncVecStyleControls();
      const mapTitle = mapKey === "296" ? "Escritura 296 (Mapa2096_LaTrinidad.pdf)"
        : mapKey === "196" ? "Escritura 196 (Mapa196_ErrorCasaDelSol.pdf)"
        : "Escritura 1073 (Mapa1073_FerminSuarez.pdf)";
      const titleEl = document.getElementById("vec-modal-title");
      if (titleEl) titleEl.textContent = `✏️ Vectorize & Edit Polygon — ${mapTitle}`;

      // Initialize polygon state from current deed entities
      const sourceEntities = state.histEntities || [];
      vecState.polygons = sourceEntities.map((ent, idx) => ({
        id: idx + 1,
        name: ent.layer || `Polygon_${idx + 1}`,
        color: anchorColors[idx % anchorColors.length] || "#ff1744",
        closed: ent.closed !== false,
        points: (ent.points || []).map(p => ({ x: p.x, y: p.y }))
      }));
      if (vecState.polygons.length === 0) {
        vecState.polygons.push({ id: 1, name: "Polygon_1", color: "#ff1744", closed: true, points: [] });
      }
      vecState.activePolyIndex = 0;

      if (vecModal) vecModal.classList.add("visible");
      renderVecPolygonList();

      if (state.histPdfDoc) {
        vecState.pdfDoc = state.histPdfDoc;
        renderVecPdfPage(1).then(() => centerVecViewport());
      } else {
        autoLoadDeedPdfAsync().then(() => {
          if (state.histPdfDoc) {
            vecState.pdfDoc = state.histPdfDoc;
            renderVecPdfPage(1).then(() => centerVecViewport());
          } else {
            const fileInput = document.getElementById("vec-pdf-file-input");
            if (fileInput) fileInput.click();
          }
        });
      }
    }

    function renderVecPdfPage(pageNum) {
      if (!vecState.pdfDoc || !vecPdfCtx || !vecDrawCtx) return Promise.resolve();
      vecState.pageNum = pageNum;
      return vecState.pdfDoc.getPage(pageNum).then((page) => {
        const viewport = page.getViewport({ scale: vecState.scale });
        vecPdfCanvas.width = viewport.width; vecPdfCanvas.height = viewport.height;
        vecDrawCanvas.width = viewport.width; vecDrawCanvas.height = viewport.height;

        const pageNumEl = document.getElementById("vec-page-num");
        if (pageNumEl) pageNumEl.textContent = `Page ${pageNum} of ${vecState.pdfDoc.numPages}`;

        return page.render({ canvasContext: vecPdfCtx, viewport: viewport }).promise.then(() => {
          redrawVecDrawCanvas();
        });
      });
    }

    function getVecSnapTarget(canvasX, canvasY, ignorePIdx = -1, ignoreVIdx = -1, isShiftPressed = false) {
      const isSnapActive = isShiftPressed ? !vecState.snapEnabled : vecState.snapEnabled;
      if (!isSnapActive) return null;

      let closestTarget = null;
      let minDistance = Math.max(vecState.snapRadius || 15, (vecState.vertexSize || 6) + 6);

      vecState.polygons.forEach((poly, pIdx) => {
        poly.points.forEach((pt, vIdx) => {
          if (pIdx === ignorePIdx && vIdx === ignoreVIdx) return;
          const sx = pt.x * vecState.scale;
          const sy = pt.y * vecState.scale;
          const dist = Math.hypot(sx - canvasX, sy - canvasY);
          if (dist <= minDistance) {
            minDistance = dist;
            closestTarget = {
              worldPt: { x: pt.x, y: pt.y },
              screenPt: { x: sx, y: sy },
              dist
            };
          }
        });
      });
      return closestTarget;
    }

    function redrawVecDrawCanvas() {
      if (!vecDrawCtx || !vecDrawCanvas) return;
      vecDrawCtx.clearRect(0, 0, vecDrawCanvas.width, vecDrawCanvas.height);
      const baseThickness = vecState.outlineThickness || 3;
      const baseVertexRadius = vecState.vertexSize || 6;
      const baseVertexStroke = vecState.vertexStroke || 2;
      const hollow = vecState.vertexHollow || false;

      vecState.polygons.forEach((poly, pIdx) => {
        if (!poly.points || poly.points.length === 0) return;
        const isActive = pIdx === vecState.activePolyIndex;

        vecDrawCtx.beginPath();
        vecDrawCtx.moveTo(poly.points[0].x * vecState.scale, poly.points[0].y * vecState.scale);
        for (let i = 1; i < poly.points.length; i++) {
          vecDrawCtx.lineTo(poly.points[i].x * vecState.scale, poly.points[i].y * vecState.scale);
        }
        if (poly.closed !== false) {
          vecDrawCtx.closePath();
        }
        vecDrawCtx.strokeStyle = poly.color;
        vecDrawCtx.lineWidth = isActive ? baseThickness : Math.max(1, Math.round(baseThickness * 0.65 * 10) / 10);
        vecDrawCtx.stroke();

        poly.points.forEach((pt) => {
          const handleRadius = isActive ? baseVertexRadius : Math.max(2, Math.round(baseVertexRadius * 0.7));
          const sx = pt.x * vecState.scale;
          const sy = pt.y * vecState.scale;
          vecDrawCtx.beginPath(); vecDrawCtx.arc(sx, sy, handleRadius, 0, Math.PI * 2);
          if (hollow) {
            vecDrawCtx.fillStyle = "transparent";
          } else {
            vecDrawCtx.fillStyle = isActive ? "#ffffff" : poly.color;
          }
          vecDrawCtx.fill();
          vecDrawCtx.strokeStyle = poly.color;
          vecDrawCtx.lineWidth = baseVertexStroke;
          vecDrawCtx.stroke();

          if (isActive) {
            const reticleLen = Math.max(5, handleRadius + 3);
            vecDrawCtx.beginPath();
            vecDrawCtx.moveTo(sx - reticleLen, sy); vecDrawCtx.lineTo(sx + reticleLen, sy);
            vecDrawCtx.moveTo(sx, sy - reticleLen); vecDrawCtx.lineTo(sx, sy + reticleLen);
            vecDrawCtx.strokeStyle = "rgba(255, 255, 255, 0.65)";
            vecDrawCtx.lineWidth = Math.max(1, Math.min(2, handleRadius * 0.2));
            vecDrawCtx.stroke();
          }
        });
      });

      // Render magnetic snap ring visual indicator
      if (vecState.currentSnapTarget) {
        const { x: sx, y: sy } = vecState.currentSnapTarget.screenPt;
        const snapR = Math.max(12, baseVertexRadius + 6);
        vecDrawCtx.save();
        vecDrawCtx.beginPath(); vecDrawCtx.arc(sx, sy, snapR, 0, Math.PI * 2);
        vecDrawCtx.strokeStyle = "#ffd600"; vecDrawCtx.lineWidth = 2.5; vecDrawCtx.stroke();
        vecDrawCtx.beginPath(); vecDrawCtx.arc(sx, sy, Math.max(4, snapR * 0.45), 0, Math.PI * 2);
        vecDrawCtx.fillStyle = "#00e5ff"; vecDrawCtx.fill();
        vecDrawCtx.strokeStyle = "#ffffff"; vecDrawCtx.lineWidth = 1.5; vecDrawCtx.stroke();
        vecDrawCtx.beginPath();
        vecDrawCtx.moveTo(sx - (snapR + 4), sy); vecDrawCtx.lineTo(sx + (snapR + 4), sy);
        vecDrawCtx.moveTo(sx, sy - (snapR + 4)); vecDrawCtx.lineTo(sx + (snapR + 4), sy);
        vecDrawCtx.strokeStyle = "rgba(255, 214, 0, 0.85)"; vecDrawCtx.lineWidth = 1.2; vecDrawCtx.stroke();
        vecDrawCtx.restore();
      }

      // Highlight hovered line segment (indicates right-click to delete line)
      if (vecState.hoveredSeg && !vecState.isDraggingVertex) {
        const hs = vecState.hoveredSeg;
        const poly = vecState.polygons[hs.pIdx];
        if (poly && poly.points && poly.points[hs.vIdx1] && poly.points[hs.vIdx2]) {
          const p1 = poly.points[hs.vIdx1];
          const p2 = poly.points[hs.vIdx2];
          vecDrawCtx.save();
          vecDrawCtx.beginPath();
          vecDrawCtx.moveTo(p1.x * vecState.scale, p1.y * vecState.scale);
          vecDrawCtx.lineTo(p2.x * vecState.scale, p2.y * vecState.scale);
          vecDrawCtx.strokeStyle = "#ff1744";
          vecDrawCtx.lineWidth = baseThickness + 3;
          vecDrawCtx.setLineDash([5, 4]);
          vecDrawCtx.stroke();
          vecDrawCtx.setLineDash([]);
          vecDrawCtx.restore();
        }
      }
    }

    function renderVecPolygonList() {
      const container = document.getElementById("vec-poly-list");
      if (!container) return;
      container.innerHTML = "";
      vecState.polygons.forEach((poly, idx) => {
        const isActive = idx === vecState.activePolyIndex;
        const isClosed = poly.closed !== false;
        const card = document.createElement("div");
        card.className = `layer-toggle-item ${isActive ? 'layer-active' : ''}`;

        let metricStr = `${poly.points.length} Vertices`;
        if (poly.points.length >= 2) {
          if (isClosed && poly.points.length >= 3) {
            let area = 0, perim = 0;
            const pts = poly.points;
            for (let i = 0; i < pts.length; i++) {
              const j = (i + 1) % pts.length;
              area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
              perim += Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y);
            }
            area = Math.abs(area) / 2;
            metricStr = `${poly.points.length} pts • Area: ${area.toFixed(1)} m² • Perim: ${perim.toFixed(1)} m`;
          } else {
            let len = 0;
            const pts = poly.points;
            for (let i = 0; i < pts.length - 1; i++) {
              len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
            }
            metricStr = `${poly.points.length} pts • Length: ${len.toFixed(1)} m (Open)`;
          }
        }

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="layer-title-row" style="display:flex;align-items:center;gap:6px;min-width:0;">
              <span class="layer-dot" style="background:${poly.color};flex-shrink:0;"></span>
              <input type="text" id="vec-poly-input-${idx}" value="${poly.name}" 
                     style="background:transparent; border:none; border-bottom:1px solid transparent; color:inherit; font-weight:600; font-size:0.83rem; outline:none; width:100px;"
                     onfocus="this.style.borderBottom='1px dashed var(--text-muted)'"
                     onblur="this.style.borderBottom='1px solid transparent'"
                     onclick="event.stopPropagation();"
                     onkeydown="event.stopPropagation();">
            </div>
            <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
              <button type="button" class="btn-vec-toggle-type" data-idx="${idx}"
                      style="font-size:0.65rem;padding:2px 6px;border-radius:4px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:3px;border:1px solid ${isClosed ? 'var(--accent-cyan)' : '#ffb300'};background:${isClosed ? 'rgba(0,229,255,0.14)' : 'rgba(255,179,0,0.14)'};color:${isClosed ? 'var(--accent-cyan)' : '#ffb300'};"
                      title="Click to toggle between Polygon (closed) and Polyline (open)">
                ${isClosed ? '⬡ Polygon' : '〰 Polyline'}
              </button>
              <button class="btn-del-anchor" title="Delete Layer" onclick="event.stopPropagation(); deleteVecPolygon(${idx})">✕</button>
            </div>
          </div>
          <div style="font-size:0.68rem; color:var(--text-muted); margin-left: 20px; font-family:monospace; margin-top:2px;">
            ${metricStr}
          </div>
        `;
        const inp = card.querySelector(`#vec-poly-input-${idx}`);
        if (inp) {
          inp.addEventListener("input", (e) => {
            if (vecState.polygons[idx]) vecState.polygons[idx].name = e.target.value;
          });
        }
        const typeBtn = card.querySelector(".btn-vec-toggle-type");
        if (typeBtn) {
          typeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            poly.closed = !(poly.closed !== false);
            renderVecPolygonList();
            redrawVecDrawCanvas();
          });
        }
        card.addEventListener("click", () => { 
          if (vecState.activePolyIndex !== idx) {
            vecState.activePolyIndex = idx; 
            renderVecPolygonList(); 
            redrawVecDrawCanvas(); 
          }
        });
        container.appendChild(card);
      });
    }

    function deleteVecPolygon(index) {
      vecState.polygons.splice(index, 1);
      if (vecState.activePolyIndex >= vecState.polygons.length) {
        vecState.activePolyIndex = Math.max(0, vecState.polygons.length - 1);
      }
      renderVecPolygonList();
      redrawVecDrawCanvas();
    }

    function findVecPolygonAndVertexAt(canvasX, canvasY, radius = null) {
      const effRadius = radius !== null ? radius : Math.max(10, (vecState.vertexSize || 6) + 4);
      for (let pIdx = vecState.polygons.length - 1; pIdx >= 0; pIdx--) {
        const poly = vecState.polygons[pIdx];
        for (let i = 0; i < poly.points.length; i++) {
          const pt = poly.points[i];
          const sx = pt.x * vecState.scale;
          const sy = pt.y * vecState.scale;
          if (Math.hypot(sx - canvasX, sy - canvasY) <= effRadius) return { pIdx, vIdx: i };
        }
      }
      return null;
    }

    function findVecSegmentAt(canvasX, canvasY, hitDist = 9) {
      let best = null;
      let minDist = hitDist;

      const polyIndices = [];
      if (vecState.activePolyIndex >= 0 && vecState.activePolyIndex < vecState.polygons.length) {
        polyIndices.push(vecState.activePolyIndex);
      }
      for (let p = vecState.polygons.length - 1; p >= 0; p--) {
        if (!polyIndices.includes(p)) polyIndices.push(p);
      }

      for (const pIdx of polyIndices) {
        const poly = vecState.polygons[pIdx];
        if (!poly || !poly.points || poly.points.length < 2) continue;
        const pts = poly.points;
        const isClosed = poly.closed !== false;
        const nSegs = (isClosed && pts.length >= 3) ? pts.length : pts.length - 1;

        for (let i = 0; i < nSegs; i++) {
          const j = (i + 1) % pts.length;
          const sx1 = pts[i].x * vecState.scale;
          const sy1 = pts[i].y * vecState.scale;
          const sx2 = pts[j].x * vecState.scale;
          const sy2 = pts[j].y * vecState.scale;

          const dx = sx2 - sx1;
          const dy = sy2 - sy1;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1e-4) continue;

          let t = ((canvasX - sx1) * dx + (canvasY - sy1) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const projX = sx1 + t * dx;
          const projY = sy1 + t * dy;
          const dist = Math.hypot(canvasX - projX, canvasY - projY);

          if (dist <= minDist) {
            minDist = dist;
            best = {
              pIdx,
              segIdx: i,
              vIdx1: i,
              vIdx2: j,
              isClosingSeg: (isClosed && i === pts.length - 1 && j === 0),
              dist,
              t,
              projX,
              projY
            };
          }
        }
        if (best) break;
      }
      return best;
    }

    // Vectorizer Canvas Event Handlers
    if (vecDrawCanvas) {
      vecDrawCanvas.addEventListener("mousedown", (e) => {
        if (e.button === 1 || (e.button === 0 && vecState.isSpacePressed)) {
          e.preventDefault();
          startVecPan(e);
          return;
        }
        const rect = vecDrawCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const hit = findVecPolygonAndVertexAt(x, y);

        if (e.button === 0) { // Left Click: Drag vertex or Add new vertex
          if (hit) {
            if (vecState.activePolyIndex !== hit.pIdx) {
              vecState.activePolyIndex = hit.pIdx;
              renderVecPolygonList();
            }
            vecState.isDraggingVertex = true;
            vecState.draggedVertexIndex = hit.vIdx;
            redrawVecDrawCanvas();
          } else {
            const hitSeg = findVecSegmentAt(x, y, 9);
            if (hitSeg) {
              // Clicked an existing line segment: activate layer, don't append stray point to end
              if (vecState.activePolyIndex !== hitSeg.pIdx) {
                vecState.activePolyIndex = hitSeg.pIdx;
                renderVecPolygonList();
                redrawVecDrawCanvas();
              }
              return;
            }
            const activePoly = vecState.polygons[vecState.activePolyIndex];
            if (activePoly) {
              const snapTarget = getVecSnapTarget(x, y, -1, -1, e.shiftKey);
              const worldPt = snapTarget ? { ...snapTarget.worldPt } : { x: Math.round((x / vecState.scale) * 100) / 100, y: Math.round((y / vecState.scale) * 100) / 100 };
              activePoly.points.push(worldPt);
              renderVecPolygonList();
              redrawVecDrawCanvas();
            }
          }
        } else if (e.button === 2) { // Right Click: Delete vertex or line segment
          e.preventDefault();
          if (hit) {
            if (vecState.activePolyIndex !== hit.pIdx) {
              vecState.activePolyIndex = hit.pIdx;
            }
            vecState.polygons[vecState.activePolyIndex].points.splice(hit.vIdx, 1);
            vecState.hoveredSeg = null;
            renderVecPolygonList();
            redrawVecDrawCanvas();
          } else {
            const hitSeg = findVecSegmentAt(x, y, 10);
            if (hitSeg) {
              if (vecState.activePolyIndex !== hitSeg.pIdx) {
                vecState.activePolyIndex = hitSeg.pIdx;
              }
              const poly = vecState.polygons[hitSeg.pIdx];
              const isClosed = poly.closed !== false;

              if (isClosed && hitSeg.isClosingSeg) {
                // Right-clicked the closing segment: open the polygon into a polyline!
                poly.closed = false;
                updateStatus(`✂️ Deleted closing line. Converted '${poly.name}' to open Polyline.`);
              } else if (isClosed) {
                // Right-clicked an edge of a closed polygon:
                // Delete that line segment and open the polygon at that segment!
                const pts = poly.points;
                const newPts = [];
                for (let k = 0; k < pts.length; k++) {
                  newPts.push(pts[(hitSeg.vIdx2 + k) % pts.length]);
                }
                poly.points = newPts;
                poly.closed = false;
                updateStatus(`✂️ Deleted line segment. Converted '${poly.name}' to open Polyline.`);
              } else {
                // In an open Polyline:
                if (poly.points.length <= 2) {
                  poly.points.pop();
                  updateStatus(`✂️ Deleted line segment from '${poly.name}'.`);
                } else if (hitSeg.segIdx === poly.points.length - 2) {
                  // Last line segment: delete the last vertex to remove this line
                  poly.points.pop();
                  updateStatus(`✂️ Deleted last line segment from '${poly.name}'.`);
                } else if (hitSeg.segIdx === 0) {
                  // First line segment: delete the first vertex to remove this line
                  poly.points.shift();
                  updateStatus(`✂️ Deleted first line segment from '${poly.name}'.`);
                } else {
                  // Interior segment: split into two polylines at the deleted line
                  const ptsBefore = poly.points.slice(0, hitSeg.segIdx + 1);
                  const ptsAfter = poly.points.slice(hitSeg.segIdx + 1);
                  poly.points = ptsBefore;
                  const newId = vecState.polygons.length + 1;
                  vecState.polygons.splice(hitSeg.pIdx + 1, 0, {
                    id: newId,
                    name: `${poly.name}_b`,
                    color: poly.color,
                    closed: false,
                    points: ptsAfter
                  });
                  updateStatus(`✂️ Deleted interior line segment. Split '${poly.name}' into two polylines.`);
                }
              }
              vecState.hoveredSeg = null;
              renderVecPolygonList();
              redrawVecDrawCanvas();
            }
          }
        }
      });

      vecDrawCanvas.addEventListener("mousemove", (e) => {
        const rect = vecDrawCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;

        if (vecState.isDraggingVertex && vecState.draggedVertexIndex !== null) {
          const activePoly = vecState.polygons[vecState.activePolyIndex];
          if (activePoly && activePoly.points[vecState.draggedVertexIndex]) {
            const snapTarget = getVecSnapTarget(x, y, vecState.activePolyIndex, vecState.draggedVertexIndex, e.shiftKey);
            vecState.currentSnapTarget = snapTarget;
            activePoly.points[vecState.draggedVertexIndex] = snapTarget ? { ...snapTarget.worldPt } : {
              x: Math.round((x / vecState.scale) * 100) / 100,
              y: Math.round((y / vecState.scale) * 100) / 100
            };
            redrawVecDrawCanvas();
          }
        } else {
          const snapTarget = getVecSnapTarget(x, y, -1, -1, e.shiftKey);
          let needsRedraw = false;
          if (vecState.currentSnapTarget !== snapTarget) {
            vecState.currentSnapTarget = snapTarget;
            needsRedraw = true;
          }

          const hoverVertex = findVecPolygonAndVertexAt(x, y);
          const hoverSeg = hoverVertex ? null : findVecSegmentAt(x, y, 9);
          const prevSegKey = vecState.hoveredSeg ? `${vecState.hoveredSeg.pIdx}_${vecState.hoveredSeg.segIdx}` : "";
          const newSegKey = hoverSeg ? `${hoverSeg.pIdx}_${hoverSeg.segIdx}` : "";

          if (prevSegKey !== newSegKey) {
            vecState.hoveredSeg = hoverSeg;
            needsRedraw = true;
          }

          vecDrawCanvas.style.cursor = hoverVertex ? "pointer" : (hoverSeg ? "pointer" : "crosshair");
          if (needsRedraw) {
            redrawVecDrawCanvas();
          }
        }
      });

      vecDrawCanvas.addEventListener("mouseup", () => {
        vecState.isDraggingVertex = false;
        vecState.draggedVertexIndex = null;
      });

      vecDrawCanvas.addEventListener("mouseleave", () => {
        vecState.currentSnapTarget = null;
        vecState.hoveredSeg = null;
        redrawVecDrawCanvas();
      });

      vecDrawCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

      // Double-click on a line segment inserts a new node
      vecDrawCanvas.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const rect = vecDrawCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const hitSeg = findVecSegmentAt(x, y, 12);
        if (hitSeg) {
          if (vecState.activePolyIndex !== hitSeg.pIdx) {
            vecState.activePolyIndex = hitSeg.pIdx;
          }
          const poly = vecState.polygons[hitSeg.pIdx];
          const worldPt = {
            x: Math.round((hitSeg.projX / vecState.scale) * 100) / 100,
            y: Math.round((hitSeg.projY / vecState.scale) * 100) / 100
          };
          const insertIdx = hitSeg.isClosingSeg ? poly.points.length : (hitSeg.vIdx1 + 1);
          poly.points.splice(insertIdx, 0, worldPt);
          vecState.hoveredSeg = null;
          renderVecPolygonList();
          redrawVecDrawCanvas();
          updateStatus(`➕ Added new node #${insertIdx + 1} to '${poly.name}' on line segment.`);
        }
      });
    }

    // Attach Vectorizer Toolbar Event Listeners
    const btnVecNewPoly = document.getElementById("btn-vec-new-poly");
    if (btnVecNewPoly) {
      btnVecNewPoly.addEventListener("click", () => {
        const newId = vecState.polygons.length + 1;
        vecState.polygons.push({ id: newId, name: `Polygon_${newId}`, color: anchorColors[newId % anchorColors.length] || "#00e5ff", closed: true, points: [] });
        vecState.activePolyIndex = vecState.polygons.length - 1;
        renderVecPolygonList();
        redrawVecDrawCanvas();
      });
    }

    const btnVecToggleSnap = document.getElementById("btn-vec-toggle-snap");
    if (btnVecToggleSnap) {
      btnVecToggleSnap.addEventListener("click", () => {
        vecState.snapEnabled = !vecState.snapEnabled;
        btnVecToggleSnap.textContent = `🧲 Snap: ${vecState.snapEnabled ? "ON" : "OFF"}`;
        btnVecToggleSnap.style.color = vecState.snapEnabled ? "var(--accent-cyan)" : "var(--text-muted)";
      });
    }

    const btnVecClose = document.getElementById("btn-vec-close");
    if (btnVecClose && vecModal) {
      btnVecClose.addEventListener("click", () => vecModal.classList.remove("visible"));
    }

    const btnVecApply = document.getElementById("btn-vec-apply");
    if (btnVecApply) {
      btnVecApply.addEventListener("click", () => {
        const newEntities = vecState.polygons.map((p) => ({
          type: "POLYLINE",
          layer: p.name,
          closed: p.closed !== false,
          points: p.points.map(pt => ({ x: pt.x, y: pt.y }))
        }));

        state.histEntities = newEntities;
        if (histStatus) histStatus.textContent = `Deed DXF: ${state.histEntities.length} entities (vectorized)`;
        updateStatus(`Applied vectorized edits to Deed DXF (${newEntities.length} entities).`);
        if (vecModal) vecModal.classList.remove("visible");
        redrawAll();
      });
    }

    const btnVecReset = document.getElementById("btn-vec-reset");
    if (btnVecReset) {
      btnVecReset.addEventListener("click", async () => {
        try {
          const text = await fetchText("Polygon_Escritura1073_FerminSuarez.dxf");
          state.histEntities = DXFParser.parse(text);
        } catch(e) {
          if (typeof HISTORICAL_DXF_SAMPLE !== "undefined") {
            state.histEntities = DXFParser.parse(HISTORICAL_DXF_SAMPLE);
          }
        }
        openVectorizerModal(vecState.activeMapKey);
        updateStatus("↺ Reset deed entities to default DXF.");
      });
    }

    const btnVecDownloadDxf = document.getElementById("btn-vec-download-dxf");
    if (btnVecDownloadDxf) {
      btnVecDownloadDxf.addEventListener("click", () => {
        const entitiesToExport = vecState.polygons.map((p) => ({
          type: "POLYLINE",
          layer: p.name,
          closed: p.closed !== false,
          points: p.points.map(pt => ({ x: pt.x, y: pt.y }))
        }));

        // Keep state.histEntities in sync with latest vectorized polygons
        state.histEntities = entitiesToExport;
        if (histStatus) histStatus.textContent = `Deed DXF: ${state.histEntities.length} entities (vectorized)`;

        const filename = state.histFileName || (vecState.activeMapKey === "196" ? "Polygon_Escritura196.dxf" : (vecState.activeMapKey === "296" ? "Polygon_Escritura296.dxf" : "Polygon_Escritura1073_FerminSuarez.dxf"));
        const dxfContent = DXFParser.serialize(entitiesToExport);
        const blob = new Blob([dxfContent], { type: "application/dxf" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        updateStatus(`💾 Downloaded modified Deed DXF to '${filename}'.`);
      });
    }

    // Center deed in viewport
    function centerVecViewport() {
      if (!vecViewport) return;
      const scrollW = vecViewport.scrollWidth;
      const clientW = vecViewport.clientWidth;
      const scrollH = vecViewport.scrollHeight;
      const clientH = vecViewport.clientHeight;
      vecViewport.scrollLeft = scrollW > clientW ? Math.max(0, (scrollW - clientW) / 2) : 0;
      vecViewport.scrollTop = scrollH > clientH ? Math.max(0, (scrollH - clientH) / 2) : 0;
    }

    // Fit deed to window
    function fitVecToWindow() {
      if (!vecState.pdfDoc || !vecViewport) return;
      vecState.pdfDoc.getPage(vecState.pageNum).then((page) => {
        const unscaled = page.getViewport({ scale: 1.0 });
        const pad = 64;
        const availW = Math.max(200, vecViewport.clientWidth - pad);
        const availH = Math.max(200, vecViewport.clientHeight - pad);
        const fitScale = Math.max(0.4, Math.min(8.0, Math.round(Math.min(availW / unscaled.width, availH / unscaled.height) * 100) / 100));
        vecState.scale = fitScale;
        if (vecZoomSlider) vecZoomSlider.value = fitScale;
        renderVecPdfPage(vecState.pageNum).then(() => {
          centerVecViewport();
        });
      });
    }

    const btnVecFit = document.getElementById("btn-vec-zoom-fit");
    if (btnVecFit) btnVecFit.addEventListener("click", fitVecToWindow);
    const btnVecCenter = document.getElementById("btn-vec-pan-center");
    if (btnVecCenter) btnVecCenter.addEventListener("click", centerVecViewport);

    // Apply zoom keeping center stable
    function applyVecZoom(newZoom) {
      const vecCanvasWrap = document.querySelector(".vectorizer-canvas-wrap");
      if (!vecViewport || !vecCanvasWrap) {
        vecState.scale = newZoom;
        if (vecZoomSlider) vecZoomSlider.value = newZoom;
        renderVecPdfPage(vecState.pageNum);
        return;
      }
      const oldScale = vecState.scale || 1.5;
      const ratio = newZoom / oldScale;
      const centerX = vecViewport.scrollLeft + vecViewport.clientWidth / 2;
      const centerY = vecViewport.scrollTop + vecViewport.clientHeight / 2;
      const canvasCenterX = Math.max(0, centerX - vecCanvasWrap.offsetLeft);
      const canvasCenterY = Math.max(0, centerY - vecCanvasWrap.offsetTop);

      vecState.scale = newZoom;
      if (vecZoomSlider) vecZoomSlider.value = newZoom;

      renderVecPdfPage(vecState.pageNum).then(() => {
        const newCanvasCenterX = canvasCenterX * ratio;
        const newCanvasCenterY = canvasCenterY * ratio;
        vecViewport.scrollLeft = Math.max(0, (vecCanvasWrap.offsetLeft + newCanvasCenterX) - vecViewport.clientWidth / 2);
        vecViewport.scrollTop = Math.max(0, (vecCanvasWrap.offsetTop + newCanvasCenterY) - vecViewport.clientHeight / 2);
      });
    }

    // Zoom slider & presets
    const vecZoomSlider = document.getElementById("vec-zoom-slider");
    if (vecZoomSlider) {
      vecZoomSlider.addEventListener("input", (e) => {
        applyVecZoom(parseFloat(e.target.value));
      });
    }

    document.querySelectorAll(".preset-btn[data-veczoom]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const zoomVal = parseFloat(btn.getAttribute("data-veczoom"));
        applyVecZoom(zoomVal);
      });
    });

    // Mouse wheel zoom on Vectorizer viewport & canvas
    const vecViewport = document.getElementById("vec-viewport");
    if (vecViewport) {
      vecViewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        const oldScale = vecState.scale || 1.5;
        const zoomFactor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
        let newScale = Math.round((oldScale * zoomFactor) * 100) / 100;
        newScale = Math.max(0.4, Math.min(8.0, newScale));
        if (Math.abs(newScale - oldScale) < 0.01) return;

        const vpRect = vecViewport.getBoundingClientRect();
        const vecCanvasWrap = document.querySelector(".vectorizer-canvas-wrap");
        const wrapRect = vecCanvasWrap ? vecCanvasWrap.getBoundingClientRect() : vpRect;

        const mouseX = e.clientX - vpRect.left;
        const mouseY = e.clientY - vpRect.top;

        // Position on the deed relative to canvas top-left
        const canvasX = Math.max(0, Math.min(wrapRect.width, e.clientX - wrapRect.left));
        const canvasY = Math.max(0, Math.min(wrapRect.height, e.clientY - wrapRect.top));

        const ratio = newScale / oldScale;
        const newCanvasX = canvasX * ratio;
        const newCanvasY = canvasY * ratio;

        vecState.scale = newScale;
        if (vecZoomSlider) vecZoomSlider.value = newScale;

        renderVecPdfPage(vecState.pageNum).then(() => {
          if (vecCanvasWrap) {
            const newWrapX = vecCanvasWrap.offsetLeft;
            const newWrapY = vecCanvasWrap.offsetTop;
            vecViewport.scrollLeft = Math.max(0, (newWrapX + newCanvasX) - mouseX);
            vecViewport.scrollTop = Math.max(0, (newWrapY + newCanvasY) - mouseY);
          }
        });
      }, { passive: false });
    }

    // Pan navigation helpers: Middle-click drag, Space+drag, or drag on viewport background
    function startVecPan(e) {
      vecState.isPanning = true;
      vecState.panStart = { x: e.clientX, y: e.clientY };
      vecState.scrollStart = { x: vecViewport ? vecViewport.scrollLeft : 0, y: vecViewport ? vecViewport.scrollTop : 0 };
      document.body.style.cursor = "grabbing";
      if (vecDrawCanvas) vecDrawCanvas.style.cursor = "grabbing";
    }

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && vecModal && vecModal.classList.contains("visible")) {
        const tag = (document.activeElement && document.activeElement.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        vecState.isSpacePressed = true;
        if (vecDrawCanvas && !vecState.isDraggingVertex) vecDrawCanvas.style.cursor = "grab";
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        vecState.isSpacePressed = false;
        if (vecDrawCanvas && !vecState.isDraggingVertex && !vecState.isPanning) {
          vecDrawCanvas.style.cursor = "crosshair";
        }
      }
    });

    if (vecViewport) {
      vecViewport.addEventListener("mousedown", (e) => {
        if (e.button === 1 || (e.button === 0 && vecState.isSpacePressed) || (e.target === vecViewport && e.button === 0)) {
          e.preventDefault();
          startVecPan(e);
        }
      });
    }

    window.addEventListener("mousemove", (e) => {
      if (vecState.isPanning && vecViewport) {
        const dx = e.clientX - vecState.panStart.x;
        const dy = e.clientY - vecState.panStart.y;
        vecViewport.scrollLeft = vecState.scrollStart.x - dx;
        vecViewport.scrollTop = vecState.scrollStart.y - dy;
      }
    });

    window.addEventListener("mouseup", () => {
      if (vecState.isPanning) {
        vecState.isPanning = false;
        document.body.style.cursor = "";
        if (vecDrawCanvas) {
          vecDrawCanvas.style.cursor = vecState.isSpacePressed ? "grab" : "crosshair";
        }
      }
    });

    // Outline thickness slider & presets
    const vecThickSlider = document.getElementById("vec-outline-thickness");
    const vecThickVal = document.getElementById("vec-outline-thickness-val");
    if (vecThickSlider && vecThickVal) {
      vecThickSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        vecState.outlineThickness = val;
        vecThickVal.textContent = `${val} px`;
        try { localStorage.setItem("vec_outline_thickness", val); } catch (err) {}
        redrawVecDrawCanvas();
      });
    }

    document.querySelectorAll(".preset-btn[data-vecthick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.getAttribute("data-vecthick"));
        vecState.outlineThickness = val;
        if (vecThickSlider) vecThickSlider.value = val;
        if (vecThickVal) vecThickVal.textContent = `${val} px`;
        try { localStorage.setItem("vec_outline_thickness", val); } catch (err) {}
        redrawVecDrawCanvas();
      });
    });

    // Vertex size slider & presets
    const vecSizeSlider = document.getElementById("vec-vertex-size");
    const vecSizeVal = document.getElementById("vec-vertex-size-val");
    if (vecSizeSlider && vecSizeVal) {
      vecSizeSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        vecState.vertexSize = val;
        vecSizeVal.textContent = `${val} px`;
        try { localStorage.setItem("vec_vertex_size", val); } catch (err) {}
        redrawVecDrawCanvas();
      });
    }

    document.querySelectorAll(".preset-btn[data-vecsize]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.getAttribute("data-vecsize"));
        vecState.vertexSize = val;
        if (vecSizeSlider) vecSizeSlider.value = val;
        if (vecSizeVal) vecSizeVal.textContent = `${val} px`;
        try { localStorage.setItem("vec_vertex_size", val); } catch (err) {}
        redrawVecDrawCanvas();
      });
    });

    // Vertex stroke slider & presets
    const vecStrokeSlider = document.getElementById("vec-vertex-stroke");
    const vecStrokeVal = document.getElementById("vec-vertex-stroke-val");
    if (vecStrokeSlider && vecStrokeVal) {
      vecStrokeSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        vecState.vertexStroke = val;
        vecStrokeVal.textContent = `${val} px`;
        try { localStorage.setItem("vec_vertex_stroke", val); } catch (err) {}
        redrawVecDrawCanvas();
      });
    }

    document.querySelectorAll(".preset-btn[data-vecstroke]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.getAttribute("data-vecstroke"));
        vecState.vertexStroke = val;
        if (vecStrokeSlider) vecStrokeSlider.value = val;
        if (vecStrokeVal) vecStrokeVal.textContent = `${val} px`;
        try { localStorage.setItem("vec_vertex_stroke", val); } catch (err) {}
        redrawVecDrawCanvas();
      });
    });

    // Hollow vertex checkbox
    const vecHollowChk = document.getElementById("vec-vertex-hollow");
    if (vecHollowChk) {
      vecHollowChk.addEventListener("change", (e) => {
        vecState.vertexHollow = e.target.checked;
        try { localStorage.setItem("vec_vertex_hollow", e.target.checked); } catch (err) {}
        redrawVecDrawCanvas();
      });
    }

    // PDF page navigation
    const btnVecPrev = document.getElementById("btn-vec-prev-page");
    const btnVecNext = document.getElementById("btn-vec-next-page");
    if (btnVecPrev) {
      btnVecPrev.addEventListener("click", () => {
        if (vecState.pageNum > 1) {
          renderVecPdfPage(vecState.pageNum - 1);
        }
      });
    }
    if (btnVecNext) {
      btnVecNext.addEventListener("click", () => {
        if (vecState.pdfDoc && vecState.pageNum < vecState.pdfDoc.numPages) {
          renderVecPdfPage(vecState.pageNum + 1);
        }
      });
    }

    // PDF File Browse
    const vecPdfFileInput = document.getElementById("vec-pdf-file-input");
    if (vecPdfFileInput) {
      vecPdfFileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await loadPdfFromBlob(file);
        if (state.histPdfDoc) {
          vecState.pdfDoc = state.histPdfDoc;
          renderVecPdfPage(1);
        }
      });
    }

    // DXF File Browse / Upload for Vectorizer
    function handleVecDxfUpload(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const text = evt.target.result;
          const ents = DXFParser.parse(text);
          if (!ents || ents.length === 0) {
            alert("No polygon entities found in the selected DXF file.");
            return;
          }
          state.histEntities = ents;
          state.histFileName = file.name;
          if (histStatus) histStatus.textContent = `Deed DXF: ${ents.length} entities (${file.name})`;

          vecState.polygons = ents.map((ent, idx) => ({
            id: idx + 1,
            name: ent.layer || `Polygon_${idx + 1}`,
            color: anchorColors[idx % anchorColors.length] || "#ff1744",
            closed: ent.closed !== false,
            points: (ent.points || []).map(p => ({ x: p.x, y: p.y }))
          }));
          if (vecState.polygons.length === 0) {
            vecState.polygons.push({ id: 1, name: "Polygon_1", color: "#ff1744", closed: true, points: [] });
          }
          vecState.activePolyIndex = 0;
          renderVecPolygonList();
          redrawVecDrawCanvas();
          updateStatus(`📂 Uploaded DXF '${file.name}' into Vectorizer (${ents.length} entities loaded).`);
        } catch (err) {
          console.error("Error parsing DXF file:", err);
          alert("Failed to parse DXF file: " + err.message);
        }
      };
      reader.readAsText(file);
    }

    const vecDxfFileInput = document.getElementById("vec-dxf-file-input");
    if (vecDxfFileInput) {
      vecDxfFileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleVecDxfUpload(file);
        e.target.value = "";
      });
    }

    const vecDxfFileInputSide = document.getElementById("vec-dxf-file-input-side");
    if (vecDxfFileInputSide) {
      vecDxfFileInputSide.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) handleVecDxfUpload(file);
        e.target.value = "";
      });
    }

    // Hook Deed Header button and Sidebar button to open Vectorizer
    const btnEditDeedHist = document.getElementById("btn-edit-deed-hist");
    if (btnEditDeedHist) {
      btnEditDeedHist.addEventListener("click", (e) => {
        e.stopPropagation();
        openVectorizerModal(state.activeDeed || "1073");
      });
    }
    // [/SECTION: JS_VECTORIZER_LOGIC]
