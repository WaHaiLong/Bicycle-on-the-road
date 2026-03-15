import { supabase } from './supabase.js'
import { getUser, signOut } from './auth.js'

window.signOut = signOut

const STATUS_LABELS = {
  pending: '待确认', confirmed: '已确认',
  active: '骑行中', completed: '已完成', cancelled: '已取消'
}

let allIncomingRentals = []
let currentRentalTab = 'pending'

async function init() {
  const user = await getUser()
  if (!user) { window.location.href = 'login.html?redirect=dashboard.html'; return }

  const navUsername = document.getElementById('nav-username')
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  if (navUsername) navUsername.textContent = profile?.full_name || user.email.split('@')[0]

  document.getElementById('loading').style.display = 'none'
  document.getElementById('stats').style.display = 'grid'
  document.getElementById('my-bikes-section').style.display = 'block'
  document.getElementById('incoming-rentals-section').style.display = 'block'

  await Promise.all([loadMyBikes(user.id), loadIncomingRentals(user.id)])
}

async function loadMyBikes(ownerId) {
  const { data: bikes, error } = await supabase
    .from('bikes')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  document.getElementById('stat-bikes').textContent = bikes?.length || 0

  const list = document.getElementById('my-bikes-list')
  if (!bikes?.length) {
    list.innerHTML = `<div class="empty-state"><span>🚲</span><h3>还没有发布车辆</h3><p><a href="list-bike.html">立即发布</a></p></div>`
    return
  }

  list.innerHTML = bikes.map(bike => `
    <div class="rental-card" style="grid-template-columns:80px 1fr auto">
      <img class="rental-bike-img"
        src="${bike.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'}"
        onerror="this.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'" alt="">
      <div class="rental-info">
        <h3>${bike.name}</h3>
        <div style="color:#6b7280;font-size:.85rem">${bike.brand}${bike.model ? ' · ' + bike.model : ''} · 尺寸 ${bike.size}</div>
        <div style="margin-top:.25rem">
          <span class="badge ${bike.available ? 'badge-available' : 'badge-unavailable'}">
            ${bike.available ? '可租赁' : '已租出'}
          </span>
        </div>
      </div>
      <div class="rental-actions">
        <div class="rental-price">¥${bike.price_per_day}/天</div>
        <button class="btn btn-sm ${bike.available ? 'btn-outline' : 'btn-primary'}"
          onclick="toggleAvailability('${bike.id}', ${bike.available})">
          ${bike.available ? '标记租出' : '标记归还'}
        </button>
        <a href="bike-detail.html?id=${bike.id}" class="btn btn-outline btn-sm">查看详情</a>
      </div>
    </div>
  `).join('')
}

async function loadIncomingRentals(ownerId) {
  // 先找到车主的所有车辆ID
  const { data: myBikes } = await supabase
    .from('bikes')
    .select('id')
    .eq('owner_id', ownerId)

  if (!myBikes?.length) {
    document.getElementById('stat-pending').textContent = 0
    document.getElementById('stat-active').textContent = 0
    document.getElementById('stat-revenue').textContent = 0
    return
  }

  const bikeIds = myBikes.map(b => b.id)

  const { data: rentals } = await supabase
    .from('rentals')
    .select('*, bikes(name, image_url, price_per_day), profiles(full_name, phone)')
    .in('bike_id', bikeIds)
    .order('created_at', { ascending: false })

  allIncomingRentals = rentals || []

  // 统计
  const pending = allIncomingRentals.filter(r => r.status === 'pending').length
  const active = allIncomingRentals.filter(r => r.status === 'active').length
  const revenue = allIncomingRentals
    .filter(r => ['completed', 'active'].includes(r.status))
    .reduce((s, r) => s + parseFloat(r.total_price), 0)

  document.getElementById('stat-pending').textContent = pending
  document.getElementById('stat-active').textContent = active
  document.getElementById('stat-revenue').textContent = revenue.toFixed(0)

  renderIncomingRentals()
}

function renderIncomingRentals() {
  const list = document.getElementById('incoming-rentals-list')
  const noRentals = document.getElementById('no-rentals')

  const filtered = currentRentalTab === 'all'
    ? allIncomingRentals
    : allIncomingRentals.filter(r => r.status === currentRentalTab)

  if (!filtered.length) {
    list.innerHTML = ''
    noRentals.style.display = 'block'
    return
  }
  noRentals.style.display = 'none'

  list.innerHTML = filtered.map(r => `
    <div class="rental-card" style="grid-template-columns:80px 1fr auto">
      <img class="rental-bike-img"
        src="${r.bikes?.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'}"
        onerror="this.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'" alt="">
      <div class="rental-info">
        <h3>${r.bikes?.name || '未知车辆'}</h3>
        <div><span class="status-badge status-${r.status}">${STATUS_LABELS[r.status]}</span></div>
        <div class="rental-dates">
          📅 ${r.start_date} → ${r.end_date}（共${r.total_days}天）
        </div>
        <div style="font-size:.85rem;color:#374151;margin-top:.25rem">
          👤 租客：${r.profiles?.full_name || '未知'}
          ${r.profiles?.phone ? ' · 📞 ' + r.profiles.phone : ''}
        </div>
        ${r.notes ? `<div style="font-size:.8rem;color:#6b7280;margin-top:.2rem">备注：${r.notes}</div>` : ''}
      </div>
      <div class="rental-actions">
        <div class="rental-price">¥${r.total_price}</div>
        ${r.status === 'pending' ? `
          <button class="btn btn-primary btn-sm" onclick="updateRentalStatus('${r.id}', 'confirmed')">确认</button>
          <button class="btn btn-danger btn-sm" onclick="updateRentalStatus('${r.id}', 'cancelled')">拒绝</button>
        ` : ''}
        ${r.status === 'confirmed' ? `
          <button class="btn btn-primary btn-sm" onclick="updateRentalStatus('${r.id}', 'active')">开始租赁</button>
        ` : ''}
        ${r.status === 'active' ? `
          <button class="btn btn-primary btn-sm" onclick="updateRentalStatus('${r.id}', 'completed')">确认归还</button>
        ` : ''}
      </div>
    </div>
  `).join('')
}

window.switchRentalTab = function (tab, e) {
  currentRentalTab = tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  if (e?.target) e.target.classList.add('active')
  renderIncomingRentals()
}

window.toggleAvailability = async function (bikeId, current) {
  const { error } = await supabase
    .from('bikes')
    .update({ available: !current })
    .eq('id', bikeId)
  if (error) { alert('操作失败：' + error.message); return }
  const user = await getUser()
  await loadMyBikes(user.id)
}

window.updateRentalStatus = async function (rentalId, newStatus) {
  const labels = { confirmed: '确认', cancelled: '拒绝', active: '开始', completed: '完成' }
  if (!confirm(`确认${labels[newStatus] || '更新'}这个租约？`)) return

  const { error } = await supabase
    .from('rentals')
    .update({ status: newStatus })
    .eq('id', rentalId)

  if (error) { alert('操作失败：' + error.message); return }

  const rental = allIncomingRentals.find(r => r.id === rentalId)
  if (rental) rental.status = newStatus
  renderIncomingRentals()

  // 更新统计
  const user = await getUser()
  await loadIncomingRentals(user.id)
}

init()
