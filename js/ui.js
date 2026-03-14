// ====== UI操作 ======

// City actions
function handleCityClick(city) {
  if (visited[city.n]) {
    openCityModal(city);
  } else {
    visited[city.n] = { note: '', time: Date.now() };
    saveData();
    updateStats();
    showToast('✅ ' + city.n + ' 已打卡！');
    draw();
  }
}

function openCityModal(city) {
  selectedCity = city;
  document.getElementById('modalCityName').textContent = city.n;
  document.getElementById('modalCityInfo').textContent = city.p + ' · ' + city.lng + '°E ' + city.lat + '°N';
  document.getElementById('modalNote').value = visited[city.n]?.note || '';
  document.getElementById('cityModal').classList.add('show');
}

function closeCityModal() {
  document.getElementById('cityModal').classList.remove('show');
  selectedCity = null;
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
  delete visited[selectedCity.n];
  saveData();
  updateStats();
  showToast('❌ ' + selectedCity.n + ' 已取消打卡');
  closeCityModal();
  draw();
}

// Mode
function setMode(m) {
  mode = m;
  document.getElementById('cityModeBtn').classList.toggle('active', m === 'city');
  document.getElementById('provModeBtn').classList.toggle('active', m === 'province');
  draw();
}

// Province detail
function showProvDetail(provName) {
  var panel = document.getElementById('provDetail');
  document.getElementById('provDetailName').textContent = provName;
  var cities = CITIES.filter(function(c) { return c.p === provName; });
  var vc = cities.filter(function(c) { return visited[c.n]; }).length;
  document.getElementById('provDetailInfo').textContent = '已打卡 ' + vc + '/' + cities.length + ' 座城市';
  var list = document.getElementById('provDetailCities');
  list.innerHTML = cities.map(function(c) {
    var v = visited[c.n];
    return '<div class="city-item ' + (v ? 'visited' : '') + '" onclick="provCityClick(\'' + c.n + '\')">' +
      (v ? '🔴' : '⚪') + ' ' + c.n +
      (v?.note ? '<div class="note-preview">📝 ' + v.note + '</div>' : '') +
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
  if (visited[name]) {
    openCityModal(city);
  } else {
    visited[name] = { note: '', time: Date.now() };
    saveData();
    updateStats();
    showToast('✅ ' + name + ' 已打卡！');
    showProvDetail(city.p);
    draw();
  }
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
  if (pct === 0) { rank = '家里蹲'; emoji = '🏠'; }
  else if (pct < 5) { rank = '家里蹲'; emoji = '🏠'; }
  else if (pct < 20) { rank = '初出茅庐'; emoji = '🚶'; }
  else if (pct < 40) { rank = '行者'; emoji = '🎒'; }
  else if (pct < 60) { rank = '旅行达人'; emoji = '✈️'; }
  else if (pct < 80) { rank = '走遍中国'; emoji = '🗺️'; }
  else { rank = '地理大师'; emoji = '👑'; }

  document.getElementById('rankTitle').textContent = rank;
  document.getElementById('rankBadge').textContent = emoji + ' ' + rank;
}

function toggleStats() {
  statsCollapsed = !statsCollapsed;
  document.getElementById('statsPanel').classList.toggle('collapsed', statsCollapsed);
  document.getElementById('statsArrow').textContent = statsCollapsed ? '▲' : '▼';
}

// Import/Export
function showIOPanel() { document.getElementById('ioPanel').classList.add('show'); }
function closeIOPanel() { document.getElementById('ioPanel').classList.remove('show'); }

function exportData() {
  var data = { profileName: activeProfile, version: 2, visitedCities: visited, notes: {}, exportTime: new Date().toISOString() };
  for (var k in visited) {
    if (visited[k]?.note) data.notes[k] = visited[k].note;
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
      closeIOPanel();
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
    name = prompt('输入新用户名：', name || '导入用户');
    if (!name) { closeImportChoice(); return; }
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
function generateShareCard() {
  closeIOPanel();
  showToast('🖼️ 生成中...');

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
    var mapScale = Math.min((cardW - 80) / W, mapH / H);
    var mapOffX = (cardW - W * mapScale) / 2;

    for (var pi = 0; pi < PROVINCES.length; pi++) {
      var prov = PROVINCES[pi];
      var vc = getProvinceVisitCount(prov.n);
      for (var gi = 0; gi < prov.p.length; gi++) {
        var polygon = prov.p[gi];
        for (var ri = 0; ri < polygon.length; ri++) {
          var ring = polygon[ri];
          cx.beginPath();
          for (var i = 0; i < ring.length; i++) {
            var xy = lngLatToXY(ring[i][0], ring[i][1]);
            var sx = xy[0] * mapScale + mapOffX;
            var sy = xy[1] * mapScale + mapY;
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
      cx.arc(xy[0] * mapScale + mapOffX, xy[1] * mapScale + mapY, 3, 0, Math.PI * 2);
      cx.fillStyle = '#f0a060';
      cx.fill();
    }

    var totalCities = CITIES.length;
    var visitedCities = Object.keys(visited).length;
    var visitedProvs = new Set(CITIES.filter(function(cc) { return visited[cc.n]; }).map(function(cc) { return cc.p; })).size;
    var pct = Math.round(visitedCities / totalCities * 100);

    var rank;
    if (pct < 5) rank = '🏠 家里蹲';
    else if (pct < 20) rank = '🚶 初出茅庐';
    else if (pct < 40) rank = '🎒 行者';
    else if (pct < 60) rank = '✈️ 旅行达人';
    else if (pct < 80) rank = '🗺️ 走遍中国';
    else rank = '👑 地理大师';

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
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'travel-map-share-' + new Date().toISOString().slice(0, 10) + '.png';
      a.click();
      showToast('🖼️ 分享卡已生成');
    });
  }, 100);
}

// Toast
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2000);
}
