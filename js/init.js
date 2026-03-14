// ====== 初始化 ======
function initCanvas() {
  canvas = document.getElementById('mapCanvas');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  var dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = window.innerWidth;
  H = window.innerHeight;
  draw();
}

function resetView() {
  var pad = 40;
  var topOffset = 48;
  var bottomOffset = 100;
  var availW = W - pad * 2;
  var availH = H - topOffset - bottomOffset - pad;
  var mapAspect = (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  var screenAspect = availW / availH;

  if (mapAspect > screenAspect) {
    viewScale = availW;
  } else {
    viewScale = availH * mapAspect;
  }

  var mapW = viewScale;
  var mapH = viewScale / mapAspect;
  viewX = (W - mapW) / 2;
  viewY = topOffset + (availH - mapH) / 2;
  draw();
}

function setupModalEvents() {
  document.getElementById('cityModal').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeCityModal();
  });
  document.getElementById('ioPanel').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeIOPanel();
  });
  document.getElementById('profileModal').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeProfileModal();
  });
  document.getElementById('importChoiceModal').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeImportChoice();
  });
}

function init() {
  loadData();
  initCanvas();
  setupEvents();
  setupModalEvents();
  resetView();
  updateStats();
  updateProfileBtn();
}

// Init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
