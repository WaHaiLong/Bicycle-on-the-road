import { supabase } from './supabase.js'
import { getUser } from './auth.js'

const params = new URLSearchParams(window.location.search)
const bikeId = params.get('id')

let bike = null
let currentUser = null

async function loadBike() {
  if (!bikeId) {
    window.location.href = 'index.html'
    return
  }

  const { data, error } = await supabase
    .from('bikes')
    .select('*')
    .eq('id', bikeId)
    .single()

  if (error || !data) {
    window.location.href = 'index.html'
    return
  }

  bike = data
  currentUser = await getUser()

  document.getElementById('loading').style.display = 'none'
  document.getElementById('bike-detail').style.display = 'block'
  document.title = `${bike.name} - 骑行路上`

  renderBike()
  setupDatePicker()
  loadBookedDates()
  loadReviews()
}

function renderBike() {
  document.getElementById('bike-name').textContent = bike.name
  document.getElementById('bike-brand').textContent =
    `${bike.brand}${bike.model ? ' · ' + bike.model : ''}`
  document.getElementById('bike-price').textContent = `¥${bike.price_per_day}`
  document.getElementById('bike-location').textContent = bike.location
  document.getElementById('bike-groupset').textContent = bike.groupset || '暂无信息'
  document.getElementById('bike-weight').textContent = bike.weight_kg ? `${bike.weight_kg} kg` : '暂无信息'
  document.getElementById('bike-status').textContent = bike.available ? '✅ 可租赁' : '❌ 已租出'

  const img = document.getElementById('bike-image')
  img.src = bike.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
  img.onerror = () => { img.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800' }

  document.getElementById('bike-description').textContent = bike.description || '暂无详细描述'

  const badgeMaterial = document.getElementById('badge-material')
  const badgeSize = document.getElementById('badge-size')
  if (bike.frame_material) {
    badgeMaterial.textContent = bike.frame_material
    badgeMaterial.className = 'badge badge-material'
  }
  badgeSize.textContent = `尺寸 ${bike.size}`
  badgeSize.className = 'badge badge-size'

  if (!bike.available) {
    document.getElementById('booking-section').innerHTML =
      '<p style="color:#b91c1c;text-align:center;padding:1rem">该车辆目前已被预订，暂不可租赁</p>'
  } else if (!currentUser) {
    document.getElementById('book-btn').style.display = 'none'
    document.getElementById('login-tip').style.display = 'block'
  }
}

let bookedRanges = []

async function loadBookedDates() {
  const { data } = await supabase
    .from('rentals')
    .select('start_date, end_date')
    .eq('bike_id', bikeId)
    .in('status', ['pending', 'confirmed', 'active'])
  bookedRanges = data || []
}

function isDateRangeConflict(start, end) {
  return bookedRanges.some(r => start < r.end_date && end > r.start_date)
}

function setupDatePicker() {
  const today = new Date().toISOString().split('T')[0]
  const startInput = document.getElementById('start-date')
  const endInput = document.getElementById('end-date')

  if (!startInput) return

  startInput.min = today
  endInput.min = today

  startInput.addEventListener('change', () => {
    endInput.min = startInput.value
    updatePricePreview()
  })
  endInput.addEventListener('change', updatePricePreview)
}

function updatePricePreview() {
  const start = document.getElementById('start-date').value
  const end = document.getElementById('end-date').value
  const preview = document.getElementById('price-preview')
  const totalEl = document.getElementById('total-price')

  if (start && end && end > start) {
    const days = Math.ceil((new Date(end) - new Date(start)) / 86400000)
    const total = days * parseFloat(bike.price_per_day)
    totalEl.textContent = `¥${total.toFixed(2)}（共${days}天）`
    preview.style.display = 'block'
  } else {
    preview.style.display = 'none'
  }
}

window.bookBike = async function () {
  if (!currentUser) {
    window.location.href = `login.html?redirect=bike-detail.html?id=${bikeId}`
    return
  }

  const start = document.getElementById('start-date').value
  const end = document.getElementById('end-date').value
  const notes = document.getElementById('rental-notes').value

  if (!start || !end) {
    alert('请选择租赁日期')
    return
  }
  if (end <= start) {
    alert('结束日期必须晚于开始日期')
    return
  }
  if (isDateRangeConflict(start, end)) {
    alert('所选日期与已有预订冲突，请选择其他日期')
    return
  }

  const days = Math.ceil((new Date(end) - new Date(start)) / 86400000)
  const totalPrice = days * parseFloat(bike.price_per_day)

  const btn = document.getElementById('book-btn')
  btn.disabled = true
  btn.textContent = '提交中...'

  const { error } = await supabase.from('rentals').insert({
    bike_id: bikeId,
    renter_id: currentUser.id,
    start_date: start,
    end_date: end,
    total_price: totalPrice,
    notes: notes || null,
    status: 'pending'
  })

  if (error) {
    alert('预订失败：' + error.message)
    btn.disabled = false
    btn.textContent = '立即预订'
    return
  }

  alert('🎉 预订成功！请前往"我的租约"查看状态')
  window.location.href = 'my-rentals.html'
}

async function loadReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('bike_id', bikeId)
    .order('created_at', { ascending: false })

  const list = document.getElementById('reviews-list')
  const noReviews = document.getElementById('no-reviews')

  if (error || !data || data.length === 0) {
    list.innerHTML = ''
    noReviews.style.display = 'block'
    return
  }

  const avg = (data.reduce((s, r) => s + r.rating, 0) / data.length).toFixed(1)
  list.innerHTML = `
    <div class="rating-summary">
      <span class="rating-score">${avg}</span>
      <div>
        <div class="stars">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</div>
        <span class="rating-count">${data.length} 条评价</span>
      </div>
    </div>
    <br>
    ${data.map(r => `
      <div class="review-card">
        <div class="review-header">
          <span class="review-author">${r.profiles?.full_name || '匿名用户'}</span>
          <span class="review-date">${new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
        <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        ${r.comment ? `<p style="margin-top:.5rem;color:#4b5563">${r.comment}</p>` : ''}
      </div>
    `).join('')}
  `
}

loadBike()
