import { supabase } from './supabase.js'

let allBikes = []

async function loadBikes() {
  const loading = document.getElementById('loading')
  const grid = document.getElementById('bikes-grid')
  const emptyState = document.getElementById('empty-state')

  try {
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    allBikes = data || []
    renderBikes(allBikes)
  } catch (err) {
    console.error('加载车辆失败:', err)
    loading.innerHTML = '<p style="color:red">加载失败，请刷新重试</p>'
  }
}

function renderBikes(bikes) {
  const loading = document.getElementById('loading')
  const grid = document.getElementById('bikes-grid')
  const emptyState = document.getElementById('empty-state')

  loading.style.display = 'none'

  if (bikes.length === 0) {
    grid.innerHTML = ''
    emptyState.style.display = 'block'
    return
  }

  emptyState.style.display = 'none'
  grid.innerHTML = bikes.map(bike => `
    <a class="bike-card" href="bike-detail.html?id=${bike.id}">
      <img class="bike-card-image"
        src="${bike.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'}"
        alt="${bike.name}"
        onerror="this.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'">
      <div class="bike-card-body">
        <div class="bike-card-title">${bike.name}</div>
        <div class="bike-card-meta">
          ${bike.brand}${bike.model ? ' · ' + bike.model : ''} · 尺寸 ${bike.size}
        </div>
        <div style="display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom:.5rem;">
          ${bike.frame_material ? `<span class="badge badge-material">${bike.frame_material}</span>` : ''}
          <span class="badge ${bike.available ? 'badge-available' : 'badge-unavailable'}">
            ${bike.available ? '可租赁' : '已租出'}
          </span>
        </div>
        <div class="bike-card-meta">📍 ${bike.location}</div>
        <div class="bike-card-footer">
          <div class="bike-price">¥${bike.price_per_day}<span>/天</span></div>
          <span class="btn btn-primary btn-sm">查看详情</span>
        </div>
      </div>
    </a>
  `).join('')
}

window.searchBikes = function () {
  const keyword = document.getElementById('search-input').value.toLowerCase()
  const filtered = applyFilters(allBikes).filter(bike =>
    bike.name.toLowerCase().includes(keyword) ||
    bike.brand.toLowerCase().includes(keyword) ||
    bike.location.toLowerCase().includes(keyword) ||
    (bike.model && bike.model.toLowerCase().includes(keyword))
  )
  renderBikes(filtered)
}

window.filterBikes = function () {
  renderBikes(applyFilters(allBikes))
}

function applyFilters(bikes) {
  const price = document.getElementById('filter-price').value
  const material = document.getElementById('filter-material').value
  const size = document.getElementById('filter-size').value

  return bikes.filter(bike => {
    if (material && bike.frame_material !== material) return false
    if (size && bike.size !== size) return false
    if (price) {
      const p = parseFloat(bike.price_per_day)
      if (price === '0-100' && p >= 100) return false
      if (price === '100-200' && (p < 100 || p > 200)) return false
      if (price === '200+' && p <= 200) return false
    }
    return true
  })
}

// 支持回车搜索
document.getElementById('search-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') window.searchBikes()
})

loadBikes()
