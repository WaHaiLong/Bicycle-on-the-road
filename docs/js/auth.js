import { supabase } from './supabase.js'

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = 'index.html'
}

// 更新导航栏登录状态
export async function updateNav() {
  const user = await getUser()
  const navAuth = document.getElementById('nav-auth')
  const navUser = document.getElementById('nav-user')
  const navUsername = document.getElementById('nav-username')
  const navMyRentals = document.getElementById('nav-my-rentals')
  const navListBike = document.getElementById('nav-list-bike')

  if (user) {
    if (navAuth) navAuth.style.display = 'none'
    if (navUser) navUser.style.display = 'flex'
    if (navMyRentals) navMyRentals.style.display = 'inline'
    if (navListBike) navListBike.style.display = 'inline'
    if (navUsername) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      navUsername.textContent = profile?.full_name || user.email.split('@')[0]
    }
  } else {
    if (navAuth) navAuth.style.display = 'flex'
    if (navUser) navUser.style.display = 'none'
  }
}

// 挂载全局 signOut 函数
window.signOut = signOut

// 自动运行
updateNav()
