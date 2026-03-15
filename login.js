import { supabase } from './supabase.js'

window.handleLogin = async function (e) {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const btn = document.getElementById('submit-btn')
  const errorEl = document.getElementById('error-msg')

  errorEl.style.display = 'none'
  btn.disabled = true
  btn.textContent = '登录中...'

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    errorEl.textContent = error.message === 'Invalid login credentials'
      ? '邮箱或密码错误'
      : error.message
    errorEl.style.display = 'block'
    btn.disabled = false
    btn.textContent = '登录'
    return
  }

  const params = new URLSearchParams(window.location.search)
  window.location.href = params.get('redirect') || 'index.html'
}
