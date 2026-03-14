// ====== 事件处理 ======
function setupEvents() {
  // Pointer events
  canvas.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragViewX = viewX;
    dragViewY = viewY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', function(e) {
    if (isDragging) {
      viewX = dragViewX + (e.clientX - dragStartX);
      viewY = dragViewY + (e.clientY - dragStartY);
      draw();
      return;
    }
    var mxy = screenToMap(e.clientX, e.clientY);
    if (mode === 'city') {
      var city = findCityAt(mxy[0], mxy[1]);
      var newHovered = city ? city.n : null;
      if (newHovered !== hoveredCity) {
        hoveredCity = newHovered;
        canvas.style.cursor = city ? 'pointer' : 'grab';
        draw();
      }
    } else {
      var prov = findProvinceAt(mxy[0], mxy[1]);
      var newHoveredP = prov ? prov.n : null;
      if (newHoveredP !== hoveredProvince) {
        hoveredProvince = newHoveredP;
        canvas.style.cursor = prov ? 'pointer' : 'grab';
        draw();
      }
    }
  });

  canvas.addEventListener('pointerup', function(e) {
    var wasDrag = Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5;
    isDragging = false;
    if (wasDrag) return;
    var mxy = screenToMap(e.clientX, e.clientY);
    if (mode === 'city') {
      var city = findCityAt(mxy[0], mxy[1]);
      if (city) handleCityClick(city);
    } else {
      var prov = findProvinceAt(mxy[0], mxy[1]);
      if (prov) showProvDetail(prov.n);
    }
  });

  // Wheel zoom
  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.15 : 0.87;
    var newScale = Math.max(0.3, Math.min(10, viewScale * factor));
    var ratio = newScale / viewScale;
    viewX = e.clientX - (e.clientX - viewX) * ratio;
    viewY = e.clientY - (e.clientY - viewY) * ratio;
    viewScale = newScale;
    draw();
  }, { passive: false });

  // Touch pinch zoom
  var touches = {};
  canvas.addEventListener('touchstart', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      touches[t.identifier] = t;
    }
    var ids = Object.keys(touches);
    if (ids.length === 2) {
      var t1 = touches[ids[0]], t2 = touches[ids[1]];
      lastPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      touches[t.identifier] = t;
    }
    var ids = Object.keys(touches);
    if (ids.length === 2) {
      var t1 = touches[ids[0]], t2 = touches[ids[1]];
      var dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (lastPinchDist > 0) {
        var factor = dist / lastPinchDist;
        var cx = (t1.clientX + t2.clientX) / 2;
        var cy = (t1.clientY + t2.clientY) / 2;
        var newScale = Math.max(0.3, Math.min(10, viewScale * factor));
        var ratio = newScale / viewScale;
        viewX = cx - (cx - viewX) * ratio;
        viewY = cy - (cy - viewY) * ratio;
        viewScale = newScale;
        draw();
      }
      lastPinchDist = dist;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      delete touches[e.changedTouches[i].identifier];
    }
    if (Object.keys(touches).length < 2) lastPinchDist = 0;
  }, { passive: true });

  // Close search on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-box')) {
      document.getElementById('searchResults').classList.remove('show');
    }
  });
}

// ====== 搜索 ======
function onSearch(query) {
  var box = document.getElementById('searchResults');
  if (!query.trim()) { box.classList.remove('show'); return; }
  var q = query.toLowerCase();
  var results = CITIES.filter(function(c) { return c.n.includes(q) || c.p.includes(q); }).slice(0, 10);
  if (results.length === 0) { box.classList.remove('show'); return; }
  box.innerHTML = results.map(function(c) {
    return '<div onclick="selectSearchCity(\'' + c.n + '\')">' + (visited[c.n] ? '🔴 ' : '⚪ ') + c.n + '<span class="prov">' + c.p + '</span></div>';
  }).join('');
  box.classList.add('show');
}

function selectSearchCity(name) {
  document.getElementById('searchResults').classList.remove('show');
  document.getElementById('searchInput').value = '';
  var city = CITIES.find(function(c) { return c.n === name; });
  if (!city) return;
  var xy = lngLatToXY(city.lng, city.lat);
  viewScale = 2;
  viewX = W / 2 - xy[0] * viewScale;
  viewY = H / 2 - xy[1] * viewScale;
  hoveredCity = city.n;
  if (mode !== 'city') setMode('city');
  draw();
  setTimeout(function() { handleCityClick(city); }, 300);
}
