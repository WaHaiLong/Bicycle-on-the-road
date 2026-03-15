import { supabase } from './supabase.js'

window.handleRegister = async function (e) {
  e.preventDefault()

  const fullName = document.getElementById('full-name').value.trim()
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const confirmPassword = document.getElementById('confirm-password').value
  const btn = document.getElementById('submit-btn')
  const errorEl = document.getElementById('error-msg')
  const successEl = document.getElementById('success-msg')

  errorEl.style.display = 'none'
  successEl.style.display = 'none'

  if (password !== confirmPassword) {
    errorEl.textContent = '两次输入的密码不一致'
    errorEl.style.display = 'block'
    return
  }

  btn.disabled = true
  btn.textContent = '注册中...'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  })

  if (error) {
    errorEl.textContent = error.message
    errorEl.style.display = 'block'
    btn.disabled = false
    btn.textContent = '注册'
    return
  }

  successEl.textContent = '注册成功！请检查你的邮箱完成验证，然后登录。'
  successEl.style.display = 'block'
  btn.textContent = '注册成功'

  setTimeout(() => { window.location.href = 'login.html' }, 3000)
}
