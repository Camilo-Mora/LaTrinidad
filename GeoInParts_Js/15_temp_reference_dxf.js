
    // ============================================================================
    // [SECTION: JS_TEMP_REFERENCE_DXF]
    // ============================================================================
    /* ======================================================
       TEMPORARY REFERENCE DXF MANAGER & ATTRIBUTES SUBPANEL
       ====================================================== */
    function escapeHtml(str) {
      if (!str) return "";
      return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[m]);
    }

    const REF_COLOR_PALETTE = [
      "#ffea00", // Bright Yellow
      "#ff9100", // Vibrant Orange
      "#e040fb", // Neon Magenta
      "#00e5ff", // Electric Cyan
      "#76ff03", // Vivid Lime
      "#ff4081", // Pink Accent
      "#40c4ff", // Sky Blue
      "#ffd740"  // Amber
    ];

    function addReferenceDxf(file, entities) {
      const color = REF_COLOR_PALETTE[state.refDxfFiles.length % REF_COLOR_PALETTE.length];
      const refId = "ref_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
      const bbox = computeBoundingBox(entities);

      const refItem = {
        id: refId,
        name: file.name || "reference.dxf",
        entities: entities,
        bbox: bbox,
        visible: true,
        opacity: 1.0,
        style: {
          color: color,
          dash: "solid",
          width: 2.0,
          showNodes: false
        }
      };

      state.refDxfFiles.push(refItem);
      renderReferenceDxfList();

      // Ensure Control Panel sidebar is open so the user can immediately see the new subpanel
      if (chkShowControlPanel && !chkShowControlPanel.checked) {
        chkShowControlPanel.checked = true;
        applyPanelVisibility();
      }

      // Scroll and highlight the new subpanel
      setTimeout(() => {
        const subpanel = document.getElementById(`ref-subpanel-${refId}`);
        if (subpanel) {
          subpanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
          subpanel.classList.add("subpanel-highlight");
          setTimeout(() => subpanel.classList.remove("subpanel-highlight"), 1600);
        }
      }, 50);

      redrawTrueCanvas();
      updateStatus(`Loaded reference DXF "${file.name}": ${entities.length} entities.`);
    }

    function renderReferenceDxfList() {
      const container = document.getElementById("ref-dxf-container");
      const list = document.getElementById("ref-dxf-list");
      const badge = document.getElementById("ref-dxf-badge");
      if (!container || !list) return;

      if (!state.refDxfFiles || state.refDxfFiles.length === 0) {
        container.style.display = "none";
        list.innerHTML = "";
        if (badge) badge.textContent = "0 files";
        return;
      }

      container.style.display = "flex";
      if (badge) badge.textContent = `${state.refDxfFiles.length} file${state.refDxfFiles.length > 1 ? "s" : ""}`;

      list.innerHTML = "";
      state.refDxfFiles.forEach(ref => {
        const el = document.createElement("div");
        el.className = "ref-dxf-subpanel";
        el.id = `ref-subpanel-${ref.id}`;
        el.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <div style="display:flex;align-items:center;gap:6px;overflow:hidden;flex:1;">
              <input type="checkbox" id="chk-ref-vis-${ref.id}" ${ref.visible ? "checked" : ""} title="Show/Hide this reference layer" style="accent-color:${ref.style.color};cursor:pointer;">
              <span style="font-size:0.73rem;font-weight:700;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(ref.name)} (${ref.entities.length} entities)">
                📎 ${escapeHtml(ref.name)}
              </span>
              <span style="font-size:0.65rem;color:var(--text-muted);white-space:nowrap;">(${ref.entities.length})</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button class="btn-fit-view" style="padding:1px 6px;font-size:0.65rem;display:inline-flex;align-items:center;justify-content:center;" title="Center & fit field view on this DXF" id="btn-zoom-ref-${ref.id}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </button>
              <button class="btn-fit-view" style="padding:1px 6px;font-size:0.65rem;color:#ff5252;border-color:rgba(255,82,82,0.3);" title="Remove reference DXF" id="btn-del-ref-${ref.id}">✕</button>
            </div>
          </div>
          <div class="opacity-row" style="margin:0;">
            <label style="min-width:65px;font-size:0.7rem;color:var(--text-muted);">Opacity</label>
            <input type="range" class="opacity-slider" id="opacity-ref-${ref.id}" min="0" max="100" value="${Math.round(ref.opacity * 100)}">
            <span class="opacity-val" id="opacity-val-ref-${ref.id}">${Math.round(ref.opacity * 100)}%</span>
          </div>
          <div class="style-row" style="margin:0;">
            <div style="display:flex;align-items:center;gap:5px;">
              <input type="color" id="color-ref-${ref.id}" value="${ref.style.color}" class="color-picker-swatch" title="Line color">
              <select id="dash-ref-${ref.id}" class="style-select" title="Line style">
                <option value="solid" ${ref.style.dash === "solid" ? "selected" : ""}>Solid ──</option>
                <option value="dashed" ${ref.style.dash === "dashed" ? "selected" : ""}>Dashed ─ ─</option>
                <option value="dotted" ${ref.style.dash === "dotted" ? "selected" : ""}>Dotted · · ·</option>
              </select>
              <select id="width-ref-${ref.id}" class="style-select width-select" title="Line thickness">
                <option value="1" ${ref.style.width == 1 ? "selected" : ""}>1px</option>
                <option value="2" ${ref.style.width == 2 ? "selected" : ""}>2px</option>
                <option value="3" ${ref.style.width == 3 ? "selected" : ""}>3px</option>
                <option value="4" ${ref.style.width == 4 ? "selected" : ""}>4px</option>
                <option value="6" ${ref.style.width == 6 ? "selected" : ""}>6px</option>
              </select>
            </div>
            <label class="chk-nodes-label" title="Show or hide vertex nodes">
              <input type="checkbox" id="nodes-ref-${ref.id}" ${ref.style.showNodes ? "checked" : ""} style="accent-color:${ref.style.color};"> Nodes
            </label>
          </div>
        `;

        list.appendChild(el);

        // Control event bindings
        const chkVis = el.querySelector(`#chk-ref-vis-${ref.id}`);
        const slider = el.querySelector(`#opacity-ref-${ref.id}`);
        const sliderVal = el.querySelector(`#opacity-val-ref-${ref.id}`);
        const colorPicker = el.querySelector(`#color-ref-${ref.id}`);
        const dashSelect = el.querySelector(`#dash-ref-${ref.id}`);
        const widthSelect = el.querySelector(`#width-ref-${ref.id}`);
        const chkNodes = el.querySelector(`#nodes-ref-${ref.id}`);
        const btnZoom = el.querySelector(`#btn-zoom-ref-${ref.id}`);
        const btnDel = el.querySelector(`#btn-del-ref-${ref.id}`);

        chkVis.addEventListener("change", e => {
          ref.visible = e.target.checked;
          redrawTrueCanvas();
          if (typeof syncGlobalOverlaysCheckbox === "function") syncGlobalOverlaysCheckbox();
        });

        slider.addEventListener("input", e => {
          ref.opacity = parseFloat(e.target.value) / 100;
          sliderVal.textContent = `${e.target.value}%`;
          redrawTrueCanvas();
        });

        colorPicker.addEventListener("input", e => {
          ref.style.color = e.target.value;
          chkVis.style.accentColor = e.target.value;
          chkNodes.style.accentColor = e.target.value;
          redrawTrueCanvas();
        });

        dashSelect.addEventListener("change", e => {
          ref.style.dash = e.target.value;
          redrawTrueCanvas();
        });

        widthSelect.addEventListener("change", e => {
          ref.style.width = parseFloat(e.target.value);
          redrawTrueCanvas();
        });

        chkNodes.addEventListener("change", e => {
          ref.style.showNodes = e.target.checked;
          redrawTrueCanvas();
        });

        btnZoom.addEventListener("click", () => {
          if (ref.bbox && trueCanvas.width > 0) {
            state.trueViewport = fitViewport(trueCanvas, ref.bbox);
            redrawTrueCanvas();
            updateStatus(`Centered field view on "${ref.name}".`);
          }
        });

        btnDel.addEventListener("click", () => {
          const idx = state.refDxfFiles.findIndex(r => r.id === ref.id);
          if (idx !== -1) {
            const removedName = ref.name;
            state.refDxfFiles.splice(idx, 1);
            renderReferenceDxfList();
            redrawTrueCanvas();
            updateStatus(`Removed reference DXF "${removedName}".`);
          }
        });
      });
      if (typeof syncGlobalOverlaysCheckbox === "function") syncGlobalOverlaysCheckbox();
    }

    // Attach listeners for Reference DXF loading
    const btnAddRefDxf = document.getElementById("btn-add-ref-dxf");
    const btnAddRefDxfSidebar = document.getElementById("btn-add-ref-dxf-sidebar");
    const refDxfInput = document.getElementById("ref-dxf-input");

    if (btnAddRefDxf && refDxfInput) {
      btnAddRefDxf.addEventListener("click", () => {
        refDxfInput.click();
      });
    }
    if (btnAddRefDxfSidebar && refDxfInput) {
      btnAddRefDxfSidebar.addEventListener("click", () => {
        refDxfInput.click();
      });
    }
    if (refDxfInput) {
      refDxfInput.addEventListener("change", e => {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;
        files.forEach(f => {
          const reader = new FileReader();
          reader.onload = function() {
            try {
              const entities = DXFParser.parse(this.result);
              if (!entities || entities.length === 0) {
                alert(`No valid entities found in "${f.name}".`);
                return;
              }
              addReferenceDxf(f, entities);
            } catch (err) {
              console.error("Error loading reference DXF:", err);
              alert(`Error parsing DXF file "${f.name}": ${err.message}`);
            }
          };
          reader.readAsText(f);
        });
        refDxfInput.value = "";
      });
    }

    // Drag-and-drop DXF onto True Card
    const targetTrueCard = document.getElementById("true-card");
    if (targetTrueCard) {
      targetTrueCard.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      });
      targetTrueCard.addEventListener("drop", e => {
        const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith(".dxf"));
        if (!files || files.length === 0) return;
        e.preventDefault();
        files.forEach(f => {
          const reader = new FileReader();
          reader.onload = function() {
            try {
              const entities = DXFParser.parse(this.result);
              if (entities && entities.length > 0) {
                addReferenceDxf(f, entities);
              }
            } catch (err) {
              console.error("Error parsing dropped DXF:", err);
            }
          };
          reader.readAsText(f);
        });
      });
    }

    document.getElementById("hist-pdf-input")?.addEventListener("change", e => {
      const f=e.target.files[0]; if (!f) return;
      loadPdfFromBlob(f);
    });

    // ── Export DXF ────────────────────────────────────────────────────
    btnExportDxf?.addEventListener("click", () => {
      if (!state.histEntities.length) { alert("No deed DXF loaded."); return; }
      const activeAnchors = getActiveAnchors();
      if (!activeAnchors.length || activeAnchors.length < 2) { alert("Add or enable at least 2 anchor pairs before exporting."); return; }
      const warper = TransformMath.createWarper(state.algorithm, activeAnchors);
      const rectified = state.histEntities.map(ent => ({ ...ent, layer: `${ent.layer}_RECTIFIED`, points: ent.points.map(pt => warper(pt)) }));
      const txt = DXFParser.serialize(rectified);
      const blob = new Blob([txt], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `rectified_escritura${state.activeDeed || "1073"}.dxf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      updateStatus(`Exported rectified DXF using ${activeAnchors.length} active anchors.`);
    });

    // [/SECTION: JS_TEMP_REFERENCE_DXF]
