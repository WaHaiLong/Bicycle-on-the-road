import { supabase } from './supabase.js'

let map
let allBikes = []
let markers = []

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'

async function init() {
  // 初始化地图，默认居中中国
  map = L.map('map').setView([35, 105], 5)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map)

  await loadBikes()
}

async function loadBikes() {
  const { data, error } = await supabase
    .from('bikes')
    .select('id, name, brand, model, size, price_per_day, location, image_url, available, frame_material, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('加载车辆失败:', error.message)
    return
  }

  allBikes = data || []
  applyFilters()
}

window.applyFilters = function () {
  const availableVal = document.getElementById('filter-available').value
  const materialVal = document.getElementById('filter-material').value
  const priceVal = document.getElementById('filter-price').value

  let filtered = allBikes.filter(bike => {
    if (availableVal === 'true' && !bike.available) return false
    if (materialVal && bike.frame_material !== materialVal) return false
    if (priceVal) {
      const p = parseFloat(bike.price_per_day)
      if (priceVal === '0-100' && p >= 100) return false
      if (priceVal === '100-200' && (p < 100 || p >= 200)) return false
      if (priceVal === '200+' && p < 200) return false
    }
    return true
  })

  renderMarkers(filtered)
}

function renderMarkers(bikes) {
  // 清除旧标记
  markers.forEach(m => map.removeLayer(m))
  markers = []

  const countEl = document.getElementById('map-count')

  if (!bikes.length) {
    countEl.textContent = '该筛选条件下没有车辆'
    countEl.style.display = 'block'
    return
  }

  countEl.textContent = `共找到 ${bikes.length} 辆车`
  countEl.style.display = 'block'

  const bounds = []

  bikes.forEach(bike => {
    const lat = parseFloat(bike.lat)
    const lng = parseFloat(bike.lng)
    if (isNaN(lat) || isNaN(lng)) return

    const color = bike.available ? '#2563eb' : '#9ca3af'
    const icon = L.divIcon({
      html: `<div style="
        background:${color}; color:#fff; border-radius:50% 50% 50% 0;
        transform:rotate(-45deg); width:32px; height:32px;
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 2px 6px rgba(0,0,0,.3); font-size:14px;
      "><span style="transform:rotate(45deg)">🚲</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -34],
      className: ''
    })

    const marker = L.marker([lat, lng], { icon }).addTo(map)

    const statusBadge = bike.available
      ? '<span style="color:#16a34a;font-weight:600">✅ 可租赁</span>'
      : '<span style="color:#9ca3af">❌ 已租出</span>'

    marker.bindPopup(`
      <div class="map-popup" style="min-width:160px">
        <img src="${bike.image_url || DEFAULT_IMG}"
          onerror="this.src='${DEFAULT_IMG}'" alt="">
        <h3>${bike.name}</h3>
        <div class="popup-meta">${bike.brand}${bike.model ? ' · ' + bike.model : ''} · ${bike.size}</div>
        <div class="popup-meta">📍 ${bike.location}</div>
        <div>${statusBadge}</div>
        <div class="popup-price" style="margin-top:.4rem">¥${bike.price_per_day} / 天</div>
        <a href="bike-detail.html?id=${bike.id}">查看详情 →</a>
      </div>
    `, { maxWidth: 200 })

    markers.push(marker)
    bounds.push([lat, lng])
  })

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
  }
}

// 等 Leaflet 全局对象加载后初始化
if (typeof L !== 'undefined') {
  init()
} else {
  window.addEventListener('load', init)
}
