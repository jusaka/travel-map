// ====== 事件处理 ======

// 拖拽检测阈值（px），手机上需要更大
var DRAG_THRESHOLD = 10;
// 记录初始viewScale用于zoom限制
var baseScale = 1;

function setupEvents() {
  // ====== Pointer事件（拖拽 + 点击）======
  var pointerDownTime = 0;

  canvas.addEventListener('pointerdown', function(e) {
    // 多指触控时不处理pointer事件，交给touch事件
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragViewX = viewX;
    dragViewY = viewY;
    pointerDownTime = Date.now();
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', function(e) {
    if (isDragging) {
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      // 只有超过阈值才真正拖动，避免手指微抖触发
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        viewX = dragViewX + dx;
        viewY = dragViewY + dy;
        draw();
      }
      return;
    }
    // PC hover效果
    if (e.pointerType === 'mouse') {
      var mxy = screenToMap(e.clientX, e.clientY);
      var zoomLevel = baseScale > 0 ? viewScale / baseScale : 1;

      if (zoomLevel >= 2) {
        var city = findCityAt(mxy[0], mxy[1]);
        var newHovered = city ? city.n : null;
        var newHoveredP = city ? city.p : null;
        if (newHovered !== hoveredCity || newHoveredP !== hoveredProvince) {
          hoveredCity = newHovered;
          hoveredProvince = newHoveredP;
          canvas.style.cursor = city ? 'pointer' : 'grab';
          draw();
        }
      } else {
        var prov = findProvinceAt(mxy[0], mxy[1]);
        var newHoveredP = prov ? prov.n : null;
        if (newHoveredP !== hoveredProvince) {
          hoveredProvince = newHoveredP;
          hoveredCity = null;
          canvas.style.cursor = prov ? 'pointer' : 'grab';
          draw();
        }
      }
    }
  });

  // 双击检测
  var lastTapTime = 0;
  var lastTapX = 0, lastTapY = 0;
  var singleTapTimer = null;

  canvas.addEventListener('pointerup', function(e) {
    var dx = Math.abs(e.clientX - dragStartX);
    var dy = Math.abs(e.clientY - dragStartY);
    var dt = Date.now() - pointerDownTime;
    var wasDrag = dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD || dt > 500;
    isDragging = false;

    if (wasDrag) return;
    if (activeTouchCount > 1) return;

    var now = Date.now();
    var tapDx = Math.abs(e.clientX - lastTapX);
    var tapDy = Math.abs(e.clientY - lastTapY);

    // 双击判定：300ms内、位置接近
    if (now - lastTapTime < 300 && tapDx < 30 && tapDy < 30) {
      // 双击放大
      clearTimeout(singleTapTimer);
      lastTapTime = 0;
      zoomAt(e.clientX, e.clientY, 2);
      return;
    }

    lastTapTime = now;
    lastTapX = e.clientX;
    lastTapY = e.clientY;

    // 延迟单击，等双击判定
    var cx = e.clientX, cy = e.clientY;
    singleTapTimer = setTimeout(function() {
      var mxy = screenToMap(cx, cy);
      var zoomLevel = baseScale > 0 ? viewScale / baseScale : 1;

      if (zoomLevel >= 2) {
        // 放大状态 → 城市模式
        var city = findCityAt(mxy[0], mxy[1]);
        if (city) handleCityClick(city);
      } else {
        // 缩小状态 → 省份点击，但预选最近城市
        var prov = findProvinceAt(mxy[0], mxy[1]);
        if (prov) {
          // 找到点击位置最近的城市作为预选
          var nearestCity = findNearestCityInProv(mxy[0], mxy[1], prov.n);
          showProvDetail(prov.n, nearestCity);
        }
      }
    }, 300);
  });

  canvas.addEventListener('pointercancel', function() {
    isDragging = false;
  });

  // ====== 鼠标滚轮缩放 ======
  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  // ====== 触摸缩放（pinch zoom）======
  var activeTouches = {};
  var activeTouchCount = 0;
  var lastPinchCenter = null;
  var lastPinchScale = null;

  canvas.addEventListener('touchstart', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      activeTouches[t.identifier] = { x: t.clientX, y: t.clientY };
    }
    activeTouchCount = Object.keys(activeTouches).length;

    if (activeTouchCount === 2) {
      // 开始pinch，取消拖拽
      isDragging = false;
      var ids = Object.keys(activeTouches);
      var t1 = activeTouches[ids[0]], t2 = activeTouches[ids[1]];
      lastPinchDist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      lastPinchCenter = { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };
      lastPinchScale = viewScale;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      activeTouches[t.identifier] = { x: t.clientX, y: t.clientY };
    }

    var ids = Object.keys(activeTouches);
    if (ids.length >= 2) {
      var t1 = activeTouches[ids[0]], t2 = activeTouches[ids[1]];
      var dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      var cx = (t1.x + t2.x) / 2;
      var cy = (t1.y + t2.y) / 2;

      if (lastPinchDist > 0) {
        var factor = dist / lastPinchDist;
        zoomAt(cx, cy, factor);
      }

      // 双指平移
      if (lastPinchCenter) {
        viewX += cx - lastPinchCenter.x;
        viewY += cy - lastPinchCenter.y;
        draw();
      }

      lastPinchDist = dist;
      lastPinchCenter = { x: cx, y: cy };
    }
  }, { passive: true });

  canvas.addEventListener('touchend', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      delete activeTouches[e.changedTouches[i].identifier];
    }
    activeTouchCount = Object.keys(activeTouches).length;
    if (activeTouchCount < 2) {
      lastPinchDist = 0;
      lastPinchCenter = null;
      lastPinchScale = null;
    }
  }, { passive: true });

  canvas.addEventListener('touchcancel', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      delete activeTouches[e.changedTouches[i].identifier];
    }
    activeTouchCount = Object.keys(activeTouches).length;
  }, { passive: true });

  // 关闭搜索结果
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-box')) {
      document.getElementById('searchResults').classList.remove('show');
    }
  });
}

// ====== 缩放工具函数 ======
function zoomAt(cx, cy, factor) {
  var minScale = baseScale * 0.5;
  var maxScale = baseScale * 15;
  var newScale = Math.max(minScale, Math.min(maxScale, viewScale * factor));
  var ratio = newScale / viewScale;
  viewX = cx - (cx - viewX) * ratio;
  viewY = cy - (cy - viewY) * ratio;
  viewScale = newScale;
  updateZoomLevel();
  draw();
}

function updateZoomLevel() {
  var el = document.getElementById('zoomLevel');
  if (el && baseScale > 0) {
    var level = viewScale / baseScale;
    el.textContent = level < 1 ? level.toFixed(1) + 'x' : Math.round(level) + 'x';
  }
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
  // 缩放到城市位置
  var xy = lngLatToXY(city.lng, city.lat);
  var targetScale = baseScale * 3;
  viewScale = targetScale;
  viewX = W / 2 - xy[0] * viewScale;
  viewY = H / 2 - xy[1] * viewScale;
  hoveredCity = city.n;
  updateZoomLevel();
  draw();
  // 延迟弹出详情
  setTimeout(function() { handleCityClick(city); }, 300);
}
