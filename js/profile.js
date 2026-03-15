// ====== 多用户管理 ======
function migrateV1Data() {
  var old = localStorage.getItem('travel-map-data');
  if (old) {
    try {
      var v = JSON.parse(old);
      if (v && typeof v === 'object' && !localStorage.getItem('travelMap_profiles')) {
        profiles['默认用户'] = { visitedCities: v };
        activeProfile = '默认用户';
        saveProfiles();
        localStorage.setItem('travelMap_activeProfile', activeProfile);
        localStorage.removeItem('travel-map-data');
      }
    } catch(e) {}
  }
}

function loadProfiles() {
  try {
    var p = localStorage.getItem('travelMap_profiles');
    if (p) profiles = JSON.parse(p);
    var a = localStorage.getItem('travelMap_activeProfile');
    if (a) activeProfile = a;
  } catch(e) {}
  if (!profiles['默认用户'] && Object.keys(profiles).length === 0) {
    profiles['默认用户'] = { visitedCities: {} };
  }
  if (!profiles[activeProfile]) {
    activeProfile = Object.keys(profiles)[0];
  }
  visited = profiles[activeProfile]?.visitedCities || {};
}

function saveProfiles() {
  profiles[activeProfile] = { visitedCities: visited };
  localStorage.setItem('travelMap_profiles', JSON.stringify(profiles));
  localStorage.setItem('travelMap_activeProfile', activeProfile);
}

function loadData() {
  migrateV1Data();
  loadProfiles();
}

function saveData() {
  saveProfiles();
}

function switchProfile(name) {
  if (!profiles[name]) return;
  profiles[activeProfile] = { visitedCities: visited };
  activeProfile = name;
  visited = profiles[activeProfile]?.visitedCities || {};
  saveProfiles();
  updateProfileBtn();
  updateStats();
  draw();
  renderProfileList();
  showToast('👤 已切换到「' + name + '」');
}

function createProfile(nameOverride) {
  var input = document.getElementById('newProfileInput');
  var name = nameOverride || input.value.trim();
  if (!name) { showToast('请输入用户名'); return null; }
  if (profiles[name]) { showToast('用户名已存在'); return null; }
  profiles[name] = { visitedCities: {} };
  saveProfiles();
  if (!nameOverride) {
    input.value = '';
    switchProfile(name);
    renderProfileList();
  }
  return name;
}

function deleteProfile(name) {
  if (Object.keys(profiles).length <= 1) { showToast('至少保留一个用户'); return; }
  showConfirm('确定删除用户「' + name + '」？数据不可恢复！', function() {
    delete profiles[name];
    if (activeProfile === name) {
      activeProfile = Object.keys(profiles)[0];
      visited = profiles[activeProfile]?.visitedCities || {};
    }
    saveProfiles();
    updateProfileBtn();
    updateStats();
    draw();
    renderProfileList();
    showToast('🗑️ 已删除「' + name + '」');
  });
}

function updateProfileBtn() {
  document.getElementById('profileBtnName').textContent = activeProfile;
}

function renameProfile(name) {
  showPrompt('输入新用户名:', name, function(newName) {
    if (newName === name) return;
    if (profiles[newName]) { showToast('用户名已存在'); return; }
    profiles[newName] = profiles[name];
    delete profiles[name];
    if (activeProfile === name) activeProfile = newName;
    saveProfiles();
    updateProfileBtn();
    renderProfileList();
    showToast('✏️ 已改名为「' + newName + '」');
  });
}

function showProfileModal() {
  renderProfileList();
  document.getElementById('profileModal').classList.add('show');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('show');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderProfileList() {
  var list = document.getElementById('profileList');
  var names = Object.keys(profiles);
  list.innerHTML = names.map(function(name) {
    var data = profiles[name]?.visitedCities || {};
    var count = Object.keys(data).length;
    var provs = new Set(CITIES.filter(function(c) { return data[c.n]; }).map(function(c) { return c.p; })).size;
    var isActive = name === activeProfile;
    var esc = name.replace(/'/g, "\\'").replace(/</g,'&lt;').replace(/>/g,'&gt;');
    var display = escHtml(name);
    return '<div class="profile-item ' + (isActive ? 'active' : '') + '" onclick="switchProfile(\'' + esc + '\')">' +
      '<div style="flex:1;min-width:0"><div class="pi-name">' + (isActive ? '✅ ' : '') + display + '</div>' +
      '<div class="pi-stats">' + provs + '省 · ' + count + '城市</div></div>' +
      '<div style="display:flex;gap:4px;align-items:center;flex-shrink:0">' +
        '<button class="pi-action" onclick="event.stopPropagation();renameProfile(\'' + esc + '\')" title="改名">✏️</button>' +
        (names.length > 1 ? '<button class="pi-action pi-del" onclick="event.stopPropagation();deleteProfile(\'' + esc + '\')" title="删除">🗑️</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}
