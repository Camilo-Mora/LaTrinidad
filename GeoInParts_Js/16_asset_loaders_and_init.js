
    // ============================================================================
    // [SECTION: JS_ASSET_LOADERS]
    // ============================================================================
    /* ======================================================
       GEOTIFF LOADING
    ====================================================== */
    const MAX_DISPLAY_DIM = 4096;

    async function parseGeoTiff(fileOrBlob) {
      state.lastGeoTiffBlob = fileOrBlob;
      const statusEl = document.getElementById("geotiff-status");
      const loadingHud = document.getElementById("field-drone-loading-hud");
      const loadingText = document.getElementById("field-drone-loading-text");
      if (statusEl) { statusEl.textContent = "⏳ Reading…"; statusEl.className = "geotiff-status"; }
      if (loadingHud) { loadingHud.style.display = "flex"; }
      if (loadingText) { loadingText.textContent = "⚙️ Processing Drone GeoTIFF… please wait"; }
      if (trueStatus) { trueStatus.textContent = "⚙️ Reading GeoTIFF…"; trueStatus.className = "view-badge loading"; }
      const sizeMB = fileOrBlob && fileOrBlob.size ? `${(fileOrBlob.size / 1024 / 1024).toFixed(1)} MB` : "file";
      updateStatus(`Loading GeoTIFF (${sizeMB}) — please wait…`);
      await new Promise(r => setTimeout(r, 20));
      try {
        const tiff = await GeoTIFF.fromBlob(fileOrBlob);
        const fullImg = await tiff.getImage(0);
        const fullW = fullImg.getWidth(), fullH = fullImg.getHeight();
        let bbox, hasGeoRef = false;
        try {
          const origin = fullImg.getOrigin(), res = fullImg.getResolution();
          if (origin && res && origin.length >= 2 && Math.abs(res[0]) > 0) {
            bbox = {
              minX: origin[0],
              maxY: origin[1],
              maxX: origin[0] + fullW * Math.abs(res[0]),
              minY: origin[1] - fullH * Math.abs(res[1])
            };
            hasGeoRef = true;
          }
        } catch (_) {}
        if (!bbox) bbox = { minX: 0, minY: 0, maxX: fullW, maxY: fullH };
        bbox.width = Math.abs(bbox.maxX - bbox.minX);
        bbox.height = Math.abs(bbox.maxY - bbox.minY);

        const imageCount = await tiff.getImageCount();
        let readImg = fullImg;
        let tW = fullW;
        let tH = fullH;

        const useFullRes = state.geotiffFullRes;
        if (!useFullRes) {
          for (let l = 1; l < imageCount; l++) {
            const img = await tiff.getImage(l);
            readImg = img;
            if (Math.max(img.getWidth(), img.getHeight()) <= MAX_DISPLAY_DIM) break;
          }
          const readW = readImg.getWidth(), readH = readImg.getHeight();
          const sc = Math.min(1, MAX_DISPLAY_DIM / Math.max(readW, readH));
          tW = Math.max(1, Math.round(readW * sc));
          tH = Math.max(1, Math.round(readH * sc));
        }

        const modeTag = useFullRes ? "[HD Native]" : "[4K Display]";
        if (statusEl) statusEl.textContent = `⏳ Decoding ${tW}×${tH} ${modeTag}…`;
        if (loadingText) loadingText.textContent = `⚙️ Decoding Drone Image (${tW}×${tH} ${modeTag})… please wait`;
        if (trueStatus) { trueStatus.textContent = `⚙️ Decoding Drone ${modeTag}…`; trueStatus.className = "view-badge loading"; }
        await new Promise(r => setTimeout(r, 10));

        const rasters = await readImg.readRasters({ width: tW, height: tH, interleave: true });
        const spp = readImg.getSamplesPerPixel();
        const off = document.createElement("canvas");
        off.width = tW;
        off.height = tH;
        const oc = off.getContext("2d");
        const id = oc.createImageData(tW, tH);
        const d = id.data;

        // Optimized fast transfer loop for standard 8-bit RGB GeoTIFFs (avoids millions of clamp calls)
        if (spp === 3 && (rasters instanceof Uint8Array || rasters.buffer)) {
          const rData = rasters;
          for (let i = 0, j = 0; i < tW * tH * 4; i += 4, j += 3) {
            d[i]     = rData[j];
            d[i + 1] = rData[j + 1];
            d[i + 2] = rData[j + 2];
            d[i + 3] = 255;
          }
        } else if (spp >= 4 && (rasters instanceof Uint8Array || rasters.buffer)) {
          const rData = rasters;
          for (let i = 0, j = 0; i < tW * tH * 4; i += 4, j += spp) {
            d[i]     = rData[j];
            d[i + 1] = rData[j + 1];
            d[i + 2] = rData[j + 2];
            d[i + 3] = rData[j + 3];
          }
        } else {
          const clamp = v => {
            if (v == null) return 0;
            if (v >= 0 && v <= 255 && Number.isInteger(v)) return v;
            if (v > 255) return Math.min(255, Math.round(v / 256));
            if (v <= 1 && v >= 0) return Math.round(v * 255);
            return Math.min(255, Math.max(0, Math.round(v)));
          };
          let mn = Infinity, mx = -Infinity;
          if (spp === 1) {
            for (let k = 0; k < rasters.length; k++) {
              if (rasters[k] < mn) mn = rasters[k];
              if (rasters[k] > mx) mx = rasters[k];
            }
          }
          for (let i = 0; i < tW * tH; i++) {
            let r = 0, g = 0, b = 0, a = 255;
            if (spp === 1) {
              const n = mx === mn ? 0.5 : (rasters[i] - mn) / (mx - mn);
              r = g = b = Math.round(n * 255);
            } else if (spp === 3) {
              r = clamp(rasters[i * 3]);
              g = clamp(rasters[i * 3 + 1]);
              b = clamp(rasters[i * 3 + 2]);
            } else if (spp >= 4) {
              r = clamp(rasters[i * 4]);
              g = clamp(rasters[i * 4 + 1]);
              b = clamp(rasters[i * 4 + 2]);
              a = clamp(rasters[i * 4 + 3]);
            }
            d[i * 4]     = r;
            d[i * 4 + 1] = g;
            d[i * 4 + 2] = b;
            d[i * 4 + 3] = a;
          }
        }

        oc.putImageData(id, 0, 0);
        state.geoTiff = { offscreen: off, bbox, hasGeoRef };
        // Only override viewport if vector entities haven't set it yet
        if (!state.trueViewport.bbox || state.trueEntities.length === 0) {
          state.trueViewport = fitViewport(trueCanvas, bbox);
        }
        if (statusEl) {
          statusEl.textContent = `${tW}×${tH} · ${hasGeoRef ? "Georef ✓" : "No georef"}${useFullRes ? " · HD" : ""}`;
          statusEl.className = "geotiff-status ok";
        }
        if (loadingHud) loadingHud.style.display = "none";
        if (trueStatus) {
          trueStatus.textContent = `Field & Drone Ready (${state.trueEntities.length} ents)${useFullRes ? " [HD]" : ""}`;
          trueStatus.className = "view-badge green";
        }
        updateStatus(`Drone GeoTIFF ready (${tW}×${tH}${useFullRes ? " HD" : ""}). ${hasGeoRef ? "Georeferenced." : ""}`);
        redrawTrueCanvas();
      } catch (err) {
        console.error("GeoTIFF error:", err);
        if (statusEl) { statusEl.textContent = "Error"; statusEl.className = "geotiff-status"; }
        if (loadingHud) loadingHud.style.display = "none";
        if (trueStatus) {
          trueStatus.textContent = `Field DXF: ${state.trueEntities.length} ents`;
          trueStatus.className = "view-badge green";
        }
        updateStatus(`GeoTIFF failed: ${err.message}`);
      }
    }

    /* ======================================================
       PDF LOADING (Mapa1073_FerminSuarez.pdf)
    ====================================================== */
    async function loadPdfFromBlob(fileOrBlob) {
      if (!window.pdfjsLib) { console.warn("PDF.js not available"); return; }
      updateStatus("⏳ Loading deed PDF…");
      try {
        const arrayBuffer = await fileOrBlob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        state.histPdfDoc = pdf;
        state.histPdfBlob = fileOrBlob;
        const page = await pdf.getPage(1);
        const vp = page.getViewport({scale: 2.0}); // render at 2× for clarity
        const origVp = page.getViewport({scale: 1.0});
        const offCanvas = document.createElement("canvas");
        offCanvas.width  = vp.width;
        offCanvas.height = vp.height;
        const offCtx = offCanvas.getContext("2d");
        await page.render({canvasContext: offCtx, viewport: vp}).promise;
        state.histPdfCanvas = offCanvas;
        state.histPdfW = origVp.width;
        state.histPdfH = origVp.height;
        if (state.deeds && state.activeDeed && state.deeds[state.activeDeed]) {
          state.deeds[state.activeDeed].histPdfCanvas = offCanvas;
          state.deeds[state.activeDeed].histPdfW = origVp.width;
          state.deeds[state.activeDeed].histPdfH = origVp.height;
          state.deeds[state.activeDeed].histPdfDoc = pdf;
          state.deeds[state.activeDeed].histPdfBlob = fileOrBlob;
        }
        histStatus.textContent = `PDF: ${Math.round(origVp.width)}×${Math.round(origVp.height)} pts`;
        // Fit historical viewport to PDF bounds
        if (state.showDeedPanel || (histCard && !histCard.classList.contains("hidden"))) {
          fitHistoricalView();
        } else if (!state.histViewport.bbox) {
          fitHistoricalView();
        }
        updateStatus(`Deed PDF loaded — ${Math.round(origVp.width)}×${Math.round(origVp.height)} pts. Drop anchors to align.`);
        redrawAll();
      } catch(err) {
        console.error("PDF error:", err);
        updateStatus(`PDF failed: ${err.message}`);
      }
    }

    /* ======================================================
       AUTO-LOADERS — fetch defaults when served via HTTP
    ====================================================== */
    async function fetchBlob(url) {
      const sep = url.includes("?") ? "&" : "?";
      const r = await fetch(`${url}${sep}_t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.blob();
    }
    async function fetchText(url) {
      const sep = url.includes("?") ? "&" : "?";
      const r = await fetch(`${url}${sep}_t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    }

    
    /* ======================================================
       ASYNCHRONOUS BACKGROUND ASSET STREAMERS
       (Non-blocking: vectors and boundaries load immediately)
    ====================================================== */
    async function autoLoadGeoTiffAsync() {
      const statusEl = document.getElementById("geotiff-status");
      const loadingHud = document.getElementById("field-drone-loading-hud");
      const loadingText = document.getElementById("field-drone-loading-text");
      try {
        if (statusEl) { statusEl.textContent = "⏳ Requesting…"; statusEl.className = "geotiff-status"; }
        if (loadingHud) { loadingHud.style.display = "flex"; }
        if (trueStatus) { trueStatus.textContent = "⏳ Loading Drone…"; trueStatus.className = "view-badge loading"; }

        const r = await fetch("Trinidad_Dron_Resized.tif?_t=" + Date.now());
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const contentLength = r.headers.get("Content-Length");
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 51557661;
        let loadedBytes = 0;
        let blob;

        if (r.body && r.body.getReader) {
          const reader = r.body.getReader();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loadedBytes += value.length;
            const pct = Math.round((loadedBytes / totalBytes) * 100);
            const loadedMB = (loadedBytes / (1024 * 1024)).toFixed(1);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            if (statusEl) statusEl.textContent = `⏳ GeoTIFF: ${loadedMB}/${totalMB} MB (${pct}%)`;
            if (loadingText) loadingText.textContent = `Loading Drone Imagery: ${loadedMB}/${totalMB} MB (${pct}%)… please wait`;
            if (trueStatus) { trueStatus.textContent = `⏳ Drone: ${loadedMB}MB (${pct}%)`; trueStatus.className = "view-badge loading"; }
          }
          blob = new Blob(chunks);
        } else {
          blob = await r.blob();
        }

        await parseGeoTiff(blob);
      } catch (err) {
        console.warn("Auto GeoTIFF background stream:", err.message);
        if (statusEl && !state.geoTiff) {
          statusEl.textContent = "Use '🛸 Drone GeoTIFF'";
          statusEl.className = "geotiff-status";
        }
        if (loadingHud) loadingHud.style.display = "none";
        if (trueStatus) {
          trueStatus.textContent = `Field DXF: ${state.trueEntities.length} ents`;
          trueStatus.className = "view-badge green";
        }
      }
    }

    async function autoLoadDeedPdfAsync() {
      try {
        const blob = await fetchBlob("Mapa1073_FerminSuarez.pdf");
        await loadPdfFromBlob(blob);
        if (typeof saveCurrentDeedState === "function") {
          saveCurrentDeedState();
        }
      } catch (err) {
        console.warn("Auto PDF background load:", err.message);
        if (histStatus && !state.histPdfCanvas) {
          histStatus.textContent = `Deed DXF ready (${state.histEntities.length} ents)`;
        }
      }
    }

    async function autoLoadAll() {
      // =========================================================================
      // PHASE 1: INSTANT VECTOR & BOUNDARY PRELOAD (< 15 ms)
      // Loads Deed DXF, Field DXF, Anchors & Reconstructed Boundary IMMEDIATELY!
      // =========================================================================

      // 1. Deed DXF (Escritura 1073)
      try {
        const text = await fetchText("Polygon_Escritura1073_FerminSuarez.dxf");
        state.histEntities = DXFParser.parse(text);
        histStatus.textContent = `Deed DXF ready (${state.histEntities.length} ents)`;
      } catch(e) {
        console.warn("Auto Deed DXF:", e.message);
        if (typeof HISTORICAL_DXF_SAMPLE !== "undefined") {
          state.histEntities = DXFParser.parse(HISTORICAL_DXF_SAMPLE);
          histStatus.textContent = `Deed DXF ready (${state.histEntities.length} ents)`;
        }
      }
      if (histCanvas.width > 0 && state.histEntities.length > 0) {
        state.histViewport = fitViewport(histCanvas, computeBoundingBox(state.histEntities));
      }

      // 2. Field survey DXF (CercoCampo_CristianCortes_Marz_2019.dxf)
      try {
        const fieldName = "CercoCampo_CristianCortes_Marz_2019.dxf";
        const text = await fetchText(fieldName);
        state.trueFileName = fieldName;
        state.trueEntities = DXFParser.parse(text);
        if (trueStatus) {
          if (!state.geoTiff) {
            trueStatus.textContent = "⏳ Loading Drone Imagery…";
            trueStatus.className = "view-badge loading";
          } else {
            trueStatus.textContent = `Field DXF: ${state.trueEntities.length} ents`;
            trueStatus.className = "view-badge green";
          }
        }
      } catch(e) {
        console.warn("Auto Field DXF:", e.message);
        state.trueFileName = "CercoCampo_CristianCortes_Marz_2019.dxf";
        if (typeof TRUE_FIELD_DXF_SAMPLE !== "undefined") {
          state.trueEntities = DXFParser.parse(TRUE_FIELD_DXF_SAMPLE);
          if (trueStatus) {
            if (!state.geoTiff) {
              trueStatus.textContent = "⏳ Loading Drone Imagery…";
              trueStatus.className = "view-badge loading";
            } else {
              trueStatus.textContent = `Field DXF: ${state.trueEntities.length} ents`;
              trueStatus.className = "view-badge green";
            }
          }
        }
      }
      if (trueCanvas.width > 0 && state.trueEntities.length > 0) {
        state.trueViewport = fitViewport(trueCanvas, computeBoundingBox(state.trueEntities));
      }

      // 2b. Field survey DXF 2025 Valoy (CercoCampo_WilmarValoy_Agos_2025.dxf)
      try {
        const textValoy = await fetchText("CercoCampo_WilmarValoy_Agos_2025.dxf");
        state.surveyValoy2025Entities = DXFParser.parse(textValoy);
        console.log(`Valoy 2025 DXF: ${state.surveyValoy2025Entities.length} ents`);
      } catch(e) {
        console.warn("Auto Field DXF Valoy 2025:", e.message);
      }

      // 2c. Field survey DXF 2025 Cortez (CercoCampo_CristianCortes_Sept_2026.dxf)
      try {
        const textCortez = await fetchText("CercoCampo_CristianCortes_Sept_2026.dxf");
        state.surveyCortez2025Entities = DXFParser.parse(textCortez);
        console.log(`Cortez 2025 DXF: ${state.surveyCortez2025Entities.length} ents`);
      } catch(e) {
        console.warn("Auto Field DXF Cortez 2025:", e.message);
      }

      // 3. Dedicated anchors for this app (anchors_georectifier.json)
      let loadedAnchors = false;
      try {
        const text = await fetchText("anchors_georectifier.json");
        const data = JSON.parse(text);
        if (data._simulation_metadata && typeof restoreSimulationMetadata === "function") {
          restoreSimulationMetadata(data._simulation_metadata);
        }
        if (data.testAxes && Array.isArray(data.testAxes) && data.testAxes.length > 0) {
          state.testAxes = data.testAxes.map(ax => ({ ...ax }));
          if (typeof ensureUniqueTestAxisIds === "function") ensureUniqueTestAxisIds();
          else if (typeof syncTestAxisCounter === "function") syncTestAxisCounter();
          if (typeof renderTestAxesList === "function") renderTestAxesList();
        }
        const list = Array.isArray(data) ? data : (data.anchors || data.anchors1073 || []);
        if (list.length > 0) {
          applyAnchors(list);
          loadedAnchors = true;
        }
      } catch(e) {
        console.warn("anchors_georectifier.json:", e.message);
      }
      if (!loadedAnchors && typeof EMBEDDED_ANCHORS !== "undefined" && EMBEDDED_ANCHORS.length > 0) {
        applyAnchors(EMBEDDED_ANCHORS);
      }
      // Also restore axes from localStorage if anchors_georectifier.json was legacy without axes
      if ((!state.testAxes || state.testAxes.length === 0)) {
        try {
          const cached = localStorage.getItem("georectifier_axes_anchors");
          if (cached) {
            const cachedObj = JSON.parse(cached);
            if (cachedObj.testAxes && Array.isArray(cachedObj.testAxes) && cachedObj.testAxes.length > 0) {
              state.testAxes = cachedObj.testAxes.map(ax => ({ ...ax }));
              if (typeof ensureUniqueTestAxisIds === "function") ensureUniqueTestAxisIds();
              else if (typeof syncTestAxisCounter === "function") syncTestAxisCounter();
              if (typeof renderTestAxesList === "function") renderTestAxesList();
            }
          }
        } catch (_) {}
      }

      // 4. User polygon preload (user_polygon.json or user_polygon.dxf)
      let loadedPoly = false;
      try {
        const text = await fetchText("user_polygon.json");
        const obj = JSON.parse(text);
        loadedPoly = applyUserPolygon(obj);
      } catch(e) {
        console.warn("user_polygon.json preload:", e.message);
      }

      if (!loadedPoly && typeof EMBEDDED_USER_POLYGON !== "undefined") {
        loadedPoly = applyUserPolygon(EMBEDDED_USER_POLYGON);
      }

      if (!loadedPoly) {
        try {
          const dxfText = await fetchText("user_polygon.dxf");
          loadUserPolygonFromDXF(dxfText, "user_polygon.dxf");
          loadedPoly = true;
        } catch(e) {
          console.warn("user_polygon.dxf preload:", e.message);
        }
      }

      // 4.5. Custom Polygons / Casa del Sol Parcels preload (casadelsol_parcels.json)
      let loadedCustom = false;
      try {
        const textCustom = await fetchText("casadelsol_parcels.json");
        const dataCustom = JSON.parse(textCustom);
        if (Array.isArray(dataCustom) && dataCustom.length > 0) {
          applyCustomPolygons(dataCustom);
          loadedCustom = true;
        }
      } catch(e) {
        console.warn("casadelsol_parcels.json preload:", e.message);
      }
      if (!loadedCustom && typeof EMBEDDED_CASADELSOL_PARCELS !== "undefined" && EMBEDDED_CASADELSOL_PARCELS.length > 0) {
        applyCustomPolygons(EMBEDDED_CASADELSOL_PARCELS);
      }

      // 5. Initialize constraints, subpanels, metrics and redraw immediately
      initConstraintsAndBuffers();
      renderCustomPolyList();
      updateCustomPolyButtonStates();
      recomputeCustomPolygonMetrics();
      updateDeedScaleDisplay();
      redrawAll();

      const activeAnc = getActiveAnchors().length;
      if (typeof saveCurrentDeedState === "function") {
        saveCurrentDeedState();
      }
      updateStatus(`⚡ Ready: Deed DXF (${state.histEntities.length} ents), Field DXF (${state.trueEntities.length} ents), Anchors (${activeAnc}) & Boundary (${state.userPolygon.vertices.length} pts) loaded.`);

      // =========================================================================
      // PHASE 2: NON-BLOCKING ASYNCHRONOUS BACKGROUND RASTERS
      // Heavy 51MB GeoTIFF & 2MB PDF stream in the background without freezing UI
      // =========================================================================
      autoLoadDeedPdfAsync();
      autoLoadGeoTiffAsync();
    }

    
    const btnResetDeedScale = document.getElementById("btn-reset-deed-scale");
    if (btnResetDeedScale) btnResetDeedScale.addEventListener("click", resetDeedScale);
        const btnResetSidebar = document.getElementById("btn-reset-deed-scale-sidebar");
    if (btnResetSidebar) btnResetSidebar.addEventListener("click", resetDeedScale);
    const btnResetHud = document.getElementById("btn-reset-deed-scale-hud");
    if (btnResetHud) btnResetHud.addEventListener("click", resetDeedScale);
    const btnToggleHud = document.getElementById("btn-toggle-deed-handles-hud");
    if (btnToggleHud) btnToggleHud.addEventListener("click", () => toggleDeedHandles());
    const btnToggleDeedHandles = document.getElementById("btn-toggle-deed-handles");
    if (btnToggleDeedHandles) btnToggleDeedHandles.addEventListener("click", () => toggleDeedHandles());
    const chkToggleDeedHandles = document.getElementById("chk-toggle-deed-handles");
    if (chkToggleDeedHandles) chkToggleDeedHandles.addEventListener("change", (e) => toggleDeedHandles(e.target.checked));
    const btnCloseSqueezeHud = document.getElementById("btn-close-squeeze-hud");
    if (btnCloseSqueezeHud) btnCloseSqueezeHud.addEventListener("click", () => toggleDeedHandles(false));

    // Deed Squeeze Steppers & Presets
    document.getElementById("btn-scale-ratio-dec5")?.addEventListener("click", () => {
      const cur = state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0);
      applyDeedScaleChange(cur - 0.05);
    });
    document.getElementById("btn-scale-ratio-dec")?.addEventListener("click", () => {
      const cur = state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0);
      applyDeedScaleChange(cur - 0.01);
    });
    document.getElementById("btn-scale-ratio-inc")?.addEventListener("click", () => {
      const cur = state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0);
      applyDeedScaleChange(cur + 0.01);
    });
    document.getElementById("btn-scale-ratio-inc5")?.addEventListener("click", () => {
      const cur = state.deedScale.ratio !== undefined ? state.deedScale.ratio : (state.deedScale.x || 1.0);
      applyDeedScaleChange(cur + 0.05);
    });
    document.getElementById("input-scale-ratio")?.addEventListener("change", (e) => {
      applyDeedScaleChange(parseFloat(e.target.value) / 100);
    });
    document.querySelectorAll(".btn-scale-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.getAttribute("data-val"));
        if (!isNaN(val)) applyDeedScaleChange(val / 100);
      });
    });

    // Backward-compatibility listeners
    document.getElementById("btn-scale-x-dec")?.addEventListener("click", () => applyDeedScaleChange((state.deedScale.ratio || state.deedScale.x || 1.0) - 0.01));
    document.getElementById("btn-scale-x-inc")?.addEventListener("click", () => applyDeedScaleChange((state.deedScale.ratio || state.deedScale.x || 1.0) + 0.01));
    document.getElementById("btn-scale-y-dec")?.addEventListener("click", () => applyDeedScaleChange((state.deedScale.ratio || state.deedScale.y || 1.0) - 0.01));
    document.getElementById("btn-scale-y-inc")?.addEventListener("click", () => applyDeedScaleChange((state.deedScale.ratio || state.deedScale.y || 1.0) + 0.01));
    document.getElementById("input-scale-x")?.addEventListener("change", (e) => applyDeedScaleChange(parseFloat(e.target.value) / 100));
    document.getElementById("input-scale-y")?.addEventListener("change", (e) => applyDeedScaleChange(parseFloat(e.target.value) / 100));

    const chkLockAspect = document.getElementById("chk-lock-deed-aspect");
    if (chkLockAspect) chkLockAspect.addEventListener("change", (e) => toggleLinkDeedAspect(e.target.checked));
    const chkLockAspectHud = document.getElementById("chk-lock-deed-aspect-hud");
    if (chkLockAspectHud) chkLockAspectHud.addEventListener("change", (e) => toggleLinkDeedAspect(e.target.checked));

    // File input listeners for manual override
    document.getElementById("geotiff-input")?.addEventListener("change", e => { const f=e.target.files[0]; if(f) parseGeoTiff(f); });
    document.getElementById("btn-load-geotiff-field")?.addEventListener("click", () => document.getElementById("geotiff-input")?.click());

    const chkGeoTiffFullRes = document.getElementById("chk-geotiff-fullres");
    if (chkGeoTiffFullRes) {
      chkGeoTiffFullRes.addEventListener("change", async (e) => {
        state.geotiffFullRes = e.target.checked;
        if (state.lastGeoTiffBlob) {
          await parseGeoTiff(state.lastGeoTiffBlob);
        } else {
          updateStatus(`Drone mode: ${state.geotiffFullRes ? "Full Native Resolution (HD)" : "Fast 4K Display"}`);
        }
      });
    }

    // ── Startup ───────────────────────────────────────────────────────
    state.histEntities = [];
    state.trueEntities = [];
    state.anchors = [];
    algorithmSelect.value = state.algorithm;
    initConstraintsAndBuffers();
    renderCustomPolyList();
    updateCustomPolyButtonStates();
    recomputeCustomPolygonMetrics();
    setToolMode("pan");
    updateStatus("⏳ Initialising — loading deed PDF, DXF files and drone imagery…");

    setTimeout(() => {
      resizeCanvases();
      autoLoadAll();
    }, 150);
    // [/SECTION: JS_ASSET_LOADERS]
