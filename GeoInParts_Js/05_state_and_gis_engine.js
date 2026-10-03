
    // ============================================================================
    // [SECTION: JS_STATE_AND_GIS_ENGINE]
    // ============================================================================
    /* ==========================================================================
       4. APPLICATION LOGIC & DUAL-CANVAS RENDERING ENGINE
       ========================================================================== */
    const state = {
      activeDeed: "1073",
      deeds: {
        "1073": {
          algorithm: "SIMILARITY",
          histEntities: [],
          histPdfDoc: null,
          histPdfBlob: null,
          histPdfCanvas: null,
          histPdfW: 0,
          histPdfH: 0,
          histFileName: "Polygon_Escritura1073_FerminSuarez.dxf",
          pdfFileName: "Mapa1073_FerminSuarez.pdf",
          anchorsFileName: "anchors_georectifier.json",
          anchors: [],
          histViewport: null,
          testAxes: []
        },
        "196": {
          algorithm: "TPS",
          histEntities: [],
          histPdfDoc: null,
          histPdfBlob: null,
          histPdfCanvas: null,
          histPdfW: 0,
          histPdfH: 0,
          histFileName: "Polygon_Escritura196.dxf",
          pdfFileName: "Mapa196_ErrorCasaDelSol.pdf",
          anchorsFileName: "anchors_196.json",
          anchors: [],
          histViewport: null,
          testAxes: []
        }
      },
      deedScale: { x: 1.0, y: 1.0, ratio: 1.0 },
      lockAspectEquivalent: false,
      showDeedHandles: false,
      activeDeedHandle: null,
      hoveredDeedHandle: null,
      deedDragStart: null,
      histEntities: [],      // DXF from Polygon_Escritura1073_FerminSuarez.dxf (deed coord space)
      trueEntities: [],      // DXF from CercoCampo_CristianCortes_Marz_2019.dxf (GIS UTM coord space)
      anchors: [],
      anchorPhotoSize: 180,
      pendingSource: null,
      algorithm: "SIMILARITY", // Default: Helmert = the PowerPoint method
      toolMode: "pan",
      showOverlay: true,
      showGeoTiff: true,
      showWarpedPdf: true,
      showMojones1073: true,
      showWarpedDxf: true,
      showTrueDxf: false,
      showSurveyValoy2025: false,
      showSurveyCortez2025: false,
      surveyValoy2025Entities: [],
      surveyCortez2025Entities: [],
      histViewport: { scale: 1.0, offsetX: 0, offsetY: 0, bbox: null },
      trueViewport: { scale: 1.0, offsetX: 0, offsetY: 0, bbox: null },
      geoTiff: null,
      geotiffFullRes: false,   // false = fast 4K downsampled display; true = full native resolution
      lastGeoTiffBlob: null,   // cached blob for instant resolution toggling without re-downloading
      geoTiffOpacity: 1.0,     // Drone TIF slider set to 100% by default
      warpedPdfOpacity: 0.66,  // deed PDF image: 34% opacity = 66% transparent
      deedMeshRes: 64,         // Piecewise triangle mesh resolution (64 subdivisions on longest axis - finest)
      showDeedMeshWireframe: false, // Wireframe overlay: false by default
      warpedDxfOpacity: 0.9,   // deed DXF drawn on true field canvas
      trueDxfOpacity: 0.5,     // Field DXF opacity slider set to 50% by default
      surveyValoy2025Opacity: 0.5,
      surveyCortez2025Opacity: 0.5,
      histPdfCanvas: null,     // offscreen canvas: rendered Mapa1073_FerminSuarez.pdf
      histPdfW: 0,             // PDF width in PDF-space pts
      histPdfH: 0,
      // Hand-crafted user polygon (Distance & Area panel)
      userPolygon: {
        vertices: [],          // [{x, y, deedPt, origX, origY}] in GIS world space
        segmentLengths: [],    // parallel array: deed length (m) or null
        closed: false,
        drawMode: false,
        show: true,
        fillColor: "#00e5ff",
        fillOpacity: 0.08,
      },
      draggingUserPolyNode: null,
      hoverPolyNode: null,
      hoverPolySegment: null,
      currentSnapTarget: null,
      showSegmentLabels: false,
      // Autonomous Custom Field Polygons (Custom Polygons Panel)
      customPolygons: [
        {
          id: 'poly_1',
          name: 'Polygon 1',
          color: '#ffb300',
          vertices: [],          // [{ x, y, anchor: { type: 'boundary'|'field'|'deed'|'custom', vertexIdx?: number, entIdx?: number, ptIdx?: number } | null }]
          closed: false,
          drawMode: false,
          showNodes: true,
          showLabels: true,
          snapEnabled: true,
          visible: true
        }
      ],
      activeCustomPolyIndex: 0,
      customPolygon: null,
      draggingCustomPolyNode: null,
      hoverCustomPolyNode: null,
      hoverCustomPolySegment: null,
      customPolySnapTarget: null,
      customPolyCursorPt: null,
      showDeedPanel: false,     // Deed map panel (hidden by default)
      showFieldPanel: true,     // Field map panel (active by default)
      sidebarVisible: true,     // Control Panel sidebar (active by default)
      // Boundary Optimization
      optBufferRadius: 3.0,    // pen buffer radius in meters
      optBalance: 50,          // 0 = dist, 50 = balanced, 100 = area
      showBufferDisks: false,  // render buffer halos and displacement vectors
      showCorridor104: false,  // render ±1.04m IGAC paper tolerance corridor
      showCorridor520: false,  // render ±5.20m IGAC rural forest tolerance corridor
      corridorOpacity: 0.5,    // opacity of IGAC corridor ribbons (0.0 .. 1.0)
      tuningAnchorsActive: false,
      tuningCancelRequested: false,
      tuningAnchorCenters: null,   // Active exploration centers during auto-tune simulation
      // Anchor field vertex constraint
      constrainAnchorsToField: true,
      // Polygon deed vertex constraint
      constrainPolyToDeed: true,
      sectionStyles: {},
      defaultPolyStyle: { color: '#0066ff', dash: 'solid', width: 3.5, showNodes: false },
      // Deed DXF vertex editing on field panel & historical panel
      histFileName: "Polygon_Escritura1073_FerminSuarez.dxf",
      editDeedNodes: false,
      draggingDeedNode: null,      // { entIdx, ptIdx, origDeedPt: {x,y}, origFieldPt: {x,y} }
      hoverDeedNode: null,         // { entIdx, ptIdx, deedPt: {x,y}, warpedPt: {x,y} }
      draggingDeedNodeHist: null,  // { entIdx, ptIdx, origDeedPt: {x,y} }
      // Field DXF vertex editing
      trueFileName: "CercoCampo_CristianCortes_Marz_2019.dxf",
      editFieldNodes: false,
      draggingFieldNode: null,     // { entIdx, ptIdx, origFieldPt: {x,y} }
      hoverFieldNode: null,        // { entIdx, ptIdx, fieldPt: {x,y}, screenPt: {x,y} }
      // Temporary reference markers on field canvas
      tempMarkers: [],             // [ { id: 1, label: "M1", x: utmX, y: utmY } ]
      tempMarkerCounter: 0,
      markerToolActive: false,
      draggingTempMarker: null,    // { idx, marker, origPt: {x,y} }
      hoverTempMarker: null,       // { idx, marker, screenPt }
      // Test Axes for 1D Parametric Hypothesis Optimization
      testAxes: [],                // [ { id: 1, name: "Axis 1", p1: {x,y}, p2: {x,y}, color: "#e040fb", visible: true } ]
      testAxisCounter: 0,
      creatingTestAxis: false,
      testAxisDrawStart: null,     // { x, y } Point A during creation
      testAxisCursorPt: null,      // live mouse position during creation
      draggingTestAxisHandle: null,// { axisId, handle: 'p1'|'p2' }
      hoverTestAxisHandle: null,   // { axisId, handle: 'p1'|'p2' }
      snapNewAnchorsToAxis: true,
      optAlongAxisOnly: false,
      optCasaDelSolOnly: false,
      // Layer & Polygon Visual Styles
      styleDeedDxf: {
        color: "#ff1744",
        dash: "dotted",  // Deed DXF: dotted line
        width: 3.0,
        showNodes: false,
      },
      styleTrueDxf: {
        color: "#00e676",
        dash: "solid",
        width: 2.0,
        showNodes: false,
      },
      styleSurveyValoy2025: {
        color: "#ffb300",
        dash: "solid",
        width: 2.0,
        showNodes: false,
      },
      styleSurveyCortez2025: {
        color: "#00e5ff",
        dash: "solid",
        width: 2.0,
        showNodes: false,
      },
      stylePolyDeed: {
        color: "#ff1744", // With Deed Lengths: red color
        dash: "solid",
        width: 3.5,       // 3.5 px
        showNodes: false, // do not display nodes
        useErrorColors: false,
      },
      stylePolyNoDeed: {
        color: "#0066ff", // No Deed Lengths (Field): solid blue line with 4px
        dash: "solid",
        width: 4.0,
        showNodes: false, // Default: nodes hidden on non-deed segments
      },
      // Temporary Reference DXF files loaded for visual reference
      refDxfFiles: [],
      // Measuring tool (distances & areas between sequential clicks on true canvas)
      measureTool: {
        active: false,
        points: [],
        cursorPt: null,
        closed: false,
        snapEnabled: true
      },
      draggingMeasureMarker: null,
      hoverMeasureMarker: null,
    };

    const CUSTOM_POLY_PALETTE = ["#ffb300", "#00e5ff", "#76ff03", "#e040fb", "#ff5252", "#ffd600", "#18ffff", "#ff6e40", "#b388ff", "#69f0ae"];
    state.customPolygon = state.customPolygons[0];

    function hexToRgba(hex, alpha) {
      if (!hex || typeof hex !== 'string') return `rgba(255, 179, 0, ${alpha})`;
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      if (isNaN(num)) return `rgba(255, 179, 0, ${alpha})`;
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const anchorColors = ["#ff1744","#00e676","#00e5ff","#ff9100","#d500f9","#ffff00","#76ff03","#f50057"];

    function getActiveAnchors(anchors = state.anchors) {
      if (!anchors) return [];
      return anchors.filter(a => a.active !== false && a.enabled !== false);
    }

    /**
     * Auto-relaxes floating guide anchors (anchors snapped to an axis with optimize:false).
     * Solves as a zero-force "bead on a wire" (orthogonal projection onto the axis).
     */
    function updateFloatingGuideAnchors() {
      if (!state.anchors || state.anchors.length === 0) return false;
      const active = getActiveAnchors();
      const floating = active.filter(a => a.axisId != null && a.optimize !== true);
      if (floating.length === 0) return false;

      // Base anchors: active anchors that are NOT floating guides
      const base = active.filter(a => !(a.axisId != null && a.optimize !== true));
      let warper = null;
      if (base.length >= 2) {
        try { warper = TransformMath.createWarper(state.algorithm, base); } catch (_) {}
      }
      if (!warper && active.length >= 2) {
        try { warper = TransformMath.createWarper(state.algorithm, active); } catch (_) {}
      }
      if (!warper) return false;

      let anyChanged = false;
      floating.forEach(anc => {
        const ax = (state.testAxes || []).find(a => a.id === anc.axisId);
        if (ax) {
          const pNat = warper(anc.src);
          const pr = projectPointOnAxis(pNat, ax);
          const clampedT = Math.max(0.0, Math.min(1.0, pr.t));
          if (anc.axisT !== clampedT || Math.hypot(anc.dst.x - pr.projPt.x, anc.dst.y - pr.projPt.y) > 0.001) {
            anc.axisT = clampedT;
            anc.dst = { x: pr.projPt.x, y: pr.projPt.y };
            anyChanged = true;
          }
        }
      });
      return anyChanged;
    }

    const histCanvas = document.getElementById("hist-canvas");
    const histCtx    = histCanvas.getContext("2d");
    const trueCanvas = document.getElementById("true-canvas");
    const trueCtx    = trueCanvas.getContext("2d");

    const histInput       = document.getElementById("hist-dxf-input");
    const trueInput       = document.getElementById("true-dxf-input");
    const algorithmSelect = document.getElementById("algorithm-select");
    const btnExportDxf    = document.getElementById("btn-export-dxf");
    const btnClearAnchors = document.getElementById("btn-clear-anchors");
    const histStatus      = document.getElementById("hist-status");
    const trueStatus      = document.getElementById("true-status");
    const rmseDisplay     = document.getElementById("rmse-display");
    const anchorTableBody = document.getElementById("anchor-table-body");
    const chkShowOverlay  = document.getElementById("chk-show-overlay");
    const statusBar       = document.getElementById("status-bar");
    const coordsBar       = document.getElementById("coords-bar");

    // ── Bounding box & viewport helpers ───────────────────────────────
    function computeBoundingBox(entities) {
      const allPoints = [];
      entities.forEach(ent => ent.points.forEach(pt => allPoints.push(pt)));
      if (allPoints.length === 0) return { minX:0, minY:0, maxX:100, maxY:100, width:100, height:100 };
      
      // If real GIS project coordinates (> 100,000m) exist, ignore all template origin/anchor points (0,0)
      const gisPoints = allPoints.filter(p => Math.abs(p.x) > 100000 || Math.abs(p.y) > 100000);
      const pts = gisPoints.length > 0 ? gisPoints : allPoints.filter(p => Math.abs(p.x) > 1e-4 || Math.abs(p.y) > 1e-4);
      const working = pts.length > 0 ? pts : allPoints;

      const xs = working.map(p => p.x).sort((a,b) => a-b);
      const ys = working.map(p => p.y).sort((a,b) => a-b);
      const mid = n => Math.floor(n/2);
      const q1X = xs[Math.floor(xs.length*0.25)], q3X = xs[Math.floor(xs.length*0.75)];
      const q1Y = ys[Math.floor(ys.length*0.25)], q3Y = ys[Math.floor(ys.length*0.75)];
      const iqrX = Math.max(q3X-q1X,1), iqrY = Math.max(q3Y-q1Y,1);
      const mX = xs[mid(xs.length)], mY = ys[mid(ys.length)];
      const clean = working.filter(p => Math.abs(p.x-mX) <= 4.5*iqrX && Math.abs(p.y-mY) <= 4.5*iqrY);
      const final = clean.length > 0 ? clean : working;
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      final.forEach(p => { if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y; });
      if (minX===Infinity||minX===maxX) return {minX:0,minY:0,maxX:100,maxY:100,width:100,height:100};
      return { minX, minY, maxX, maxY, width:maxX-minX, height:maxY-minY };
    }

    function fitViewport(canvas, bbox) {
      const pad = 40, w = canvas.width-pad*2, h = canvas.height-pad*2;
      const scale = Math.min(w/(bbox.width||1), h/(bbox.height||1));
      return {
        scale,
        offsetX: pad + (w - bbox.width*scale)/2 - bbox.minX*scale,
        offsetY: pad + (h - bbox.height*scale)/2 - bbox.minY*scale,
        bbox
      };
    }

    // Historical panel: PDF/deed-space coords (Y grows downward in canvas, no flip)
    // Historical panel: PDF/deed-space coords (Y grows downward in canvas, no flip)
    function worldToScreen(pt, vp, canvasH) {
      return { x: pt.x * vp.scale + vp.offsetX, y: pt.y * vp.scale + vp.offsetY };
    }
    function screenToWorld(sx, sy, vp, canvasH) {
      return { x: Math.round((sx - vp.offsetX) / vp.scale * 100) / 100, y: Math.round((sy - vp.offsetY) / vp.scale * 100) / 100 };
    }

    // True-field panel: GIS/UTM-space coords (Y increases northward, so we flip)
    function worldToScreenGIS(pt, vp, canvasH) {
      return { x: pt.x * vp.scale + vp.offsetX, y: canvasH - (pt.y * vp.scale + vp.offsetY) };
    }
    function screenToWorldGIS(sx, sy, vp, canvasH) {
      return { x: Math.round((sx - vp.offsetX) / vp.scale * 100) / 100, y: Math.round((canvasH - sy - vp.offsetY) / vp.scale * 100) / 100 };
    }

    function fitHistoricalView() {
      if (!histCanvas || histCanvas.width <= 0) return;
      if (state.histPdfW > 0) {
        state.histViewport = fitViewport(histCanvas, { minX: 0, minY: 0, maxX: state.histPdfW, maxY: state.histPdfH, width: state.histPdfW, height: state.histPdfH });
      } else if (state.histEntities && state.histEntities.length > 0) {
        state.histViewport = fitViewport(histCanvas, computeBoundingBox(state.histEntities));
      }
    }

    function fitTrueFieldView() {
      if (!trueCanvas || trueCanvas.width <= 0) return;
      if (state.trueEntities && state.trueEntities.length > 0) {
        state.trueViewport = fitViewport(trueCanvas, computeBoundingBox(state.trueEntities));
      } else if (state.geoTiff && state.geoTiff.bbox) {
        state.trueViewport = fitViewport(trueCanvas, state.geoTiff.bbox);
      }
    }

    // ── Canvas resize ─────────────────────────────────────────────────
    function resizeCanvases() {
      const hc = document.getElementById("hist-container");
      const tc = document.getElementById("true-container");
      const histCard = document.getElementById("hist-card");
      const trueCard = document.getElementById("true-card");

      if (histCard && !histCard.classList.contains("hidden") && hc && hc.clientWidth > 0 && hc.clientHeight > 0) {
        histCanvas.width  = hc.clientWidth;
        histCanvas.height = hc.clientHeight;
      }
      if (trueCard && !trueCard.classList.contains("hidden") && tc && tc.clientWidth > 0 && tc.clientHeight > 0) {
        trueCanvas.width  = tc.clientWidth;
        trueCanvas.height = tc.clientHeight;
      }

      if ((!state.histViewport.bbox || state.histViewport.scale <= 0) && histCanvas.width > 0) {
        if (state.histEntities.length > 0)
          state.histViewport = fitViewport(histCanvas, computeBoundingBox(state.histEntities));
        else if (state.histPdfCanvas)
          state.histViewport = fitViewport(histCanvas, {minX:0,minY:0,maxX:state.histPdfW,maxY:state.histPdfH,width:state.histPdfW,height:state.histPdfH});
      }
      if ((!state.trueViewport.bbox || state.trueViewport.scale <= 0) && trueCanvas.width > 0) {
        if (state.trueEntities.length > 0)
          state.trueViewport = fitViewport(trueCanvas, computeBoundingBox(state.trueEntities));
        else if (state.geoTiff)
          state.trueViewport = fitViewport(trueCanvas, state.geoTiff.bbox);
      }
      redrawAll();
    }
    window.addEventListener("resize", resizeCanvases);

    // ── Redraw ────────────────────────────────────────────────────────
    function redrawAll() {
      updateFloatingGuideAnchors();
      const histCard = document.getElementById("hist-card");
      const trueCard = document.getElementById("true-card");
      if (!histCard || !histCard.classList.contains("hidden")) {
        redrawHistoricalCanvas();
      }
      if (!trueCard || !trueCard.classList.contains("hidden")) {
        redrawTrueCanvas();
      }
      updateAnalyticsUI();
    }

    function drawGrid(ctx, w, h, isLight = false) {
      ctx.strokeStyle = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x=0;x<w;x+=40){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke(); }
      for (let y=0;y<h;y+=40){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke(); }
    }

    // Draw a GeoTIFF background using GIS (Y-flip) coordinates
    function drawGeoTiff(ctx, tiff, vp, canvasH, opacity) {
      if (!tiff||!tiff.offscreen||!tiff.bbox) return;
      if (state.showGeoTiff === false) return;
      const tl = worldToScreenGIS({x:tiff.bbox.minX, y:tiff.bbox.maxY}, vp, canvasH);
      const br = worldToScreenGIS({x:tiff.bbox.maxX, y:tiff.bbox.minY}, vp, canvasH);
      const x=Math.min(tl.x,br.x), y=Math.min(tl.y,br.y);
      const sw=Math.abs(br.x-tl.x), sh=Math.abs(br.y-tl.y);
      if (sw<=0||sh<=0) return;
      ctx.save(); ctx.globalAlpha=opacity; ctx.drawImage(tiff.offscreen,x,y,sw,sh); ctx.restore();
    }

    // Draw entities in deed-space (historical panel)
    function drawEntities(ctx, entities, vp, canvasH, color, opacity) {
      if (!entities.length) return;
      const style = state.styleDeedDxf;
      const strokeCol = (style && style.color) ? style.color : color;
      const lineW = (style && style.width) ? style.width : 2.5;
      const dash = (style && style.dash === "dashed") ? [6, 4] : ((style && style.dash === "dotted") ? [2, 3] : []);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lineW;
      ctx.setLineDash(dash);

      entities.forEach(ent => {
        if (ent.points.length < 2) return;
        ctx.beginPath();
        const s = worldToScreen(ent.points[0], vp, canvasH);
        ctx.moveTo(s.x, s.y);
        for (let i=1;i<ent.points.length;i++) { const p=worldToScreen(ent.points[i],vp,canvasH); ctx.lineTo(p.x,p.y); }
        if (ent.closed) ctx.closePath();
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Draw vertex dots if showNodes is enabled on Deed DXF
      if (style && style.showNodes) {
        ctx.fillStyle = strokeCol;
        entities.forEach(ent => {
          (ent.points || []).forEach(pt => {
            const p = worldToScreen(pt, vp, canvasH);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(3.5, lineW + 1.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        });
      }

      // If Edit Deed Nodes is active, render interactive vertex handles on historical canvas
      if (state.editDeedNodes) {
        entities.forEach((ent, entIdx) => {
          (ent.points || []).forEach((pt, ptIdx) => {
            const p = worldToScreen(pt, vp, canvasH);
            const isHover = state.hoverDeedNode && state.hoverDeedNode.entIdx === entIdx && state.hoverDeedNode.ptIdx === ptIdx;
            const isDrag = (state.draggingDeedNode && state.draggingDeedNode.entIdx === entIdx && state.draggingDeedNode.ptIdx === ptIdx) ||
                           (state.draggingDeedNodeHist && state.draggingDeedNodeHist.entIdx === entIdx && state.draggingDeedNodeHist.ptIdx === ptIdx);

            ctx.beginPath();
            ctx.arc(p.x, p.y, isDrag ? 8.5 : (isHover ? 7 : 5), 0, Math.PI * 2);
            ctx.fillStyle = isDrag ? "#ffd600" : (isHover ? "#ff9100" : "#ff1744");
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = isDrag || isHover ? 2 : 1.2;
            ctx.stroke();
          });
        });
      }
      ctx.restore();
    }

    // Draw entities in GIS-space (true-field panel, unwarped)
    function drawEntitiesGIS(ctx, entities, vp, canvasH, color, opacity, customStyle) {
      if (!entities || !entities.length) return;
      const style = customStyle || state.styleTrueDxf;
      const strokeCol = (style && style.color) ? style.color : color;
      const lineW = (style && style.width) ? Number(style.width) : 2;
      const dash = (style && style.dash === "dashed") ? [6, 4] : ((style && style.dash === "dotted") ? [2, 3] : []);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lineW;
      ctx.setLineDash(dash);

      entities.forEach(ent => {
        if (ent.points.length < 2) return;
        ctx.beginPath();
        const s = worldToScreenGIS(ent.points[0], vp, canvasH);
        ctx.moveTo(s.x, s.y);
        for (let i=1;i<ent.points.length;i++) { const p=worldToScreenGIS(ent.points[i],vp,canvasH); ctx.lineTo(p.x,p.y); }
        if (ent.closed) ctx.closePath();
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Draw vertex dots if showNodes is enabled on Field DXF
      if (style && style.showNodes) {
        ctx.fillStyle = strokeCol;
        entities.forEach(ent => {
          (ent.points || []).forEach(pt => {
            const p = worldToScreenGIS(pt, vp, canvasH);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(3.5, lineW + 1.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        });
      }

      // If Edit Field Nodes is active, render interactive vertex handles and drift feedback on Field DXF
      if (state.editFieldNodes && entities === state.trueEntities) {
        entities.forEach((ent, entIdx) => {
          (ent.points || []).forEach((pt, ptIdx) => {
            const p = worldToScreenGIS(pt, vp, canvasH);
            const isHover = state.hoverFieldNode && state.hoverFieldNode.entIdx === entIdx && state.hoverFieldNode.ptIdx === ptIdx;
            const isDrag = state.draggingFieldNode && state.draggingFieldNode.entIdx === entIdx && state.draggingFieldNode.ptIdx === ptIdx;

            // Vertex handle dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, isDrag ? 8.5 : (isHover ? 7 : 5), 0, Math.PI * 2);
            ctx.fillStyle = isDrag ? "#ffd600" : (isHover ? "#00e5ff" : "#00e676");
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = isDrag || isHover ? 2 : 1.2;
            ctx.stroke();

            // If actively dragging, draw drift line & tolerance label from original position
            if (isDrag && state.draggingFieldNode.origFieldPt) {
              const origScr = worldToScreenGIS(state.draggingFieldNode.origFieldPt, vp, canvasH);
              const driftM = Math.hypot(pt.x - state.draggingFieldNode.origFieldPt.x, pt.y - state.draggingFieldNode.origFieldPt.y);

              // Original anchor spot
              ctx.beginPath();
              ctx.arc(origScr.x, origScr.y, 4, 0, Math.PI * 2);
              ctx.fillStyle = "rgba(0, 230, 118, 0.6)";
              ctx.fill();

              // Vector drift line
              ctx.beginPath();
              ctx.moveTo(origScr.x, origScr.y);
              ctx.lineTo(p.x, p.y);
              ctx.strokeStyle = "#ffd600";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.stroke();
              ctx.setLineDash([]);

              // Drift badge
              const tag = `Δ ${driftM.toFixed(2)}m (field shift)`;
              ctx.font = "bold 10px monospace";
              const tw = ctx.measureText(tag).width;
              ctx.fillStyle = "rgba(6, 9, 15, 0.88)";
              ctx.fillRect(p.x + 10, p.y - 8, tw + 8, 14);
              ctx.strokeStyle = "#ffd600";
              ctx.lineWidth = 1;
              ctx.strokeRect(p.x + 10, p.y - 8, tw + 8, 14);
              ctx.fillStyle = "#ffd600";
              ctx.fillText(tag, p.x + 14, p.y + 3);
            }
          });
        });
      }

      ctx.restore();
    }

    // Draw temporary reference markers on the true-field canvas
    function drawTempMarkersGIS(ctx, vp, canvasH) {
      if (!state.tempMarkers || state.tempMarkers.length === 0) return;
      ctx.save();
      state.tempMarkers.forEach(m => {
        const sp = worldToScreenGIS(m, vp, canvasH);
        const isHover = state.hoverTempMarker && state.hoverTempMarker.id === m.id;
        const isDrag = state.draggingTempMarker && state.draggingTempMarker.id === m.id;

        // Outer glow on hover / drag
        if (isHover || isDrag) {
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
          ctx.fill();
        }

        // Pin marker
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, isDrag ? 8.5 : (isHover ? 7.5 : 5.5), 0, Math.PI * 2);
        ctx.fillStyle = isDrag ? "#ffd600" : (isHover ? "#ffb300" : "#f59e0b");
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pin center dot
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Pin label pill
        const label = m.label || `M${m.id}`;
        ctx.font = "bold 10px 'Segoe UI', monospace";
        const tw = ctx.measureText(label).width;
        const bx = sp.x - tw / 2 - 4;
        const by = sp.y - 20;

        ctx.fillStyle = isHover || isDrag ? "rgba(245, 158, 11, 0.95)" : "rgba(18, 24, 38, 0.9)";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, tw + 8, 14, 3);
        else ctx.rect(bx, by, tw + 8, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHover || isDrag ? "#000000" : "#ffd54f";
        ctx.fillText(label, bx + 4, by + 10.5);

        // Coordinates badge if hovered or dragged
        if (isHover || isDrag) {
          const coordText = `${m.x.toFixed(2)}, ${m.y.toFixed(2)}`;
          ctx.font = "9px monospace";
          const cw = ctx.measureText(coordText).width;
          const cx = sp.x - cw / 2 - 4;
          const cy = sp.y + 11;
          ctx.fillStyle = "rgba(6, 9, 15, 0.92)";
          ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cx, cy, cw + 8, 13, 2);
          else ctx.rect(cx, cy, cw + 8, 13);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.fillText(coordText, cx + 4, cy + 9.5);
        }
      });
      ctx.restore();
    }

    // Draw deed DXF warped into GIS space on the true-field panel
    function drawWarpedEntitiesGIS(ctx, entities, warper, vp, canvasH, color, opacity) {
      if (!entities.length || !warper) return;
      const style = state.styleDeedDxf;
      const strokeCol = (style && style.color) ? style.color : color;
      const lineW = (style && style.width) ? style.width : 3;
      const dash = (style && style.dash === "dashed") ? [6, 4] : ((style && style.dash === "dotted") ? [2, 3] : []);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lineW;
      ctx.setLineDash(dash);

      entities.forEach(ent => {
        if (ent.points.length < 2) return;
        ctx.beginPath();
        const ws = warper(ent.points[0]);
        const s  = worldToScreenGIS(ws, vp, canvasH);
        ctx.moveTo(s.x, s.y);
        for (let i=1;i<ent.points.length;i++) {
          const wpt = warper(ent.points[i]);
          const p   = worldToScreenGIS(wpt, vp, canvasH);
          ctx.lineTo(p.x, p.y);
        }
        if (ent.closed) ctx.closePath();
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Draw vertex dots if showNodes is enabled on Deed DXF
      if (style && style.showNodes) {
        ctx.fillStyle = strokeCol;
        entities.forEach(ent => {
          (ent.points || []).forEach(pt => {
            const wpt = warper(pt);
            const p = worldToScreenGIS(wpt, vp, canvasH);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(3.5, lineW + 1.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        });
      }

      // If Edit Deed Nodes is active, render interactive vertex handles and drift feedback
      if (state.editDeedNodes) {
        entities.forEach((ent, entIdx) => {
          (ent.points || []).forEach((pt, ptIdx) => {
            const wpt = warper(pt);
            const p = worldToScreenGIS(wpt, vp, canvasH);
            const isHover = state.hoverDeedNode && state.hoverDeedNode.entIdx === entIdx && state.hoverDeedNode.ptIdx === ptIdx;
            const isDrag = state.draggingDeedNode && state.draggingDeedNode.entIdx === entIdx && state.draggingDeedNode.ptIdx === ptIdx;

            // Vertex handle dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, isDrag ? 8.5 : (isHover ? 7 : 5), 0, Math.PI * 2);
            ctx.fillStyle = isDrag ? "#ffd600" : (isHover ? "#ff9100" : "#ff1744");
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = isDrag || isHover ? 2 : 1.2;
            ctx.stroke();

            // If actively dragging, draw drift line & tolerance label from original position
            if (isDrag && state.draggingDeedNode.origFieldPt) {
              const origScr = worldToScreenGIS(state.draggingDeedNode.origFieldPt, vp, canvasH);
              const driftM = Math.hypot(wpt.x - state.draggingDeedNode.origFieldPt.x, wpt.y - state.draggingDeedNode.origFieldPt.y);

              // Original anchor spot
              ctx.beginPath();
              ctx.arc(origScr.x, origScr.y, 4, 0, Math.PI * 2);
              ctx.fillStyle = "rgba(255, 23, 68, 0.6)";
              ctx.fill();

              // Vector drift line
              ctx.beginPath();
              ctx.moveTo(origScr.x, origScr.y);
              ctx.lineTo(p.x, p.y);
              ctx.strokeStyle = "#ffd600";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.stroke();
              ctx.setLineDash([]);

              // Drift badge
              const tag = `Δ ${driftM.toFixed(2)}m (print drift)`;
              ctx.font = "bold 10px monospace";
              const tw = ctx.measureText(tag).width;
              ctx.fillStyle = "rgba(6, 9, 15, 0.88)";
              ctx.fillRect(p.x + 10, p.y - 8, tw + 8, 14);
              ctx.strokeStyle = "#ffd600";
              ctx.lineWidth = 1;
              ctx.strokeRect(p.x + 10, p.y - 8, tw + 8, 14);
              ctx.fillStyle = "#ffd600";
              ctx.textAlign = "left";
              ctx.fillText(tag, p.x + 14, p.y + 3);
            }
          });
        });
      }

      ctx.restore();
    }

    // ── Helper: Default Anchor Card Offset (Optimized for 180px cards without overlaps) ──
    function getDefaultAnchorOffset(anc, isHist) {
      const id = anc.id != null ? Number(anc.id) : null;
      if (id === 1) {
        // Lower anchor (Mojón 1 Entrada, SW): sits to the left/NW with ample clearance
        return { dx: -215, dy: -60 };
      } else if (id === 2) {
        // Upper anchor (Mojón 2 Lindero NE): sits to the right/NE with ample clearance
        return { dx: 35, dy: -135 };
      } else if (id === 3) {
        return { dx: 35, dy: 25 };
      } else if (id === 4) {
        return { dx: -215, dy: 10 };
      } else if (id === 5) {
        return { dx: 35, dy: -100 };
      }
      return { dx: 25, dy: -25 };
    }

    // ── Helper: Anchor Label Double-Framed Card & Aspect Ratio Bounds ──
    function getAnchorCardBounds(anc, pt, isHist, ctx) {
      const isEnabled = anc.active !== false && anc.enabled !== false;
      const labelName = (anc.name && anc.name.trim()) ? anc.name.trim() : (`#${anc.id}`);
      const fullText = labelName + (isEnabled ? "" : " (off)");
      const defOff = getDefaultAnchorOffset(anc, isHist);
      const defDx = defOff.dx, defDy = defOff.dy;
      const offset = isHist ? anc.labelOffsetSrc : anc.labelOffsetDst;
      const offX = (offset && typeof offset.dx === "number") ? offset.dx : defDx;
      const offY = (offset && typeof offset.dy === "number") ? offset.dy : defDy;

      const hasImg = anc.image && anc._imgElement && anc._imgElement.complete && anc._imgElement.naturalWidth > 0;
      if (hasImg) {
        const natW = anc._imgElement.naturalWidth;
        const natH = anc._imgElement.naturalHeight;
        const baseW = Math.max(50, state.anchorPhotoSize || 80);
        const maxH = Math.max(50, Math.round(baseW * 1.35));
        const scale = Math.min(baseW / natW, maxH / natH);
        const imgW = Math.max(35, Math.round(natW * scale));
        const imgH = Math.max(35, Math.round(natH * scale));

        const padX = 8, padTop = 7, padBottom = 8;
        const headerH = 18;
        const dividerGap = 5;
        const imgGap = 6;
        const fontSize = baseW > 140 ? 13 : (baseW > 95 ? 12 : 11);
        const badgeR = 8.5;

        ctx.save();
        ctx.font = "bold " + fontSize + "px sans-serif";
        const textW = ctx.measureText(fullText).width;
        ctx.restore();

        const cardInnerW = Math.max(imgW, (badgeR * 2) + 6 + textW + 4);
        const cardW = cardInnerW + padX * 2;
        const cardH = padTop + headerH + dividerGap + imgGap + imgH + padBottom;

        let cardX = pt.x + offX;
        let cardY = pt.y + offY - (cardH / 2) + 10;
        let finalOffX = offX, finalOffY = offY;

        const hasCustom = offset && typeof offset.dx === "number" && typeof offset.dy === "number";
        const canvasW = (ctx && ctx.canvas) ? ctx.canvas.width : (isHist ? histCanvas.width : trueCanvas.width);
        const canvasH = (ctx && ctx.canvas) ? ctx.canvas.height : (isHist ? histCanvas.height : trueCanvas.height);
        const margin = 24; // Equal distance from canvas edge for both right/top and left/bottom

        if (!isHist && !hasCustom && anc.id === 1) {
          // Bottom anchor: left side at margin (24px), bottom at canvasH - margin (24px)
          cardX = margin;
          cardY = canvasH - cardH - margin;
          finalOffX = cardX - pt.x;
          finalOffY = cardY - pt.y + (cardH / 2) - 10;
        } else if (!isHist && !hasCustom && anc.id === 2) {
          // Top anchor: top at margin (24px), right side at canvasW - margin (24px)
          cardX = canvasW - cardW - margin;
          cardY = margin;
          finalOffX = cardX - pt.x;
          finalOffY = cardY - pt.y + (cardH / 2) - 10;
        }

        return { cardX, cardY, cardW, cardH, offX: finalOffX, offY: finalOffY };
      } else {
        const padX = 8;
        const cardH = 24;
        const fontSize = 11;
        const badgeR = 8;

        ctx.save();
        ctx.font = "bold " + fontSize + "px sans-serif";
        const textWithIcon = (anc.image ? "📷 " : "") + fullText;
        const textW = ctx.measureText(textWithIcon).width;
        ctx.restore();

        const cardW = (badgeR * 2) + 8 + textW + padX * 2;
        let cardX = pt.x + offX;
        let cardY = pt.y + offY;
        let finalOffX = offX, finalOffY = offY;

        const hasCustom = offset && typeof offset.dx === "number" && typeof offset.dy === "number";
        const canvasW = (ctx && ctx.canvas) ? ctx.canvas.width : (isHist ? histCanvas.width : trueCanvas.width);
        const canvasH = (ctx && ctx.canvas) ? ctx.canvas.height : (isHist ? histCanvas.height : trueCanvas.height);
        const margin = 24;

        if (!isHist && !hasCustom && anc.id === 1) {
          cardX = margin;
          cardY = canvasH - cardH - margin;
          finalOffX = cardX - pt.x;
          finalOffY = cardY - pt.y;
        } else if (!isHist && !hasCustom && anc.id === 2) {
          cardX = canvasW - cardW - margin;
          cardY = margin;
          finalOffX = cardX - pt.x;
          finalOffY = cardY - pt.y;
        }

        return { cardX, cardY, cardW, cardH, offX: finalOffX, offY: finalOffY };
      }
    }

    function getContrastColor(hexColor) {
      if (!hexColor || typeof hexColor !== "string") return "#000000";
      let c = hexColor.trim();
      if (c.startsWith("#")) c = c.slice(1);
      if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      if (c.length !== 6) return "#000000";
      const r = parseInt(c.substr(0, 2), 16) || 0;
      const g = parseInt(c.substr(2, 2), 16) || 0;
      const b = parseInt(c.substr(4, 2), 16) || 0;
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return (yiq >= 140) ? "#000000" : "#ffffff";
    }

    function drawAnchorPin(ctx, anc, pt) {
      const isEnabled = anc.active !== false && anc.enabled !== false;
      const radius = 9.5;
      ctx.save();
      if (!isEnabled) {
        ctx.globalAlpha = 0.38;
      }
      // Circular Badge background
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = anc.color || "#00e5ff";
      ctx.fill();
      ctx.strokeStyle = isEnabled ? "#ffffff" : "#999999";
      ctx.lineWidth = 1.8;
      if (!isEnabled) ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Number with half-sized '#' prefix centered inside badge
      const numStr = String(anc.id != null ? anc.id : "");
      if (numStr) {
        const numSize = numStr.length > 2 ? 8 : (numStr.length > 1 ? 9 : 10);
        const hashSize = Math.round(numSize * 0.52); // half the size of the number

        ctx.fillStyle = getContrastColor(anc.color);
        ctx.textBaseline = "alphabetic";

        // Measure widths to center combined string
        ctx.font = `bold ${hashSize}px sans-serif`;
        const hashW = ctx.measureText("#").width;

        ctx.font = `bold ${numSize}px sans-serif`;
        const numW = ctx.measureText(numStr).width;

        const gap = 0.6;
        const totalW = hashW + gap + numW;
        const startX = pt.x - (totalW / 2);
        const baselineY = pt.y + (numSize * 0.35);

        // Draw '#' at half size, slightly raised
        ctx.font = `bold ${hashSize}px sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText("#", startX, baselineY - (numSize * 0.08));

        // Draw number at full size
        ctx.font = `bold ${numSize}px sans-serif`;
        ctx.fillText(numStr, startX + hashW + gap, baselineY);
      }
      ctx.restore();
    }

    function drawAnchorLabelCard(ctx, anc, pt, isHist) {
      const isEnabled = anc.active !== false && anc.enabled !== false;
      const labelName = (anc.name && anc.name.trim()) ? anc.name.trim() : (`#${anc.id}`);
      const fullText = labelName + (isEnabled ? "" : " (off)");
      if (anc.image && !anc._imgElement) {
        const img = new Image();
        img.onload = () => {
          const c = isHist ? document.getElementById("hist-card") : document.getElementById("true-card");
          if (!c || !c.classList.contains("hidden")) {
            if (isHist) redrawHistoricalCanvas(); else redrawTrueCanvas();
          }
        };
        img.src = anc.image;
        anc._imgElement = img;
      }

      const bounds = getAnchorCardBounds(anc, pt, isHist, ctx);
      const cardX = bounds.cardX;
      const cardY = bounds.cardY;
      const cardW = bounds.cardW;
      const cardH = bounds.cardH;
      const offX = bounds.offX;
      const offY = bounds.offY;

      // Draw 3px connector arrow pointing towards the anchor
      if (Math.hypot(offX, offY) > 20 || (anc.labelOffsetDst && typeof anc.labelOffsetDst.dx === "number")) {
        const startX = Math.max(cardX, Math.min(cardX + cardW, pt.x));
        const startY = Math.max(cardY, Math.min(cardY + cardH, pt.y));
        const dx = pt.x - startX;
        const dy = pt.y - startY;
        const dist = Math.hypot(dx, dy);

        if (dist >= 10) {
          const ux = dx / dist;
          const uy = dy / dist;
          // Target anchor pin perimeter (radius ~7px)
          const tipX = pt.x - ux * 6.5;
          const tipY = pt.y - uy * 6.5;

          const headLen = 12;
          const headHalfW = 6.5;
          const baseX = tipX - ux * headLen;
          const baseY = tipY - uy * headLen;
          const px = -uy;
          const py = ux;

          const arrowCol = isEnabled ? (anc.color || "#00e5ff") : "#888888";

          ctx.save();
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;

          // 3px solid arrow stem
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(baseX + ux * 2, baseY + uy * 2);
          ctx.strokeStyle = arrowCol;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Arrowhead pointing towards the anchor
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(baseX + px * headHalfW, baseY + py * headHalfW);
          ctx.lineTo(baseX - px * headHalfW, baseY - py * headHalfW);
          ctx.closePath();
          ctx.fillStyle = arrowCol;
          ctx.fill();

          ctx.restore();
        }
      }

      const hasImg = anc.image && anc._imgElement && anc._imgElement.complete && anc._imgElement.naturalWidth > 0;

      if (hasImg) {
        const natW = anc._imgElement.naturalWidth;
        const natH = anc._imgElement.naturalHeight;
        const baseW = Math.max(50, state.anchorPhotoSize || 80);
        const maxH = Math.max(50, Math.round(baseW * 1.35));
        const scale = Math.min(baseW / natW, maxH / natH);
        const imgW = Math.max(35, Math.round(natW * scale));
        const imgH = Math.max(35, Math.round(natH * scale));

        const padX = 8, padTop = 7;
        const headerH = 18;
        const dividerGap = 5;
        const imgGap = 6;
        const fontSize = baseW > 140 ? 13 : (baseW > 95 ? 12 : 11);
        const badgeR = 8.5;

        ctx.save();

        // ── Outer Frame (Label Card with Rounded Curvature & Shadow) ──
        ctx.fillStyle = "rgba(11, 20, 36, 0.95)";
        ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 9);
        else ctx.rect(cardX, cardY, cardW, cardH);
        ctx.fill();

        // Outer Frame Cyan Border
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = isEnabled ? "#00e5ff" : "#64748b";
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // ── Header Row ──
        const badgeCenterX = cardX + padX + badgeR;
        const badgeCenterY = cardY + padTop + badgeR;

        // Circular Anchor Color Pin Badge
        ctx.beginPath();
        ctx.arc(badgeCenterX, badgeCenterY, badgeR, 0, Math.PI * 2);
        ctx.fillStyle = anc.color || "#ff1744";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("#" + anc.id, badgeCenterX, badgeCenterY);

        // Header Title in Bold Cyan
        ctx.fillStyle = isEnabled ? "#00e5ff" : "#94a3b8";
        ctx.font = "bold " + fontSize + "px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(fullText, badgeCenterX + badgeR + 6, badgeCenterY);

        // Header Divider Line
        const divY = cardY + padTop + headerH + dividerGap;
        ctx.beginPath();
        ctx.moveTo(cardX + padX, divY);
        ctx.lineTo(cardX + cardW - padX, divY);
        ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── Inner Frame (Image Box with Rounded Curvature & Cyan Border) ──
        const innerX = cardX + (cardW - imgW) / 2;
        const innerY = divY + imgGap;
        const innerR = 7;

        // Draw clipped image inside inner frame (preserving natural aspect ratio)
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(innerX, innerY, imgW, imgH, innerR);
        else ctx.rect(innerX, innerY, imgW, imgH);
        ctx.clip();
        ctx.drawImage(anc._imgElement, innerX, innerY, imgW, imgH);
        ctx.restore();

        // Inner Frame Cyan Border
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(innerX, innerY, imgW, imgH, innerR);
        else ctx.rect(innerX, innerY, imgW, imgH);
        ctx.strokeStyle = "rgba(0, 229, 255, 0.65)";
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.restore();
      } else {
        // ── Compact Badge without image (or loading fallback) ──
        const padX = 8;
        const fontSize = 11;
        const badgeR = 8;
        const textWithIcon = (anc.image ? "📷 " : "") + fullText;

        ctx.save();
        ctx.fillStyle = "rgba(11, 20, 36, 0.94)";
        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 6);
        else ctx.rect(cardX, cardY, cardW, cardH);
        ctx.fill();

        ctx.shadowColor = "transparent";
        ctx.strokeStyle = isEnabled ? "#00e5ff" : "#64748b";
        ctx.lineWidth = 1.3;
        ctx.stroke();

        const badgeCenterX = cardX + padX + badgeR;
        const badgeCenterY = cardY + cardH / 2;
        ctx.beginPath();
        ctx.arc(badgeCenterX, badgeCenterY, badgeR, 0, Math.PI * 2);
        ctx.fillStyle = anc.color || "#ff1744";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("#" + anc.id, badgeCenterX, badgeCenterY);

        ctx.fillStyle = isEnabled ? "#00e5ff" : "#94a3b8";
        ctx.font = "bold " + fontSize + "px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(textWithIcon, badgeCenterX + badgeR + 6, badgeCenterY);
        ctx.restore();
      }
    }

    // ── Historical Canvas ──────────────────────────────────────────────
    function redrawHistoricalCanvas() {
      const w = histCanvas.width, h = histCanvas.height;
      histCtx.clearRect(0,0,w,h);
      drawGrid(histCtx,w,h);
      const vp = state.histViewport;

      // Layer 1: Deed PDF background
      if (state.histPdfCanvas && state.histPdfW > 0) {
        const tl = worldToScreen({ x: 0, y: 0 }, vp, h);
        const br = worldToScreen({ x: state.histPdfW, y: state.histPdfH }, vp, h);
        const sw = br.x - tl.x, sh = br.y - tl.y;
        if (sw > 0 && sh > 0) {
          histCtx.save();
          histCtx.globalAlpha = 0.85;
          histCtx.drawImage(state.histPdfCanvas, tl.x, tl.y, sw, sh);
          histCtx.restore();
        }
      }

      // Layer 2: Deed DXF boundary polygon
      drawEntities(histCtx, state.histEntities, vp, h, "#ff1744", 1.0);

      // Layer 3: Pending source anchor
      if (state.pendingSource) {
        const sp = worldToScreen(state.pendingSource, vp, h);
        histCtx.beginPath(); histCtx.arc(sp.x,sp.y,10,0,Math.PI*2);
        histCtx.strokeStyle="#00e5ff"; histCtx.lineWidth=2.5;
        histCtx.setLineDash([4,4]); histCtx.stroke(); histCtx.setLineDash([]);
        histCtx.beginPath(); histCtx.arc(sp.x,sp.y,4,0,Math.PI*2);
        histCtx.fillStyle="#00e5ff"; histCtx.fill();
      }

      // Layer 4: Source anchor pins with numbers inside (labels omitted in deed window)
      state.anchors.forEach(anc => {
        const sp = worldToScreen(anc.src, vp, h);
        drawAnchorPin(histCtx, anc, sp);
      });
    }

    // ── True Field Canvas ──────────────────────────────────────────────
    /** Update all deed-anchored polygon vertices using the current transformation warper */
    function updateUserPolygonWarp() {
      // Reconstrucción Lindero La Trinidad (userPolygon) belongs strictly to Deed 1073.
      // NEVER warp or mutate it when Deed 196 is active so it stays fixed as ground reference!
      if (state.activeDeed && state.activeDeed !== "1073") return;

      const poly = state.userPolygon;
      if (!poly || !poly.vertices || poly.vertices.length === 0) return;
      const activeAnchors = getActiveAnchors();
      if (activeAnchors.length < 2) return;

      // Never overwrite vertex positions while actively dragging a polygon node or tuning anchors!
      if (state.draggingUserPolyNode !== null || state.tuningAnchorsActive) return;

      try {
        const warper = TransformMath.createWarper(state.algorithm, activeAnchors);
        let changed = false;
        poly.vertices.forEach(v => {
          if (v.deedPt) {
            const w = warper(v.deedPt);
            if (v.origX != null && v.origY != null) {
              const dx = w.x - v.origX;
              const dy = w.y - v.origY;
              v.origX = w.x;
              v.origY = w.y;
              // If anchors moved and warped deed shifted, translate polygon vertex by the same delta
              // so any relative displacement/offset inside the buffer is preserved!
              if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
                v.x += dx;
                v.y += dy;
                changed = true;
              }
            } else {
              v.origX = w.x;
              v.origY = w.y;
              if (v.x == null || isNaN(v.x)) v.x = w.x;
              if (v.y == null || isNaN(v.y)) v.y = w.y;
              changed = true;
            }
          }
        });
        if (changed) {
          recomputeUserPolygonMetrics();
          rebuildSegmentInputs();
        }
      } catch (e) {
        console.warn("Polygon warp error:", e);
      }
    }

    
    // [/SECTION: JS_STATE_AND_GIS_ENGINE]
