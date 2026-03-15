// ====== UI操作 ======

// City actions — 点击城市统一弹窗，不直接打卡
function handleCityClick(city) {
  openCityModal(city);
}

function openCityModal(city) {
  selectedCity = city;
  var isVisited = !!visited[city.n];
  document.getElementById('modalCityName').textContent = city.n;
  document.getElementById('modalCityInfo').textContent = city.p + ' · ' + city.lng + '°E ' + city.lat + '°N';
  document.getElementById('modalNote').value = (visited[city.n] && visited[city.n].note) || '';

  // 根据是否已打卡显示不同按钮
  document.getElementById('modalVisitBtn').style.display = isVisited ? 'none' : 'block';
  document.getElementById('modalUnvisit').style.display = isVisited ? 'block' : 'none';
  document.getElementById('modalSaveBtn').style.display = isVisited ? 'block' : 'none';
  document.getElementById('modalNote').placeholder = isVisited ? '写点什么...你在这座城市的回忆' : '可以顺便写点备注，打卡时一起保存~';
  document.getElementById('modalNote').disabled = false;

  document.getElementById('cityModal').classList.add('show');
}

function closeCityModal() {
  document.getElementById('cityModal').classList.remove('show');
  selectedCity = null;
}

function visitCity() {
  if (!selectedCity) return;
  var note = document.getElementById('modalNote').value || '';
  visited[selectedCity.n] = { note: note, time: Date.now() };
  saveData();
  updateStats();
  showToast('✅ ' + selectedCity.n + ' 已打卡！');
  closeCityModal();
  draw();
}

function saveCityNote() {
  if (!selectedCity) return;
  if (!visited[selectedCity.n]) visited[selectedCity.n] = { time: Date.now() };
  visited[selectedCity.n].note = document.getElementById('modalNote').value;
  saveData();
  showToast('💾 已保存');
  closeCityModal();
  draw();
}

function unvisitCity() {
  if (!selectedCity) return;
  showConfirm('确定取消「' + selectedCity.n + '」的打卡记录吗？', function() {
    delete visited[selectedCity.n];
    saveData();
    updateStats();
    showToast('❌ ' + selectedCity.n + ' 已取消打卡');
    closeCityModal();
    draw();
  });
}

// Generic confirm modal (replaces native confirm())
var _confirmCallback = null;
function showConfirm(msg, onOk) {
  _confirmCallback = onOk;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmModal').classList.add('show');
}
function doConfirmOk() {
  document.getElementById('confirmModal').classList.remove('show');
  if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
}
function doConfirmCancel() {
  document.getElementById('confirmModal').classList.remove('show');
  _confirmCallback = null;
}

// Generic prompt modal (replaces native prompt())
var _promptCallback = null;
function showPrompt(msg, defaultVal, onOk) {
  _promptCallback = onOk;
  document.getElementById('promptMsg').textContent = msg;
  document.getElementById('promptInput').value = defaultVal || '';
  document.getElementById('promptModal').classList.add('show');
  setTimeout(function() { document.getElementById('promptInput').focus(); }, 50);
}
function doPromptOk() {
  var val = document.getElementById('promptInput').value.trim();
  document.getElementById('promptModal').classList.remove('show');
  if (_promptCallback && val) { _promptCallback(val); _promptCallback = null; }
}
function doPromptCancel() {
  document.getElementById('promptModal').classList.remove('show');
  _promptCallback = null;
}

// Mode
function setMode(m) {
  mode = m;
  document.getElementById('cityModeBtn').classList.toggle('active', m === 'city');
  document.getElementById('provModeBtn').classList.toggle('active', m === 'province');
  draw();
}

// Province detail
function showProvDetail(provName, nearestCity) {
  var panel = document.getElementById('provDetail');
  document.getElementById('provDetailName').textContent = provName;
  var cities = CITIES.filter(function(c) { return c.p === provName; });
  var vc = cities.filter(function(c) { return visited[c.n]; }).length;
  document.getElementById('provDetailInfo').textContent = '已打卡 ' + vc + '/' + cities.length + ' 座城市';
  var list = document.getElementById('provDetailCities');

  // Sort: nearest city first (pre-selected), then visited, then rest
  var sorted = cities.slice().sort(function(a, b) {
    if (nearestCity) {
      if (a.n === nearestCity.n) return -1;
      if (b.n === nearestCity.n) return 1;
    }
    var va = visited[a.n] ? 1 : 0;
    var vb = visited[b.n] ? 1 : 0;
    return vb - va;
  });

  list.innerHTML = sorted.map(function(c) {
    var v = visited[c.n];
    var isNearest = nearestCity && c.n === nearestCity.n;
    return '<div class="city-item ' + (v ? 'visited' : '') + (isNearest ? ' nearest' : '') + '" onclick="provCityClick(\'' + c.n + '\')">' +
      (v ? '🔴' : (isNearest ? '👉' : '⚪')) + ' ' + c.n +
      (v && v.note ? '<div class="note-preview">📝 ' + v.note + '</div>' : '') +
    '</div>';
  }).join('');
  panel.classList.add('show');
}

function closeProvDetail() {
  document.getElementById('provDetail').classList.remove('show');
}

function provCityClick(name) {
  var city = CITIES.find(function(c) { return c.n === name; });
  if (!city) return;
  // 统一弹窗，不直接打卡
  openCityModal(city);
}

// Stats
function updateStats() {
  var totalCities = CITIES.length;
  var visitedCities = Object.keys(visited).length;
  var visitedProvs = new Set(CITIES.filter(function(c) { return visited[c.n]; }).map(function(c) { return c.p; })).size;
  var pct = Math.round(visitedCities / totalCities * 100);

  document.getElementById('statProvinces').textContent = visitedProvs + '/34';
  document.getElementById('statCities').textContent = visitedCities + '/' + totalCities;
  document.getElementById('statPercent').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';

  var rank, emoji;
  if (visitedCities === 0) { rank = '家里蹲'; emoji = '🏠'; }
  else if (visitedCities <= 3) { rank = '出门遛弯'; emoji = '🚶'; }
  else if (visitedCities <= 8) { rank = '小有出行'; emoji = '👟'; }
  else if (visitedCities <= 15) { rank = '初出茅庐'; emoji = '🎒'; }
  else if (visitedCities <= 30) { rank = '渐入佳境'; emoji = '🚄'; }
  else if (visitedCities <= 50) { rank = '行者无疆'; emoji = '✈️'; }
  else if (visitedCities <= 80) { rank = '旅行达人'; emoji = '🌏'; }
  else if (visitedCities <= 120) { rank = '走南闯北'; emoji = '🧭'; }
  else if (visitedCities <= 180) { rank = '半壁江山'; emoji = '🗺️'; }
  else if (visitedCities <= 250) { rank = '走遍中国'; emoji = '🏔️'; }
  else if (visitedCities <= 330) { rank = '地理大师'; emoji = '🎓'; }
  else { rank = '全境制霸'; emoji = '👑'; }

  document.getElementById('rankTitle').textContent = rank;
  document.getElementById('rankBadge').textContent = emoji + ' ' + rank;
}

function toggleStats() {
  statsCollapsed = !statsCollapsed;
  document.getElementById('statsPanel').classList.toggle('collapsed', statsCollapsed);
  document.getElementById('statsArrow').textContent = statsCollapsed ? '▲' : '▼';
}

// Import/Export
// IO panel removed — export/import/share are direct toolbar actions now

// ====== 紧凑编码 v2 ======
// 格式: "TM2:" + base64(gzip(JSON))
// JSON: { v: [adcode1, adcode2, ...], n: {adcode: "note", ...} }
// 使用adcode而非索引，数据更新不会崩溃
// 兼容旧格式 "TM1:" (bitmap based)

async function compressData(jsonStr) {
  var blob = new Blob([jsonStr]);
  var ds = new CompressionStream('gzip');
  var stream = blob.stream().pipeThrough(ds);
  var buf = await new Response(stream).arrayBuffer();
  var bytes = new Uint8Array(buf);
  var binary = '';
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decompressData(b64) {
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  var blob = new Blob([bytes]);
  var ds = new DecompressionStream('gzip');
  var stream = blob.stream().pipeThrough(ds);
  return await new Response(stream).text();
}

function encodeVisited() {
  var adcodes = [];
  var notes = {};
  for (var name in visited) {
    var adcode = CITY_ADCODE[name];
    if (!adcode) continue;
    adcodes.push(adcode);
    if (visited[name] && visited[name].note) {
      notes[adcode] = visited[name].note;
    }
  }
  var payload = { v: adcodes };
  if (Object.keys(notes).length > 0) payload.n = notes;
  return JSON.stringify(payload);
}

function decodeVisited(jsonStr) {
  var data = JSON.parse(jsonStr);
  var result = {};
  var adcodes = data.v || [];
  for (var i = 0; i < adcodes.length; i++) {
    var name = ADCODE_CITY[adcodes[i]];
    if (!name) continue;
    result[name] = { note: '', time: Date.now() };
    if (data.n && data.n[adcodes[i]]) {
      result[name].note = data.n[adcodes[i]];
    }
  }
  return result;
}

// Legacy TM1 decoder (backward compat)
function decodeTM1(body) {
  var notePart = '';
  var pipeIdx = body.indexOf('|');
  var bitmapB64;
  if (pipeIdx >= 0) {
    bitmapB64 = body.substring(0, pipeIdx);
    notePart = body.substring(pipeIdx + 1);
  } else {
    bitmapB64 = body;
  }
  var binary = atob(bitmapB64);
  var result = {};
  if (binary.length < 2) return result;
  var savedCount = binary.charCodeAt(0) | (binary.charCodeAt(1) << 8);
  var decodeCount = Math.min(savedCount, CITIES.length);
  for (var i = 0; i < decodeCount; i++) {
    var byteIdx = 2 + (i >> 3);
    if (byteIdx >= binary.length) break;
    var byte = binary.charCodeAt(byteIdx);
    if (byte & (1 << (i & 7))) {
      result[CITIES[i].n] = { note: '', time: Date.now() };
    }
  }
  if (notePart) {
    var parts = notePart.split(';');
    for (var j = 0; j < parts.length; j++) {
      var sep = parts[j].indexOf(':');
      if (sep < 0) continue;
      var idx = parseInt(parts[j].substring(0, sep));
      var note = decodeURIComponent(parts[j].substring(sep + 1));
      if (idx >= 0 && idx < CITIES.length && result[CITIES[idx].n]) {
        result[CITIES[idx].n].note = note;
      }
    }
  }
  return result;
}

async function exportToClipboard() {
  var jsonStr = encodeVisited();
  var b64 = await compressData(jsonStr);
  var code = 'TM2:' + b64;
  
  // Show copy overlay
  var overlay = document.getElementById('copyOverlay');
  var ta = document.getElementById('copyText');
  var lenEl = document.getElementById('copyLen');
  ta.value = code;
  lenEl.textContent = code.length + '字符';
  overlay.classList.add('show');
  // Auto select
  setTimeout(function() { ta.focus(); ta.select(); }, 50);
}

function doCopyAndClose() {
  var ta = document.getElementById('copyText');
  ta.select();
  var ok = false;
  try {
    ok = document.execCommand('copy');
  } catch(e) {}
  if (!ok && navigator.clipboard) {
    navigator.clipboard.writeText(ta.value).catch(function(){});
    ok = true;
  }
  document.getElementById('copyOverlay').classList.remove('show');
  showToast(ok ? '📋 已复制！' : '请手动长按选择复制');
}

function closeCopyOverlay() {
  document.getElementById('copyOverlay').classList.remove('show');
}

async function importFromClipboard() {
  try {
    var text = await navigator.clipboard.readText();
    text = (text || '').trim();
    if (!text) { showToast('❌ 剪贴板为空'); return; }
    if (!text.startsWith('TM2:') && !text.startsWith('TM1:')) {
      showToast('❌ 剪贴板中没有有效的分享码');
      return;
    }
    await doImportCompact(text);
  } catch(e) {
    showToast('❌ 无法读取剪贴板，请检查权限');
  }
}

async function doImportCompact(text) {
  try {
    var imported;
    if (text.startsWith('TM2:')) {
      var jsonStr = await decompressData(text.substring(4));
      imported = decodeVisited(jsonStr);
    } else if (text.startsWith('TM1:')) {
      imported = decodeTM1(text.substring(4));
    } else {
      showToast('❌ 无效的分享码');
      return;
    }
    var count = Object.keys(imported).length;
    pendingImportData = { visited: imported, profileName: '' };
    document.getElementById('importOverwriteName').textContent = activeProfile;
    document.getElementById('importChoiceModal').classList.add('show');
  } catch(e) {
    showToast('❌ 分享码解析失败');
  }
}

function exportData() {
  var data = { profileName: activeProfile, version: 2, visitedCities: visited, notes: {}, exportTime: new Date().toISOString() };
  for (var k in visited) {
    if (visited[k] && visited[k].note) data.notes[k] = visited[k].note;
  }
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'travel-map-' + activeProfile + '-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  showToast('📥 数据已导出');
}

function importData(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      var importVisited;
      if (data.visitedCities) importVisited = data.visitedCities;
      else if (data.visited) importVisited = data.visited;
      else importVisited = data;
      pendingImportData = { visited: importVisited, profileName: data.profileName || '' };
      document.getElementById('importOverwriteName').textContent = activeProfile;
      document.getElementById('importChoiceModal').classList.add('show');
    } catch(err) {
      showToast('❌ 文件格式错误');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function closeImportChoice() {
  document.getElementById('importChoiceModal').classList.remove('show');
  pendingImportData = null;
}

function doImportAsNewUser() {
  if (!pendingImportData) return;
  var name = pendingImportData.profileName;
  if (!name || profiles[name]) {
    closeImportChoice();
    showPrompt('输入新用户名：', name || '导入用户', function(inputName) {
      var finalName = inputName;
      var i = 1;
      while (profiles[finalName]) { finalName = inputName + '_' + (i++); }
      profiles[finalName] = { visitedCities: pendingImportData.visited };
      saveProfiles();
      switchProfile(finalName);
      showToast('📤 已导入为新用户「' + finalName + '」，' + Object.keys(pendingImportData.visited).length + ' 座城市');
      pendingImportData = null;
    });
    return;
  }
  var finalName = name;
  var i = 1;
  while (profiles[finalName]) { finalName = name + '_' + (i++); }
  profiles[finalName] = { visitedCities: pendingImportData.visited };
  saveProfiles();
  switchProfile(finalName);
  closeImportChoice();
  showToast('📤 已导入为新用户「' + finalName + '」，' + Object.keys(pendingImportData.visited).length + ' 座城市');
}

function doImportOverwrite() {
  if (!pendingImportData) return;
  visited = pendingImportData.visited;
  saveData();
  updateStats();
  draw();
  closeImportChoice();
  showToast('📤 已覆盖当前用户，' + Object.keys(visited).length + ' 座城市');
}

// Share card
function shareMapImage() {
  showToast('📤 生成中...');

  setTimeout(function() {
    var cardW = 800, cardH = 1000;
    var c = document.createElement('canvas');
    c.width = cardW; c.height = cardH;
    var cx = c.getContext('2d');

    cx.fillStyle = '#0a0a0f';
    cx.fillRect(0, 0, cardW, cardH);
    cx.strokeStyle = 'rgba(224,112,80,0.3)';
    cx.lineWidth = 2;
    cx.strokeRect(20, 20, cardW - 40, cardH - 40);

    cx.fillStyle = '#e07050';
    cx.font = 'bold 32px sans-serif';
    cx.textAlign = 'center';
    cx.fillText('🗺️ 我的中国旅行地图', cardW / 2, 70);

    cx.fillStyle = '#aaa';
    cx.font = '16px sans-serif';
    cx.fillText('👤 ' + activeProfile, cardW / 2, 98);

    var mapY = 100, mapH = 600;
    var mapScale = Math.min((cardW - 80), mapH);

    var cardProvs = getDecodedProvinces();
    for (var pi = 0; pi < cardProvs.length; pi++) {
      var prov = cardProvs[pi];
      var vc = getProvinceVisitCount(prov.n);
      for (var gi = 0; gi < prov.p.length; gi++) {
        var polygon = prov.p[gi];
        for (var ri = 0; ri < polygon.length; ri++) {
          var ring = polygon[ri];
          cx.beginPath();
          for (var i = 0; i < ring.length; i++) {
            var xy = lngLatToXY(ring[i][0], ring[i][1]);
            var sx = xy[0] * mapScale + (cardW - mapScale) / 2;
            var sy = xy[1] * mapScale * 0.75 + mapY;
            if (i === 0) cx.moveTo(sx, sy);
            else cx.lineTo(sx, sy);
          }
          cx.closePath();
          cx.fillStyle = vc.visited > 0 ? 'rgba(224,112,80,' + (0.2 + (vc.visited / vc.total) * 0.5) + ')' : 'rgba(30,30,46,0.6)';
          cx.fill();
          cx.strokeStyle = 'rgba(100,100,120,0.4)';
          cx.lineWidth = 0.5;
          cx.stroke();
        }
      }
    }

    for (var ci = 0; ci < CITIES.length; ci++) {
      var city = CITIES[ci];
      if (!visited[city.n]) continue;
      var xy = lngLatToXY(city.lng, city.lat);
      cx.beginPath();
      cx.arc(xy[0] * mapScale + (cardW - mapScale) / 2, xy[1] * mapScale * 0.75 + mapY, 3, 0, Math.PI * 2);
      cx.fillStyle = '#f0a060';
      cx.fill();
    }

    var totalCities = CITIES.length;
    var visitedCities = Object.keys(visited).length;
    var visitedProvs = new Set(CITIES.filter(function(cc) { return visited[cc.n]; }).map(function(cc) { return cc.p; })).size;
    var pct = Math.round(visitedCities / totalCities * 100);

    var rank;
    if (visitedCities === 0) rank = '🏠 家里蹲';
    else if (visitedCities <= 3) rank = '🚶 出门遛弯';
    else if (visitedCities <= 8) rank = '👟 小有出行';
    else if (visitedCities <= 15) rank = '🎒 初出茅庐';
    else if (visitedCities <= 30) rank = '🚄 渐入佳境';
    else if (visitedCities <= 50) rank = '✈️ 行者无疆';
    else if (visitedCities <= 80) rank = '🌏 旅行达人';
    else if (visitedCities <= 120) rank = '🧭 走南闯北';
    else if (visitedCities <= 180) rank = '🗺️ 半壁江山';
    else if (visitedCities <= 250) rank = '🏔️ 走遍中国';
    else if (visitedCities <= 330) rank = '🎓 地理大师';
    else rank = '👑 全境制霸';

    var statsY = mapY + mapH + 40;
    cx.fillStyle = '#e0e0e0';
    cx.font = 'bold 24px sans-serif';
    cx.textAlign = 'center';
    cx.fillText(rank, cardW / 2, statsY);
    cx.font = '18px sans-serif';
    cx.fillStyle = '#aaa';
    cx.fillText(visitedProvs + '个省份 · ' + visitedCities + '座城市 · 覆盖' + pct + '%', cardW / 2, statsY + 35);

    var barX = 100, barW = cardW - 200, barY2 = statsY + 55;
    cx.fillStyle = '#1e1e2e';
    cx.fillRect(barX, barY2, barW, 8);
    cx.fillStyle = '#e07050';
    cx.fillRect(barX, barY2, barW * pct / 100, 8);

    cx.fillStyle = '#555';
    cx.font = '13px sans-serif';
    cx.fillText('中国旅行地图 · ' + new Date().toLocaleDateString('zh-CN'), cardW / 2, cardH - 30);

    c.toBlob(function(blob) {
      var file = new File([blob], 'travel-map.png', { type: 'image/png' });
      
      // Try Web Share API with file
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: '我的中国旅行地图',
          text: visitedProvs + '个省份 · ' + visitedCities + '座城市 · ' + rank,
          files: [file]
        }).then(function() {
          showToast('📤 已分享！');
        }).catch(function(e) {
          if (e.name !== 'AbortError') {
            // Fallback: download
            downloadBlob(blob);
          }
        });
      } else {
        // Fallback: download for desktop browsers
        downloadBlob(blob);
      }
    });
  }, 100);
}

function downloadBlob(blob) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'travel-map-' + new Date().toISOString().slice(0, 10) + '.png';
  a.click();
  showToast('📤 图片已保存');
}

// Toast
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2000);
}
