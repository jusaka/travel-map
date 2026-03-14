// ====== 投影 & 渲染 ======
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

function drawProvincePath(province) {
  for (var pi = 0; pi < province.p.length; pi++) {
    var polygon = province.p[pi];
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
    }
  }
}

function getProvinceVisitCount(provName) {
  var provCities = CITIES.filter(function(c) { return c.p === provName; });
  var visitedCount = provCities.filter(function(c) { return visited[c.n]; }).length;
  return { total: provCities.length, visited: visitedCount };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var dpr = window.devicePixelRatio || 1;

  for (var pi = 0; pi < PROVINCES.length; pi++) {
    var prov = PROVINCES[pi];
    var vc = getProvinceVisitCount(prov.n);

    if (mode === 'province') {
      drawProvincePath(prov);
      if (vc.visited > 0) {
        var intensity = vc.visited / vc.total;
        ctx.fillStyle = 'rgba(224,112,80,' + (0.15 + intensity * 0.55) + ')';
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(30,30,46,0.6)';
        ctx.fill();
      }
    }

    // Province borders
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
        ctx.strokeStyle = mode === 'province' ? 'rgba(224,112,80,0.3)' : 'rgba(60,60,80,0.5)';
        ctx.lineWidth = mode === 'province' ? 1.2 : 0.8;
        ctx.stroke();
      }
    }

    // Province labels in province mode
    if (mode === 'province' && prov.c && viewScale > 0.7) {
      var cxy = lngLatToXY(prov.c[0], prov.c[1]);
      var csxy = mapToScreen(cxy[0], cxy[1]);
      var fontSize = Math.max(9, Math.min(14, 11 * viewScale));
      ctx.font = fontSize + 'px sans-serif';
      ctx.fillStyle = vc.visited > 0 ? '#fff' : 'rgba(150,150,170,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(prov.n, csxy[0], csxy[1]);
      if (vc.visited > 0) {
        ctx.font = (fontSize - 2) + 'px sans-serif';
        ctx.fillStyle = 'rgba(240,160,96,0.9)';
        ctx.fillText(vc.visited + '/' + vc.total, csxy[0], csxy[1] + fontSize);
      }
    }
  }

  // Draw cities in city mode
  if (mode === 'city') {
    for (var ci = 0; ci < CITIES.length; ci++) {
      var city = CITIES[ci];
      var xy = lngLatToXY(city.lng, city.lat);
      var sxy = mapToScreen(xy[0], xy[1]);
      var sx = sxy[0], sy = sxy[1];

      if (sx < -20 || sx > canvas.width / dpr * dpr + 20 || sy < -20 || sy > canvas.height / dpr * dpr + 20) continue;

      var isVisited = !!visited[city.n];
      var isHovered = hoveredCity === city.n;
      var baseR = isVisited ? 4 : 2.5;
      var r = (isHovered ? baseR + 2 : baseR) * Math.min(viewScale, 2);

      if (isVisited) {
        ctx.beginPath();
        ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224,112,80,0.15)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#e07050';
        ctx.fill();
        ctx.strokeStyle = '#f0a060';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? 'rgba(150,150,180,0.8)' : 'rgba(80,80,100,0.5)';
        ctx.fill();
      }

      if ((isVisited || isHovered) && viewScale > 0.8) {
        var fs = Math.max(9, Math.min(13, 10 * viewScale));
        ctx.font = fs + 'px sans-serif';
        ctx.fillStyle = isVisited ? '#f0a060' : '#aaa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(city.n, sx, sy - r - 3);
      }
    }
  }
}

// ====== Hit Testing ======
function findCityAt(mx, my) {
  var closest = null, closestDist = Infinity;
  // 手机上hit area需要更大，至少20px对应的地图距离
  var hitPx = ('ontouchstart' in window) ? 28 : 16;
  var hitR = hitPx / viewScale;
  for (var i = 0; i < CITIES.length; i++) {
    var city = CITIES[i];
    var xy = lngLatToXY(city.lng, city.lat);
    var dx = xy[0] - mx, dy = xy[1] - my;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < hitR && dist < closestDist) {
      closest = city;
      closestDist = dist;
    }
  }
  return closest;
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
