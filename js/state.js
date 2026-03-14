// ====== 全局状态 ======
let visited = {}; // {cityName: {note: string, time: number}}
let mode = 'city'; // 'city' or 'province'
let viewX = 0, viewY = 0, viewScale = 1;
let canvas, ctx, W, H;
let isDragging = false, dragStartX, dragStartY, dragViewX, dragViewY;
let lastPinchDist = 0;
let hoveredCity = null, hoveredProvince = null;
let selectedCity = null;
let statsCollapsed = false;
let activeProfile = '默认用户';
let profiles = {}; // { profileName: { visitedCities: {}, notes: {} } }
let pendingImportData = null;

// Map bounds (lng/lat)
const MAP_BOUNDS = { minLng: 73, maxLng: 136, minLat: 15, maxLat: 54 };
