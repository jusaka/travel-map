// ====== TopoJSON 解码 ======

// 省份名映射：TOPO_DATA名 → CITIES中的p字段名
var PROV_NAME_MAP = {
  '广西壮族': '广西',
  '宁夏回族': '宁夏',
  '新疆维吾尔': '新疆'
};

// 反向映射
var PROV_NAME_RMAP = {
  '广西': '广西壮族',
  '宁夏': '宁夏回族',
  '新疆': '新疆维吾尔'
};

// 标准化省份名（TOPO_DATA名 → CITIES名）
function normalizeProvName(topoName) {
  return PROV_NAME_MAP[topoName] || topoName;
}

// 解码单条arc
function decodeArc(arcIndex) {
  if (arcIndex >= 0) {
    return TOPO_DATA.arcs[arcIndex];
  } else {
    return TOPO_DATA.arcs[~arcIndex].slice().reverse();
  }
}

// 解码一个ring（一组arc索引）为连续坐标点
function decodeRing(arcIndices) {
  var points = [];
  for (var i = 0; i < arcIndices.length; i++) {
    var arc = decodeArc(arcIndices[i]);
    // 跳过第一个点（与上一条arc的最后一个点重复），除非是第一条arc
    var start = (i === 0) ? 0 : 1;
    for (var j = start; j < arc.length; j++) {
      points.push(arc[j]);
    }
  }
  return points;
}

// 解码整个省份的geometry为polygon数组
// 返回格式与旧PROVINCES兼容: [polygon, polygon, ...]
// 其中 polygon = [outerRing, hole1, hole2, ...]
// ring = [[lng, lat], ...]
function decodeProvince(province) {
  if (province.t === 'Polygon') {
    // a = [[ring0_arcs], [ring1_arcs], ...]  (first is outer, rest are holes)
    var polygon = [];
    for (var i = 0; i < province.a.length; i++) {
      polygon.push(decodeRing(province.a[i]));
    }
    return [polygon];
  } else if (province.t === 'MultiPolygon') {
    // a = [[[ring_arcs], ...], [[ring_arcs], ...], ...]
    var polygons = [];
    for (var i = 0; i < province.a.length; i++) {
      var polygon = [];
      for (var j = 0; j < province.a[i].length; j++) {
        polygon.push(decodeRing(province.a[i][j]));
      }
      polygons.push(polygon);
    }
    return polygons;
  }
  return [];
}

// 缓存解码后的省份数据
var _decodedProvinces = null;

function getDecodedProvinces() {
  if (_decodedProvinces) return _decodedProvinces;
  _decodedProvinces = [];
  for (var i = 0; i < TOPO_DATA.provinces.length; i++) {
    var prov = TOPO_DATA.provinces[i];
    if (!prov.n) continue; // 跳过九段线等空名省份
    _decodedProvinces.push({
      n: normalizeProvName(prov.n),
      c: prov.c,
      p: decodeProvince(prov)
    });
  }
  return _decodedProvinces;
}

// ====== 城市边界按需加载 ======
var PROV_ADCODE = {
  '北京':110000,'天津':120000,'河北':130000,'山西':140000,'内蒙古':150000,
  '辽宁':210000,'吉林':220000,'黑龙江':230000,'上海':310000,'江苏':320000,
  '浙江':330000,'安徽':340000,'福建':350000,'江西':360000,'山东':370000,
  '河南':410000,'湖北':420000,'湖南':430000,'广东':440000,'广西':450000,
  '海南':460000,'重庆':500000,'四川':510000,'贵州':520000,'云南':530000,
  '西藏':540000,'陕西':610000,'甘肃':620000,'青海':630000,'宁夏':640000,
  '新疆':650000
};

// Cache: provName → { arcs: [], cities: [{n, c, t, a}] } (decoded polygons)
var _cityBoundaryCache = {};
var _cityBoundaryLoading = {}; // provName → true if loading
var _cityBoundaryTotal = Object.keys(PROV_ADCODE).length; // 31
var _cityBoundaryLoaded = 0;
var _cityBoundaryReady = false; // all loaded

function loadCityBoundaries(provName) {
  if (_cityBoundaryCache[provName] || _cityBoundaryLoading[provName]) return;
  var adcode = PROV_ADCODE[provName];
  if (!adcode) return;
  
  _cityBoundaryLoading[provName] = true;
  fetch('data/cities/' + adcode + '.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var decoded = [];
      for (var i = 0; i < data.cities.length; i++) {
        var city = data.cities[i];
        var polygons = decodeCityGeom(city, data.arcs);
        decoded.push({
          n: city.n,
          c: city.c,
          p: polygons
        });
      }
      _cityBoundaryCache[provName] = decoded;
      delete _cityBoundaryLoading[provName];
      _cityBoundaryLoaded++;
      updateLoadingProgress();
      draw();
    })
    .catch(function() {
      delete _cityBoundaryLoading[provName];
      _cityBoundaryLoaded++;
      updateLoadingProgress();
    });
}

function updateLoadingProgress() {
  var bar = document.getElementById('loadingBar');
  var text = document.getElementById('loadingText');
  if (!bar) return;
  var pct = Math.round(_cityBoundaryLoaded / _cityBoundaryTotal * 100);
  bar.style.width = pct + '%';
  if (text) text.textContent = '加载城市数据 ' + _cityBoundaryLoaded + '/' + _cityBoundaryTotal;
  if (_cityBoundaryLoaded >= _cityBoundaryTotal) {
    _cityBoundaryReady = true;
    var container = document.getElementById('loadingIndicator');
    if (container) {
      container.style.transition = 'opacity 0.5s';
      container.style.opacity = '0';
      setTimeout(function() { container.style.display = 'none'; }, 500);
    }
  }
}

function preloadAllCityBoundaries() {
  var names = Object.keys(PROV_ADCODE);
  // Stagger loads to avoid flooding
  for (var i = 0; i < names.length; i++) {
    (function(name, delay) {
      setTimeout(function() { loadCityBoundaries(name); }, delay);
    })(names[i], i * 50); // 50ms apart
  }
}

function areCityBoundariesReady() {
  return _cityBoundaryReady;
}

function decodeCityGeom(city, arcs) {
  function decodeLocalArc(idx) {
    if (idx >= 0) return arcs[idx];
    return arcs[~idx].slice().reverse();
  }
  function decodeLocalRing(indices) {
    var pts = [];
    for (var i = 0; i < indices.length; i++) {
      var arc = decodeLocalArc(indices[i]);
      var start = (i === 0) ? 0 : 1;
      for (var j = start; j < arc.length; j++) pts.push(arc[j]);
    }
    return pts;
  }
  
  if (city.t === 'Polygon') {
    var poly = [];
    for (var i = 0; i < city.a.length; i++) poly.push(decodeLocalRing(city.a[i]));
    return [poly];
  } else if (city.t === 'MultiPolygon') {
    var polys = [];
    for (var i = 0; i < city.a.length; i++) {
      var poly = [];
      for (var j = 0; j < city.a[i].length; j++) poly.push(decodeLocalRing(city.a[i][j]));
      polys.push(poly);
    }
    return polys;
  }
  return [];
}

function getCityBoundaries(provName) {
  return _cityBoundaryCache[provName] || null;
}

// Get visible provinces at current zoom/pan
function getVisibleProvinces() {
  var visible = [];
  var provs = getDecodedProvinces();
  for (var i = 0; i < provs.length; i++) {
    var c = provs[i].c;
    if (!c) continue;
    var sxy = mapToScreen(lngLatToXY(c[0], c[1])[0], lngLatToXY(c[0], c[1])[1]);
    // Generous bounds check
    if (sxy[0] > -W && sxy[0] < W * 2 && sxy[1] > -H && sxy[1] < H * 2) {
      visible.push(provs[i].n);
    }
  }
  return visible;
}
