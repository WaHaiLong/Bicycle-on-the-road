import { supabase } from './supabase.js'
import { getUser, signOut } from './auth.js'

window.signOut = signOut

async function init() {
  const user = await getUser()
  if (!user) {
    window.location.href = 'login.html?redirect=list-bike.html'
    return
  }

  const navUsername = document.getElementById('nav-username')
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  if (navUsername) navUsername.textContent = profile?.full_name || user.email.split('@')[0]

  window._currentUserId = user.id
}

window.handleListBike = async function (e) {
  e.preventDefault()

  const btn = document.getElementById('submit-btn')
  const errorEl = document.getElementById('error-msg')
  const successEl = document.getElementById('success-msg')

  errorEl.style.display = 'none'
  successEl.style.display = 'none'

  const latVal = document.getElementById('lat').value
  const lngVal = document.getElementById('lng').value
  const bike = {
    name: document.getElementById('name').value.trim(),
    brand: document.getElementById('brand').value.trim(),
    model: document.getElementById('model').value.trim() || null,
    size: document.getElementById('size').value,
    frame_material: document.getElementById('frame-material').value || null,
    groupset: document.getElementById('groupset').value.trim() || null,
    weight_kg: document.getElementById('weight').value ? parseFloat(document.getElementById('weight').value) : null,
    price_per_day: parseFloat(document.getElementById('price').value),
    location: document.getElementById('location').value.trim(),
    image_url: document.getElementById('image-url').value.trim() || null,
    description: document.getElementById('description').value.trim() || null,
    lat: latVal ? parseFloat(latVal) : null,
    lng: lngVal ? parseFloat(lngVal) : null,
    available: true,
    owner_id: window._currentUserId
  }

  btn.disabled = true
  btn.textContent = '发布中...'

  const { data, error } = await supabase.from('bikes').insert(bike).select().single()

  if (error) {
    errorEl.textContent = '发布失败：' + error.message
    errorEl.style.display = 'block'
    btn.disabled = false
    btn.textContent = '发布车辆'
    return
  }

  successEl.textContent = '🎉 车辆发布成功！正在跳转...'
  successEl.style.display = 'block'
  btn.textContent = '发布成功'

  setTimeout(() => { window.location.href = `bike-detail.html?id=${data.id}` }, 2000)
}

window.geocodeLocation = async function () {
  const location = document.getElementById('location').value.trim()
  const btn = document.getElementById('geo-btn')
  const result = document.getElementById('geo-result')

  if (!location) {
    result.textContent = '请先填写所在城市/地区'
    return
  }

  btn.disabled = true
  btn.textContent = '定位中...'
  result.textContent = ''

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location + ' 中国')}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'zh-CN' } }
    )
    const data = await res.json()

    if (data && data.length > 0) {
      const { lat, lon, display_name } = data[0]
      document.getElementById('lat').value = parseFloat(lat).toFixed(6)
      document.getElementById('lng').value = parseFloat(lon).toFixed(6)
      result.style.color = '#16a34a'
      result.textContent = `✅ 已定位：${display_name.split(',').slice(0, 3).join(',')}`
    } else {
      result.style.color = '#dc2626'
      result.textContent = '未找到该地区，请手动填写坐标'
    }
  } catch {
    result.style.color = '#dc2626'
    result.textContent = '网络错误，请手动填写坐标'
  }

  btn.disabled = false
  btn.textContent = '📍 根据地区自动获取坐标'
}

init()
