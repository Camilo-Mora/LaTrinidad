import os
import zipfile
import struct
import io
import json
import numpy as np
from PIL import Image
import pyproj

trans_to_3857 = pyproj.Transformer.from_crs('EPSG:9377', 'EPSG:3857', always_xy=True)
trans_to_9377 = pyproj.Transformer.from_crs('EPSG:3857', 'EPSG:9377', always_xy=True)

configs = [
    {
        'file': 'ESRI-2017-06-14.tpkx',
        'date': '2017-06-14',
        'year': '2017',
        'label': '14 Jun 2017',
        'out_prefix': 'esri_2017_06_14'
    },
    {
        'file': 'ESRI-2021-02-24.tpkx',
        'date': '2021-02-24',
        'year': '2021',
        'label': '24 Feb 2021',
        'out_prefix': 'esri_2021_02_24'
    },
    {
        'file': 'ESRI-2022-08-31.tpkx',
        'date': '2022-08-31',
        'year': '2022',
        'label': '31 Ago 2022',
        'out_prefix': 'esri_2022_08_31'
    }
]

catalog = []

for cfg in configs:
    fn = cfg['file']
    print(f"Processing {fn}...")
    with zipfile.ZipFile(fn, 'r') as z:
        bundles = [b for b in z.infolist() if b.filename.endswith('.bundle')]
        max_lvl = max(int(b.filename.split('/')[1][1:]) for b in bundles)
        b_info = [b for b in bundles if f'/L{max_lvl:02d}/' in b.filename][0]
        data = z.read(b_info.filename)
        
        fname = b_info.filename.split('/')[-1]
        base_r = int(fname.split('R')[1].split('C')[0], 16)
        base_c = int(fname.split('C')[1].split('.')[0], 16)
        
        min_r, max_r = 999999, -1
        min_c, max_c = 999999, -1
        tiles = []
        for i in range(16384):
            val = struct.unpack('<Q', data[64+i*8:64+(i+1)*8])[0]
            sz = val >> 40
            if sz > 0:
                off = val & 0xFFFFFFFFFF
                r = base_r + (i // 128)
                c = base_c + (i % 128)
                tiles.append((r, c, off, sz))
                min_r = min(min_r, r)
                max_r = max(max_r, r)
                min_c = min(min_c, c)
                max_c = max(max_c, c)
                
        # Mosaic in 3857
        w_tiles = max_c - min_c + 1
        h_tiles = max_r - min_r + 1
        mosaic_w = w_tiles * 256
        mosaic_h = h_tiles * 256
        print(f"  Level L{max_lvl}: {len(tiles)} tiles ({w_tiles} cols x {h_tiles} rows = {mosaic_w}x{mosaic_h} px)")
        mosaic = Image.new('RGB', (mosaic_w, mosaic_h))
        
        for r, c, off, sz in tiles:
            tile_bytes = data[off : off + sz]
            t_img = Image.open(io.BytesIO(tile_bytes))
            px = (c - min_c) * 256
            py = (r - min_r) * 256
            mosaic.paste(t_img, (px, py))
            
        res_3857 = 20037508.342787 * 2 / (256 * (2 ** max_lvl))
        tile_m = 256 * res_3857
        x_min_3857 = -20037508.342787 + min_c * tile_m
        x_max_3857 = -20037508.342787 + (max_c + 1) * tile_m
        y_max_3857 = 20037508.342787 - min_r * tile_m
        y_min_3857 = 20037508.342787 - (max_r + 1) * tile_m
        
        # Sample points along boundary in 3857 to find precise bounding box in 9377
        pts_3857_x = np.linspace(x_min_3857, x_max_3857, 50)
        pts_3857_y = np.linspace(y_min_3857, y_max_3857, 50)
        boundary_3857 = []
        for x in pts_3857_x:
            boundary_3857.append((x, y_min_3857))
            boundary_3857.append((x, y_max_3857))
        for y in pts_3857_y:
            boundary_3857.append((x_min_3857, y))
            boundary_3857.append((x_max_3857, y))
            
        boundary_9377 = [trans_to_9377.transform(bx, by) for bx, by in boundary_3857]
        min_x_9377 = float(min(p[0] for p in boundary_9377))
        max_x_9377 = float(max(p[0] for p in boundary_9377))
        min_y_9377 = float(min(p[1] for p in boundary_9377))
        max_y_9377 = float(max(p[1] for p in boundary_9377))
        
        out_w = int(round(mosaic_w))
        out_h = int(round(mosaic_h))
        
        # Four corners in EPSG:9377 (NW, NE, SE, SW):
        corners_9377 = np.array([
            [min_x_9377, max_y_9377],  # NW
            [max_x_9377, max_y_9377],  # NE
            [max_x_9377, min_y_9377],  # SE
            [min_x_9377, min_y_9377]   # SW
        ])
        
        # Map corners to 3857:
        corners_3857 = np.array([trans_to_3857.transform(x, y) for x, y in corners_9377])
        
        # Map 3857 to source mosaic pixel coordinates (u, v):
        u_src = (corners_3857[:, 0] - x_min_3857) / (x_max_3857 - x_min_3857) * mosaic_w
        v_src = (y_max_3857 - corners_3857[:, 1]) / (y_max_3857 - y_min_3857) * mosaic_h
        
        # PIL QUAD transform takes target coordinates (NW, SW, SE, NE in source):
        # Order for QUAD: (NW_x, NW_y, SW_x, SW_y, SE_x, SE_y, NE_x, NE_y)
        quad = [
            u_src[0], v_src[0], # NW
            u_src[3], v_src[3], # SW
            u_src[2], v_src[2], # SE
            u_src[1], v_src[1]  # NE
        ]
        
        warped = mosaic.transform((out_w, out_h), Image.Transform.QUAD, quad, resample=Image.Resampling.BICUBIC)
        
        webp_path = cfg['out_prefix'] + '.webp'
        warped.save(webp_path, format='WEBP', quality=88)
        file_size_kb = os.path.getsize(webp_path) / 1024
        
        item = {
            'id': cfg['out_prefix'],
            'date': cfg['date'],
            'year': cfg['year'],
            'label': cfg['label'],
            'source': 'ESRI World Imagery',
            'crs': 'EPSG:9377',
            'minX': round(min_x_9377, 2),
            'maxX': round(max_x_9377, 2),
            'minY': round(min_y_9377, 2),
            'maxY': round(max_y_9377, 2),
            'width': out_w,
            'height': out_h,
            'file': webp_path
        }
        catalog.append(item)
        print(f"  Saved {webp_path} ({file_size_kb:.1f} KB), bounds EPSG:9377: [{item['minX']}, {item['minY']}] to [{item['maxX']}, {item['maxY']}]")

catalog_path = 'historical_catalog.json'
with open(catalog_path, 'w', encoding='utf-8') as f_out:
    json.dump(catalog, f_out, indent=2)

print(f"Success! Generated catalog saved to {catalog_path}")
