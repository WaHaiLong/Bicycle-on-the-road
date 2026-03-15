import { supabase } from './supabase.js'
import { getUser, signOut } from './auth.js'

window.signOut = signOut

let allRentals = []
let currentTab = 'all'

const STATUS_LABELS = {
  pending: '待确认',
  confirmed: '已确认',
  active: '骑行中',
  completed: '已完成',
  cancelled: '已取消'
}

async function init() {
  const user = await getUser()
  if (!user) {
    window.location.href = 'login.html'
    return
  }

  // 更新导航
  const navUsername = document.getElementById('nav-username')
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  if (navUsername) navUsername.textContent = profile?.full_name || user.email.split('@')[0]

  const { data, error } = await supabase
    .from('rentals')
    .select('*, bikes(name, image_url, location, price_per_day)')
    .eq('renter_id', user.id)
    .order('created_at', { ascending: false })

  document.getElementById('loading').style.display = 'none'

  if (error) {
    document.getElementById('rentals-list').innerHTML = '<p style="color:red">加载失败，请刷新重试</p>'
    return
  }

  allRentals = data || []
  renderRentals()
}

window.switchTab = function (tab) {
  currentTab = tab
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'))
  event.target.classList.add('active')
  renderRentals()
}

function renderRentals() {
  const list = document.getElementById('rentals-list')
  const emptyState = document.getElementById('empty-state')

  const filtered = currentTab === 'all'
    ? allRentals
    : allRentals.filter(r => r.status === currentTab)

  if (filtered.length === 0) {
    list.innerHTML = ''
    emptyState.style.display = 'block'
    return
  }

  emptyState.style.display = 'none'
  list.innerHTML = filtered.map(rental => `
    <div class="rental-card">
      <img class="rental-bike-img"
        src="${rental.bikes?.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'}"
        alt="${rental.bikes?.name}"
        onerror="this.src='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'">
      <div class="rental-info">
        <h3>${rental.bikes?.name || '未知车辆'}</h3>
        <div>
          <span class="status-badge status-${rental.status}">${STATUS_LABELS[rental.status]}</span>
        </div>
        <div class="rental-dates">
          📅 ${rental.start_date} → ${rental.end_date}
          &nbsp;|&nbsp; 📍 ${rental.bikes?.location || ''}
        </div>
        ${rental.notes ? `<div style="color:#6b7280;font-size:.85rem;margin-top:.25rem">备注：${rental.notes}</div>` : ''}
      </div>
      <div class="rental-actions">
        <div class="rental-price">¥${rental.total_price}</div>
        <div style="font-size:.75rem;color:#9ca3af">共${rental.total_days}天</div>
        ${rental.status === 'pending' ? `
          <button class="btn btn-danger btn-sm" onclick="cancelRental('${rental.id}')">取消</button>
        ` : ''}
        ${rental.status === 'completed' ? `
          <a href="bike-detail.html?id=${rental.bike_id}" class="btn btn-outline btn-sm">写评价</a>
        ` : ''}
        <a href="bike-detail.html?id=${rental.bike_id}" class="btn btn-outline btn-sm">查看车辆</a>
      </div>
    </div>
  `).join('')
}

window.cancelRental = async function (rentalId) {
  if (!confirm('确认取消这个预订？')) return

  const { error } = await supabase
    .from('rentals')
    .update({ status: 'cancelled' })
    .eq('id', rentalId)

  if (error) {
    alert('取消失败：' + error.message)
    return
  }

  const rental = allRentals.find(r => r.id === rentalId)
  if (rental) rental.status = 'cancelled'
  renderRentals()
}

init()
