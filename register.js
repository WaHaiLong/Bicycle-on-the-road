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

  if (!fullName) {
    errorEl.textContent = '请输入昵称'
    errorEl.style.display = 'block'
    return
  }
  if (password.length < 8) {
    errorEl.textContent = '密码至少需要8位'
    errorEl.style.display = 'block'
    return
  }
  if (password !== confirmPassword) {
    errorEl.textContent = '两次输入的密码不一致'
    errorEl.style.display = 'block'
    return
  }

  btn.disabled = true
  btn.textContent = '注册中...'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  })

  if (error) {
    const msgMap = {
      'User already registered': '该邮箱已注册，请直接登录',
      'Password should be at least 6 characters': '密码至少需要6位',
    }
    errorEl.textContent = msgMap[error.message] || error.message
    errorEl.style.display = 'block'
    btn.disabled = false
    btn.textContent = '注册'
    return
  }

  // 如果项目开启了邮箱确认
  if (data.user && !data.session) {
    successEl.innerHTML = `
      ✅ 注册成功！<br>
      <small>我们已向 <strong>${email}</strong> 发送了验证邮件，请点击邮件中的链接完成验证后再登录。</small>
    `
  } else {
    successEl.textContent = '注册成功！正在跳转...'
  }
  successEl.style.display = 'block'
  btn.textContent = '注册成功'

  setTimeout(() => { window.location.href = 'login.html' }, 4000)
}
