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
