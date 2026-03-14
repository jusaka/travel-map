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

// Large provinces that show labels at low zoom
var LARGE_PROVINCES = ['新疆','西藏','内蒙古','青海','四川','黑龙江','甘肃','云南','广西','湖南','陕西','广东','河北','湖北','贵州','山东','江西'];

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
  for (var pi = 0; pi < polys.length; pi++) {
    var ring = polys[pi][0];
    for (var i = 0; i < ring.length; i += 3) {
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

// Helper: trace a province polygon path (one ring)
function traceRing(ctx, ring) {
  for (var i = 0; i < ring.length; i++) {
    var xy = lngLatToXY(ring[i][0], ring[i][1]);
    var sxy = mapToScreen(xy[0], xy[1]);
    if (i === 0) ctx.moveTo(sxy[0], sxy[1]);
    else ctx.lineTo(sxy[0], sxy[1]);
  }
}

// Label collision detection
function labelFits(usedRects, x, y, w, h) {
  var r = { x: x - w / 2, y: y - h / 2, w: w, h: h };
  for (var i = 0; i < usedRects.length; i++) {
    var o = usedRects[i];
    if (r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y) {
      return false;
    }
  }
  usedRects.push(r);
  return true;
}

function draw() {
  var now = Date.now();
  var dpr = window.devicePixelRatio || 1;
  var cw = canvas.width / dpr;
  var ch = canvas.height / dpr;
  var zoomLevel = baseScale > 0 ? viewScale / baseScale : 1;

  _pulsePhase = (now % 2000) / 2000;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ocean background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, cw, ch);

  // ========== PASS 1: Fill all provinces ==========
  for (var pi = 0; pi < PROVINCES.length; pi++) {
    var prov = PROVINCES[pi];
    if (!isPolygonInView(prov, cw, ch)) continue;

    var vc = getProvinceVisitCount(prov.n);
    var hasVisited = vc.visited > 0;
    var isHov = hoveredProvince === prov.n;

    for (var gi = 0; gi < prov.p.length; gi++) {
      var polygon = prov.p[gi];
      for (var ri = 0; ri < polygon.length; ri++) {
        var ring = polygon[ri];
        ctx.beginPath();
        traceRing(ctx, ring);
        ctx.closePath();

        if (isHov) {
          ctx.fillStyle = hasVisited ? 'rgba(240,140,80,0.45)' : 'rgba(80,90,120,0.55)';
        } else if (hasVisited) {
          var intensity = vc.visited / vc.total;
          if (zoomLevel < 2) {
            // 省份模式：更明显的打卡高亮
            ctx.fillStyle = 'rgba(224,112,80,' + (0.15 + intensity * 0.55) + ')';
          } else {
            ctx.fillStyle = VISITED_PROVINCE_COLORS[pi % VISITED_PROVINCE_COLORS.length];
          }
        } else {
          ctx.fillStyle = PROVINCE_COLORS[pi % PROVINCE_COLORS.length];
        }
        ctx.fill();
      }
    }
  }

  // ========== PASS 2: Stroke all province borders (single pass = clean lines) ==========
  ctx.beginPath();
  var borderVisitedPath = new Path2D();
  var borderNormalPath = new Path2D();

  for (var pi = 0; pi < PROVINCES.length; pi++) {
    var prov = PROVINCES[pi];
    if (!isPolygonInView(prov, cw, ch)) continue;

    var vc = getProvinceVisitCount(prov.n);
    var hasVisited = vc.visited > 0;
    var isHov = hoveredProvince === prov.n;

    // Hovered provinces get drawn separately for highlight
    if (isHov) continue;

    var targetPath = (zoomLevel < 2 && hasVisited) ? borderVisitedPath : borderNormalPath;
    for (var gi = 0; gi < prov.p.length; gi++) {
      var polygon = prov.p[gi];
      for (var ri = 0; ri < polygon.length; ri++) {
        var ring = polygon[ri];
        for (var i = 0; i < ring.length; i++) {
          var xy = lngLatToXY(ring[i][0], ring[i][1]);
          var sxy = mapToScreen(xy[0], xy[1]);
          if (i === 0) targetPath.moveTo(sxy[0], sxy[1]);
          else targetPath.lineTo(sxy[0], sxy[1]);
        }
        targetPath.closePath();
      }
    }
  }

  // Draw normal borders
  ctx.strokeStyle = 'rgba(80,90,120,0.45)';
  ctx.lineWidth = 0.8;
  ctx.stroke(borderNormalPath);

  // Draw visited borders (zoomed out = province mode look)
  if (zoomLevel < 2) {
    ctx.strokeStyle = 'rgba(240,160,96,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke(borderVisitedPath);
  } else {
    ctx.strokeStyle = 'rgba(80,90,120,0.45)';
    ctx.lineWidth = 0.8;
    ctx.stroke(borderVisitedPath);
  }

  // Draw hovered province border on top
  if (hoveredProvince) {
    for (var pi = 0; pi < PROVINCES.length; pi++) {
      var prov = PROVINCES[pi];
      if (prov.n !== hoveredProvince) continue;
      ctx.beginPath();
      for (var gi = 0; gi < prov.p.length; gi++) {
        var polygon = prov.p[gi];
        for (var ri = 0; ri < polygon.length; ri++) {
          traceRing(ctx, polygon[ri]);
          ctx.closePath();
        }
      }
      ctx.strokeStyle = 'rgba(160,170,200,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ========== PASS 3: City coverage circles (zoom > 4x) ==========
  if (zoomLevel > 4) {
    var circleAlpha = Math.min(0.15, (zoomLevel - 4) * 0.05);
    for (var ci = 0; ci < CITIES.length; ci++) {
      var city = CITIES[ci];
      var xy = lngLatToXY(city.lng, city.lat);
      var sxy = mapToScreen(xy[0], xy[1]);
      if (sxy[0] < -100 || sxy[0] > cw + 100 || sxy[1] < -100 || sxy[1] > ch + 100) continue;

      var isV = !!visited[city.n];
      // Draw a small dashed circle around each city representing approximate coverage
      var coverageR = viewScale * 0.012; // roughly proportional
      ctx.beginPath();
      ctx.arc(sxy[0], sxy[1], coverageR, 0, Math.PI * 2);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isV ? 'rgba(240,160,96,' + circleAlpha + ')' : 'rgba(100,110,140,' + circleAlpha + ')';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ========== PASS 4: City dots (zoom-dependent) ==========
  var showVisitedDots = zoomLevel >= 2;
  var showAllDots = zoomLevel > 4;
  var pulseSize = 0.5 + Math.sin(_pulsePhase * Math.PI * 2) * 0.5;
  var needsPulse = false;

  if (showVisitedDots || showAllDots) {
    var dotScale = Math.min(zoomLevel, 2.5);
    for (var ci = 0; ci < CITIES.length; ci++) {
      var city = CITIES[ci];
      var isVisited = !!visited[city.n];
      var isHov = hoveredCity === city.n;

      // Decide visibility
      if (!showAllDots && !isVisited && !isHov) continue;

      var xy = lngLatToXY(city.lng, city.lat);
      var sxy = mapToScreen(xy[0], xy[1]);
      var sx = sxy[0], sy = sxy[1];
      if (sx < -30 || sx > cw + 30 || sy < -30 || sy > ch + 30) continue;

      if (isVisited) {
        needsPulse = true;
        // Pulse glow
        var glowR = (6 + pulseSize * 8) * dotScale;
        var gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        gradient.addColorStop(0, 'rgba(240,140,80,' + (0.3 + pulseSize * 0.15) + ')');
        gradient.addColorStop(1, 'rgba(240,140,80,0)');
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        var r = (isHov ? 5 : 3.5) * dotScale;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? '#ffb870' : '#e07050';
        ctx.fill();
        ctx.strokeStyle = '#f0a060';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        var r = (isHov ? 3 : 1.8) * dotScale;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? 'rgba(160,170,200,0.9)' : 'rgba(70,80,110,0.5)';
        ctx.fill();
        if (isHov) {
          ctx.strokeStyle = 'rgba(180,190,220,0.6)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  // ========== PASS 5: Labels with collision detection ==========
  var usedRects = [];

  // Province labels
  var showAllProvLabels = zoomLevel >= 1.5;
  var provLabelFade = zoomLevel > 3; // fade at high zoom

  for (var pi = 0; pi < PROVINCES.length; pi++) {
    var prov = PROVINCES[pi];
    if (!prov.c) continue;
    if (!isPolygonInView(prov, cw, ch)) continue;

    var vc = getProvinceVisitCount(prov.n);
    var hasVisited = vc.visited > 0;

    // Decide if label should show
    var isLarge = LARGE_PROVINCES.indexOf(prov.n) >= 0;
    if (!showAllProvLabels && !isLarge) continue;

    var cxy = lngLatToXY(prov.c[0], prov.c[1]);
    var csxy = mapToScreen(cxy[0], cxy[1]);
    if (csxy[0] < -50 || csxy[0] > cw + 50 || csxy[1] < -50 || csxy[1] > ch + 50) continue;

    var fontSize;
    var alpha;
    if (zoomLevel < 2) {
      fontSize = Math.max(8, Math.min(16, viewScale * 0.03));
      alpha = 1;
    } else {
      fontSize = Math.max(7, Math.min(14, viewScale * 0.025));
      alpha = provLabelFade ? Math.max(0.2, 1 - (zoomLevel - 3) * 0.3) : 1;
      if (zoomLevel > 6) continue; // hide province labels at very high zoom
    }

    // Measure and check collision
    ctx.font = (hasVisited ? 'bold ' : '') + fontSize + 'px "PingFang SC","Microsoft YaHei",sans-serif';
    var tw = ctx.measureText(prov.n).width;
    var th = fontSize * 1.3;

    // Priority: visited > large > others
    var priority = (hasVisited ? 2 : 0) + (isLarge ? 1 : 0);
    if (priority < 2 && !labelFits(usedRects, csxy[0], csxy[1], tw + 6, th + 4)) continue;
    if (priority >= 2) labelFits(usedRects, csxy[0], csxy[1], tw + 6, th + 4); // always show but register

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (hasVisited) {
      ctx.fillStyle = zoomLevel < 2
        ? 'rgba(255,255,255,' + alpha + ')'
        : 'rgba(240,180,120,' + (0.8 * alpha) + ')';
    } else {
      ctx.fillStyle = 'rgba(120,130,160,' + (0.6 * alpha) + ')';
    }
    ctx.fillText(prov.n, csxy[0], csxy[1]);

    // Visit count when zoomed out (province mode)
    if (zoomLevel < 2 && hasVisited) {
      ctx.font = (fontSize - 2) + 'px sans-serif';
      ctx.fillStyle = 'rgba(240,160,96,' + (0.9 * alpha) + ')';
      ctx.fillText(vc.visited + '/' + vc.total, csxy[0], csxy[1] + fontSize + 2);
      // Register the count label too
      labelFits(usedRects, csxy[0], csxy[1] + fontSize + 2, ctx.measureText(vc.visited + '/' + vc.total).width + 4, fontSize);
    }
  }

  // City labels (zoom > 4x visited, > 6x all)
  var showVisitedCityNames = zoomLevel > 4;
  var showAllCityNames = zoomLevel > 6;

  if (showVisitedCityNames) {
    // Sort: visited cities first for label priority
    var sortedCities = [];
    for (var ci = 0; ci < CITIES.length; ci++) sortedCities.push(ci);
    sortedCities.sort(function(a, b) {
      var va = visited[CITIES[a].n] ? 1 : 0;
      var vb = visited[CITIES[b].n] ? 1 : 0;
      return vb - va;
    });

    for (var si = 0; si < sortedCities.length; si++) {
      var ci = sortedCities[si];
      var city = CITIES[ci];
      var isVisited = !!visited[city.n];
      var isHov = hoveredCity === city.n;

      if (!showAllCityNames && !isVisited && !isHov) continue;

      var xy = lngLatToXY(city.lng, city.lat);
      var sxy = mapToScreen(xy[0], xy[1]);
      var sx = sxy[0], sy = sxy[1];
      if (sx < -30 || sx > cw + 30 || sy < -30 || sy > ch + 30) continue;

      var fs = Math.max(8, Math.min(13, 5 * zoomLevel));
      ctx.font = (isVisited ? 'bold ' : '') + fs + 'px "PingFang SC","Microsoft YaHei",sans-serif';
      var tw = ctx.measureText(city.n).width;
      var labelY = sy - (isVisited ? 5 : 3) * Math.min(zoomLevel, 2.5) - 5;

      if (!isHov && !labelFits(usedRects, sx, labelY, tw + 4, fs + 2)) continue;
      if (isHov) labelFits(usedRects, sx, labelY, tw + 4, fs + 2);

      ctx.fillStyle = isVisited ? '#f0a060' : (isHov ? '#ccc' : 'rgba(140,150,180,0.6)');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(city.n, sx, labelY + fs / 2);
    }
  }

  // Request next pulse frame if needed
  if (needsPulse) {
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

function findCityAt(mx, my) {
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

// Find nearest city within a specific province
function findNearestCityInProv(mx, my, provName) {
  var closest = null, closestDist = Infinity;
  for (var i = 0; i < CITIES.length; i++) {
    if (CITIES[i].p !== provName) continue;
    var xy = lngLatToXY(CITIES[i].lng, CITIES[i].lat);
    var dx = xy[0] - mx, dy = xy[1] - my;
    var dist = dx * dx + dy * dy;
    if (dist < closestDist) {
      closest = CITIES[i];
      closestDist = dist;
    }
  }
  return closest;
}
