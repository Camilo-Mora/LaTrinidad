
    // ============================================================================
    // [SECTION: JS_DXF_PARSER]
    // ============================================================================
    /* ==========================================================================
       1. ROBUST ASCII DXF PARSER & SERIALIZER
       ========================================================================== */
    class DXFParser {
      static parse(dxfText) {
        if (!dxfText) return [];
        const lines = dxfText.split(/\r?\n/);
        const entities = [];
        
        let currentEntity = null;
        let inEntities = !dxfText.includes("ENTITIES");

        let i = 0;
        while (i < lines.length - 1) {
          const code = parseInt(lines[i].trim(), 10);
          const val = lines[i + 1].trim();
          i += 2;

          if (isNaN(code)) continue;

          if (code === 0) {
            const uVal = val.toUpperCase();

            // Track sections: only model-space entities inside SECTION ENTITIES belong to the drawing
            if (uVal === "SECTION") {
              if (i < lines.length - 1 && parseInt(lines[i].trim(), 10) === 2) {
                const secName = lines[i + 1].trim().toUpperCase();
                i += 2;
                inEntities = (secName === "ENTITIES");
              }
              continue;
            }

            if (uVal === "ENDSEC") {
              if (inEntities && currentEntity) {
                DXFParser.finalizeEntity(currentEntity);
                if (currentEntity.points.length >= 1) {
                  entities.push(currentEntity);
                }
                currentEntity = null;
              }
              inEntities = false;
              continue;
            }

            if (!inEntities) continue;

            // Handle VERTEX coordinates inside the active POLYLINE
            if (uVal === "VERTEX") {
              let vx = 0, vy = 0;
              while (i < lines.length - 1) {
                const vCode = parseInt(lines[i].trim(), 10);
                const vVal = lines[i + 1].trim();
                if (vCode === 0) break;
                i += 2;
                if (vCode === 10) vx = parseFloat(vVal);
                if (vCode === 20) vy = parseFloat(vVal);
              }
              if (currentEntity && (currentEntity.type === "POLYLINE" || currentEntity.type === "LWPOLYLINE")) {
                currentEntity.points.push({ x: vx, y: vy });
              }
              continue;
            }

            // Handle end of vertex sequence
            if (uVal === "SEQEND") {
              if (currentEntity) {
                DXFParser.finalizeEntity(currentEntity);
                if (currentEntity.points.length >= 1) {
                  entities.push(currentEntity);
                }
                currentEntity = null;
              }
              continue;
            }

            // Finalize previous entity if any other code 0 token is read
            if (currentEntity) {
              DXFParser.finalizeEntity(currentEntity);
              if (currentEntity.points.length >= 1) {
                entities.push(currentEntity);
              }
              currentEntity = null;
            }

            if (uVal === "POLYLINE" || uVal === "LWPOLYLINE" || uVal === "LINE" || uVal === "ARC" || uVal === "CIRCLE") {
              currentEntity = {
                type: uVal,
                layer: "0",
                closed: uVal === "CIRCLE",
                points: [],
                cx: 0,
                cy: 0,
                r: 0,
                startAngle: 0,
                endAngle: 360
              };
            }
            continue;
          }

          if (!currentEntity) continue;

          // Entity Layer Name
          if (code === 8) {
            currentEntity.layer = val;
          }

          // Closed Flag for Polyline (70 bitmask, 1 = closed)
          if (code === 70) {
            const flag = parseInt(val, 10);
            currentEntity.closed = (flag & 1) !== 0;
          }

          // LWPOLYLINE Coordinates / Center X of Circle/Arc
          if (code === 10) {
            const x = parseFloat(val);
            let y = 0;
            if (i < lines.length - 1 && parseInt(lines[i].trim(), 10) === 20) {
              y = parseFloat(lines[i + 1].trim());
              i += 2;
            }
            if (currentEntity.type === "ARC" || currentEntity.type === "CIRCLE") {
              currentEntity.cx = x;
              currentEntity.cy = y;
            } else {
              currentEntity.points.push({ x, y });
            }
          }

          // LINE Coordinates (11,21 = end)
          if (code === 11) {
            const x = parseFloat(val);
            let y = 0;
            if (i < lines.length - 1 && parseInt(lines[i].trim(), 10) === 21) {
              y = parseFloat(lines[i + 1].trim());
              i += 2;
            }
            currentEntity.points.push({ x, y });
          }

          // Radius for Arc / Circle
          if (code === 40) {
            currentEntity.r = parseFloat(val);
          }

          // Start Angle for Arc
          if (code === 50) {
            currentEntity.startAngle = parseFloat(val);
          }

          // End Angle for Arc
          if (code === 51) {
            currentEntity.endAngle = parseFloat(val);
          }
        }

        if (currentEntity) {
          DXFParser.finalizeEntity(currentEntity);
          if (currentEntity.points.length >= 1) {
            entities.push(currentEntity);
          }
        }

        return entities;
      }

      static finalizeEntity(entity) {
        if (entity.type === "CIRCLE") {
          const cx = entity.cx;
          const cy = entity.cy;
          const r = entity.r;
          const numSegments = 36;
          for (let j = 0; j < numSegments; j++) {
            const theta = (j / numSegments) * Math.PI * 2;
            entity.points.push({
              x: cx + r * Math.cos(theta),
              y: cy + r * Math.sin(theta)
            });
          }
        } else if (entity.type === "ARC") {
          const cx = entity.cx;
          const cy = entity.cy;
          const r = entity.r;
          let startRad = entity.startAngle * Math.PI / 180;
          let endRad = entity.endAngle * Math.PI / 180;
          if (endRad < startRad) endRad += Math.PI * 2;
          const numSegments = 18;
          for (let j = 0; j <= numSegments; j++) {
            const theta = startRad + (j / numSegments) * (endRad - startRad);
            entity.points.push({
              x: cx + r * Math.cos(theta),
              y: cy + r * Math.sin(theta)
            });
          }
        }
      }

      static serialize(entities) {
        let dxf = "0\nSECTION\n2\nENTITIES\n";
        entities.forEach((ent) => {
          if (!ent.points || ent.points.length < 2) return;

          const layer = (ent.layer || "RECTIFIED").replace(/[^a-zA-Z0-9_-]/g, "_");
          const isClosed = ent.closed ? 1 : 0;

          dxf += `0\nPOLYLINE\n8\n${layer}\n66\n1\n70\n${isClosed}\n`;
          ent.points.forEach((pt) => {
            dxf += `0\nVERTEX\n8\n${layer}\n10\n${pt.x.toFixed(4)}\n20\n${pt.y.toFixed(4)}\n30\n0.0\n`;
          });
          dxf += "0\nSEQEND\n";
        });
        dxf += "0\nENDSEC\n0\nEOF\n";
        return dxf;
      }
    }

    // [/SECTION: JS_DXF_PARSER]
