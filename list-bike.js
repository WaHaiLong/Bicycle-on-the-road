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

init()
