// ====== 投影 & 渲染 ======

// Province color palette (low saturation, dark theme)
var PROVINCE_COLORS = [
  'hsla(210,25%,18%,0.5)', 'hsla(230,20%,20%,0.5)', 'hsla(250,18%,19%,0.5)',
  'hsla(190,22%,17%,0.5)', 'hsla(170,20%,18%,0.5)', 'hsla(270,15%,20%,0.5)',
  'hsla(200,28%,16%,0.5)', 'hsla(160,18%,19%,0.5)', 'hsla(220,22%,21%,0.5)',
  'hsla(240,16%,18%,0.5)', 'hsla(180,20%,17%,0.5)', 'hsla(260,18%,19%,0.5)',
  'hsla(195,24%,18%,0.5)', 'hsla(215,20%,20%,0.5)', 'hsla(235,17%,17%,0.5)',
  'hsla(175,22%,19%,0.5)', 'hsla(205,26%,17%,0.5)', 'hsla(225,19%,21%,0.5)',
  'hsla(245,15%,18%,0.5)', 'hsla(185,21%,18%,0.5)', 'hsla(265,16%,20%,0.5)',
  'hsla(155,18%,17%,0.5)', 'hsla(210,30%,15%,0.5)', 'hsla(230,24%,19%,0.5)',
  'hsla(250,20%,17%,0.5)', 'hsla(190,26%,18%,0.5)', 'hsla(170,24%,19%,0.5)',
  'hsla(200,22%,20%,0.5)', 'hsla(220,18%,18%,0.5)', 'hsla(240,22%,19%,0.5)',
  'hsla(160,20%,18%,0.5)', 'hsla(180,24%,17%,0.5)', 'hsla(215,26%,18%,0.5)',
  'hsla(235,20%,20%,0.5)'
];

// Visited province warm colors
var VISITED_PROVINCE_COLORS = [
  'hsla(15,50%,22%,0.55)', 'hsla(20,45%,24%,0.55)', 'hsla(10,48%,20%,0.55)',
  'hsla(25,42%,23%,0.55)', 'hsla(8,52%,21%,0.55)', 'hsla(18,46%,22%,0.55)',
  'hsla(12,50%,23%,0.55)', 'hsla(22,44%,21%,0.55)', 'hsla(5,48%,22%,0.55)',
  'hsla(28,40%,24%,0.55)', 'hsla(14,52%,20%,0.55)', 'hsla(16,46%,23%,0.55)',
  'hsla(20,50%,21%,0.55)', 'hsla(10,44%,24%,0.55)', 'hsla(24,48%,22%,0.55)',
  'hsla(6,50%,23%,0.55)', 'hsla(18,52%,20%,0.55)', 'hsla(12,44%,24%,0.55)',
  'hsla(26,46%,21%,0.55)', 'hsla(8,48%,23%,0.55)', 'hsla(22,50%,22%,0.55)',
  'hsla(14,42%,24%,0.55)', 'hsla(16,52%,20%,0.55)', 'hsla(20,48%,23%,0.55)',
  'hsla(10,50%,21%,0.55)', 'hsla(24,44%,22%,0.55)', 'hsla(6,46%,24%,0.55)',
  'hsla(18,48%,20%,0.55)', 'hsla(12,52%,23%,0.55)', 'hsla(28,44%,21%,0.55)',
  'hsla(8,46%,22%,0.55)', 'hsla(22,48%,24%,0.55)', 'hsla(16,50%,21%,0.55)',
  'hsla(14,44%,23%,0.55)'
];

function lngLatToXY(lng, lat) {
  var x = (lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
  var y = 1 - (lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  return [x, y];
}

function screenToMap(sx, sy) {
  return [(sx - viewX) / viewScale, (sy - viewY) / viewScale];
}

function mapToScreen(mx, my) {
  return [mx * viewScale + viewX, my * viewScale + viewY];
}

// Check if a bounding box of a polygon set is in viewport
function isPolygonInView(province, W, H) {
  var polys = province.p;
  var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  // Use first ring of first polygon for quick bounds (approximate)
  for (var pi = 0; pi < polys.length; pi++) {
    var ring = polys[pi][0];
    for (var i = 0; i < ring.length; i += 3) { // sample every 3rd point for speed
      var xy = lngLatToXY(ring[i][0], ring[i][1]);
      var sxy = mapToScreen(xy[0], xy[1]);
      if (sxy[0] < minX) minX = sxy[0];
      if (sxy[0] > maxX) maxX = sxy[0];
      if (sxy[1] < minY) minY = sxy[1];
      if (sxy[1] > maxY) maxY = sxy[1];
    }
  }
  return maxX >= -50 && minX <= W + 50 && maxY >= -50 && minY <= H + 50;
}

// Precompute province visit counts
var _provVisitCache = {};
var _provVisitCacheKey = '';

function getProvinceVisitCount(provName) {
  var key = Object.keys(visited).length + '_' + provName;
  if (_provVisitCacheKey !== Object.keys(visited).join(',')) {
    _provVisitCache = {};
    _provVisitCacheKey = Object.keys(visited).join(',');
  }
  if (_provVisitCache[provName]) return _provVisitCache[provName];
  var provCities = CITIES.filter(function(c) { return c.p === provName; });
  var visitedCount = provCities.filter(function(c) { return visited[c.n]; }).length;
  var result = { total: provCities.length, visited: visitedCount };
  _provVisitCache[provName] = result;
  return result;
}

// Pulse animation state
var _pulsePhase = 0;
var _lastPulseTime = 0;

function draw() {
  var now = Date.now();
  var dpr = window.devicePixelRatio || 1;
  var cw = canvas.width / dpr;
  var ch = canvas.height / dpr;

  // Update pulse
  _pulsePhase = (now % 2000) / 2000; // 0-1 cycle every 2s

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ocean background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, cw, ch);

  // Draw provinces (filled + borders)
  for (var pi = 0; pi < PROVINCES.length; pi++) {
    var prov = PROVINCES[pi];

    // Viewport culling
    if (!isPolygonInView(prov, cw, ch)) continue;

    var vc = getProvinceVisitCount(prov.n);
    var hasVisited = vc.visited > 0;
    var isHovered = hoveredProvince === prov.n;

    // Fill province
    for (var gi = 0; gi < prov.p.length; gi++) {
      var polygon = prov.p[gi];
      for (var ri = 0; ri < polygon.length; ri++) {
        var ring = polygon[ri];
        ctx.beginPath();
        for (var i = 0; i < ring.length; i++) {
          var xy = lngLatToXY(ring[i][0], ring[i][1]);
          var sxy = mapToScreen(xy[0], xy[1]);
          if (i === 0) ctx.moveTo(sxy[0], sxy[1]);
          else ctx.lineTo(sxy[0], sxy[1]);
        }
        ctx.closePath();

        // Province fill
        if (hasVisited) {
          var intensity = vc.visited / vc.total;
          if (mode === 'province') {
            ctx.fillStyle = 'rgba(224,112,80,' + (0.15 + intensity * 0.55) + ')';
          } else {
            ctx.fillStyle = VISITED_PROVINCE_COLORS[pi % VISITED_PROVINCE_COLORS.length];
          }
        } else {
          ctx.fillStyle = PROVINCE_COLORS[pi % PROVINCE_COLORS.length];
        }
        if (isHovered) {
          ctx.fillStyle = hasVisited ? 'rgba(240,140,80,0.45)' : 'rgba(80,90,120,0.55)';
        }
        ctx.fill();

        // Province border
        if (mode === 'province') {
          ctx.strokeStyle = hasVisited ? 'rgba(240,160,96,0.6)' : 'rgba(100,110,140,0.5)';
          ctx.lineWidth = hasVisited ? 1.5 : 1;
        } else {
          ctx.strokeStyle = isHovered ? 'rgba(160,170,200,0.7)' : 'rgba(80,90,120,0.45)';
          ctx.lineWidth = isHovered ? 1.2 : 0.8;
        }
        ctx.stroke();
      }
    }

    // Province labels
    if (prov.c) {
      var showLabel = false;
      var fontSize;
      if (mode === 'province') {
        showLabel = true;
        fontSize = Math.max(8, Math.min(16, viewScale * 0.03));
      } else {
        // In city mode, show province names at lower zoom, hide at high zoom where city names show
        fontSize = Math.max(7, Math.min(14, viewScale * 0.025));
        showLabel = viewScale < baseScale * 4;
      }

      if (showLabel) {
        var cxy = lngLatToXY(prov.c[0], prov.c[1]);
        var csxy = mapToScreen(cxy[0], cxy[1]);
        if (csxy[0] > -50 && csxy[0] < cw + 50 && csxy[1] > -50 && csxy[1] < ch + 50) {
          ctx.font = (hasVisited ? 'bold ' : '') + fontSize + 'px "PingFang SC","Microsoft YaHei",sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (hasVisited) {
            ctx.fillStyle = mode === 'province' ? '#fff' : 'rgba(240,180,120,0.8)';
          } else {
            ctx.fillStyle = 'rgba(120,130,160,0.6)';
          }
          ctx.fillText(prov.n, csxy[0], csxy[1]);

          // Visit count in province mode
          if (mode === 'province' && hasVisited) {
            ctx.font = (fontSize - 2) + 'px sans-serif';
            ctx.fillStyle = 'rgba(240,160,96,0.9)';
            ctx.fillText(vc.visited + '/' + vc.total, csxy[0], csxy[1] + fontSize + 2);
          }
        }
      }
    }
  }

  // Draw cities
  if (mode === 'city') {
    var zoomLevel = viewScale / baseScale;
    var showCityNames = zoomLevel > 1.8;
    var showAllNames = zoomLevel > 3.5;
    var pulseSize = 0.5 + Math.sin(_pulsePhase * Math.PI * 2) * 0.5; // 0-1

    for (var ci = 0; ci < CITIES.length; ci++) {
      var city = CITIES[ci];
      var xy = lngLatToXY(city.lng, city.lat);
      var sxy = mapToScreen(xy[0], xy[1]);
      var sx = sxy[0], sy = sxy[1];

      if (sx < -30 || sx > cw + 30 || sy < -30 || sy > ch + 30) continue;

      var isVisited = !!visited[city.n];
      var isHovered = hoveredCity === city.n;
      var dotScale = Math.min(zoomLevel, 2.5);

      if (isVisited) {
        // Pulse glow
        var glowR = (6 + pulseSize * 8) * dotScale;
        var gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        gradient.addColorStop(0, 'rgba(240,140,80,' + (0.3 + pulseSize * 0.15) + ')');
        gradient.addColorStop(1, 'rgba(240,140,80,0)');
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core dot
        var r = (isHovered ? 5 : 3.5) * dotScale;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#ffb870' : '#e07050';
        ctx.fill();
        ctx.strokeStyle = '#f0a060';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        var r = (isHovered ? 3 : 1.8) * dotScale;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? 'rgba(160,170,200,0.9)' : 'rgba(70,80,110,0.5)';
        ctx.fill();
        if (isHovered) {
          ctx.strokeStyle = 'rgba(180,190,220,0.6)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // City names
      if (showCityNames && (isVisited || isHovered || showAllNames)) {
        var fs = Math.max(8, Math.min(13, 5 * zoomLevel));
        ctx.font = (isVisited ? 'bold ' : '') + fs + 'px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillStyle = isVisited ? '#f0a060' : (isHovered ? '#ccc' : 'rgba(140,150,180,0.6)');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(city.n, sx, sy - (isVisited ? 5 : 3) * dotScale - 3);
      }
    }
  }

  // Request next pulse frame if there are visited cities
  if (mode === 'city' && Object.keys(visited).length > 0) {
    if (!draw._rafId) {
      draw._rafId = requestAnimationFrame(function() {
        draw._rafId = null;
        draw();
      });
    }
  }
}

// Cancel pulse animation when not needed
draw._rafId = null;

// ====== Hit Testing ======

// Find nearest city to map coordinates (for click-anywhere in city mode)
function findNearestCity(mx, my) {
  var closest = null, closestDist = Infinity;
  for (var i = 0; i < CITIES.length; i++) {
    var city = CITIES[i];
    var xy = lngLatToXY(city.lng, city.lat);
    var dx = xy[0] - mx, dy = xy[1] - my;
    var dist = dx * dx + dy * dy;
    if (dist < closestDist) {
      closest = city;
      closestDist = dist;
    }
  }
  return closest;
}

// Check if point is inside China (any province polygon)
function isInsideChina(mx, my) {
  for (var pi = 0; pi < PROVINCES.length; pi++) {
    var prov = PROVINCES[pi];
    for (var gi = 0; gi < prov.p.length; gi++) {
      var ring = prov.p[gi][0];
      var inside = false;
      var pts = ring.map(function(c) { return lngLatToXY(c[0], c[1]); });
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var xi = pts[i][0], yi = pts[i][1];
        var xj = pts[j][0], yj = pts[j][1];
        if (((yi > my) !== (yj > my)) && mx < (xj - xi) * (my - yi) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) return true;
    }
  }
  return false;
}

// Find city at point - now finds nearest city if inside China
function findCityAt(mx, my) {
  // First check if inside China
  if (!isInsideChina(mx, my)) return null;
  return findNearestCity(mx, my);
}

function findProvinceAt(mx, my) {
  for (var pi = 0; pi < PROVINCES.length; pi++) {
    var prov = PROVINCES[pi];
    for (var gi = 0; gi < prov.p.length; gi++) {
      var ring = prov.p[gi][0];
      var inside = false;
      var pts = ring.map(function(c) { return lngLatToXY(c[0], c[1]); });
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var xi = pts[i][0], yi = pts[i][1];
        var xj = pts[j][0], yj = pts[j][1];
        if (((yi > my) !== (yj > my)) && mx < (xj - xi) * (my - yi) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) return prov;
    }
  }
  return null;
}
