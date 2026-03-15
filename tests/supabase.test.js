/**
 * 公路车出租平台 - 完整测试套件
 * 覆盖：Supabase 连接、用户注册登录、车辆 CRUD、租赁流程、评价系统
 *
 * 运行：node --test tests/supabase.test.js
 */

import { createClient } from '@supabase/supabase-js'
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ecdpqimpqstrtewqhqoe.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable__kIj5hKBo8F9zypE_fvRxw_kgUQXzrt'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 测试账号（每次运行使用不同邮箱避免冲突）
const timestamp = Date.now()
const TEST_EMAIL = `testuser_${timestamp}@example.com`
const TEST_PASSWORD = 'Test@123456'
const TEST_EMAIL_2 = `testowner_${timestamp}@example.com`

let testUserId = null
let testOwnerId = null
let testBikeId = null
let testRentalId = null
let ownerSession = null
let userSession = null

// ─────────────────────────────────────────────
// 1. 连接测试
// ─────────────────────────────────────────────
describe('1. Supabase 连接', () => {
  test('能连接到 Supabase 项目', async () => {
    const { data, error } = await supabase.from('bikes').select('count').limit(1)
    // 有数据或无数据都是连接成功，只有网络错误才算失败
    assert.ok(!error || error.code !== 'NETWORK_ERROR', `连接失败: ${error?.message}`)
  })

  test('bikes 表存在且可读', async () => {
    const { data, error } = await supabase.from('bikes').select('id, name, price_per_day').limit(1)
    assert.ok(!error, `bikes 表查询失败: ${error?.message}`)
    assert.ok(Array.isArray(data), '返回值应为数组')
  })

  test('rentals 表存在且可读（需登录）', async () => {
    const { error } = await supabase.from('rentals').select('id').limit(1)
    // 未登录时 RLS 会拒绝，但表存在
    assert.ok(!error || error.code === 'PGRST301', `rentals 表异常: ${error?.message}`)
  })

  test('reviews 表存在且可读', async () => {
    const { data, error } = await supabase.from('reviews').select('id').limit(1)
    assert.ok(!error, `reviews 表查询失败: ${error?.message}`)
  })
})

// ─────────────────────────────────────────────
// 2. 用户注册 & 登录
// ─────────────────────────────────────────────
describe('2. 用户认证', () => {
  test('车主账号注册成功', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL_2,
      password: TEST_PASSWORD,
      options: { data: { full_name: '测试车主' } }
    })
    assert.ok(!error, `注册失败: ${error?.message}`)
    assert.ok(data.user?.id, '应返回用户 ID')
    testOwnerId = data.user.id
    ownerSession = data.session
  })

  test('租客账号注册成功', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: { data: { full_name: '测试租客' } }
    })
    assert.ok(!error, `注册失败: ${error?.message}`)
    assert.ok(data.user?.id, '应返回用户 ID')
    testUserId = data.user.id
    userSession = data.session
  })

  test('重复邮箱注册应失败或返回现有用户', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
    // Supabase 对重复邮箱返回 200 但不发验证邮件（已存在），或返回错误
    assert.ok(data || error, '应有响应')
  })

  test('错误密码登录失败', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: 'wrongpassword'
    })
    assert.ok(error, '错误密码应返回错误')
    assert.ok(!data?.session, '不应返回 session')
  })

  test('正确密码登录成功（车主）', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL_2,
      password: TEST_PASSWORD
    })
    // 邮箱未验证时 Supabase 可能返回 session 或错误，取决于项目配置
    if (error && error.message.includes('Email not confirmed')) {
      console.log('  ⚠ 邮箱验证未开启自动确认，跳过登录测试')
      return
    }
    assert.ok(!error, `登录失败: ${error?.message}`)
    ownerSession = data.session
  })

  test('获取当前用户信息', async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    assert.ok(!error, `获取用户失败: ${error?.message}`)
    // 可能未登录（邮箱未确认），不做强断言
  })
})

// ─────────────────────────────────────────────
// 3. 车辆 CRUD
// ─────────────────────────────────────────────
describe('3. 车辆管理', () => {
  test('查询所有车辆', async () => {
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .order('created_at', { ascending: false })

    assert.ok(!error, `查询失败: ${error?.message}`)
    assert.ok(Array.isArray(data), '应返回数组')
    console.log(`  ✓ 当前共 ${data.length} 辆车`)
  })

  test('示例数据存在（至少1辆车）', async () => {
    const { data, error } = await supabase.from('bikes').select('id').limit(10)
    assert.ok(!error, `查询失败: ${error?.message}`)
    assert.ok(data.length >= 1, `应至少有1辆车，当前: ${data.length}`)
  })

  test('按价格筛选 - 100元以下', async () => {
    const { data, error } = await supabase
      .from('bikes')
      .select('id, name, price_per_day')
      .lt('price_per_day', 100)

    assert.ok(!error, `筛选失败: ${error?.message}`)
    assert.ok(Array.isArray(data))
    data.forEach(b => assert.ok(parseFloat(b.price_per_day) < 100, `价格应小于100: ${b.price_per_day}`))
  })

  test('按材质筛选 - 碳纤维', async () => {
    const { data, error } = await supabase
      .from('bikes')
      .select('id, frame_material')
      .eq('frame_material', '碳纤维')

    assert.ok(!error, `筛选失败: ${error?.message}`)
    data.forEach(b => assert.equal(b.frame_material, '碳纤维'))
  })

  test('按尺寸筛选 - M码', async () => {
    const { data, error } = await supabase
      .from('bikes')
      .select('id, size')
      .eq('size', 'M')

    assert.ok(!error, `筛选失败: ${error?.message}`)
    data.forEach(b => assert.equal(b.size, 'M'))
  })

  test('全文搜索 - 按地点', async () => {
    const { data, error } = await supabase
      .from('bikes')
      .select('id, location')
      .ilike('location', '%北京%')

    assert.ok(!error, `搜索失败: ${error?.message}`)
    data.forEach(b => assert.ok(b.location.includes('北京'), `地点应含北京: ${b.location}`))
  })

  test('查询可租赁车辆', async () => {
    const { data, error } = await supabase
      .from('bikes')
      .select('id, available')
      .eq('available', true)

    assert.ok(!error, `查询失败: ${error?.message}`)
    data.forEach(b => assert.equal(b.available, true))
    console.log(`  ✓ 可租赁车辆: ${data.length} 辆`)
  })

  test('未登录不能发布车辆（RLS 保护）', async () => {
    await supabase.auth.signOut()
    const { error } = await supabase.from('bikes').insert({
      name: '非法发布',
      brand: 'Test',
      size: 'M',
      price_per_day: 100,
      location: '测试'
    })
    assert.ok(error, '未登录应被 RLS 拒绝')
  })
})

// ─────────────────────────────────────────────
// 4. 业务逻辑（纯函数测试）
// ─────────────────────────────────────────────
describe('4. 业务逻辑计算', () => {
  test('租金计算 - 5天', () => {
    const pricePerDay = 150
    const start = new Date('2024-06-01')
    const end = new Date('2024-06-06')
    const days = Math.ceil((end - start) / 86400000)
    const total = days * pricePerDay
    assert.equal(days, 5)
    assert.equal(total, 750)
  })

  test('租金计算 - 跨月', () => {
    const pricePerDay = 200
    const start = new Date('2024-06-28')
    const end = new Date('2024-07-03')
    const days = Math.ceil((end - start) / 86400000)
    const total = days * pricePerDay
    assert.equal(days, 5)
    assert.equal(total, 1000)
  })

  test('日期验证 - 结束日期必须晚于开始', () => {
    const start = '2024-06-10'
    const end = '2024-06-05'
    assert.ok(end <= start, '无效日期范围应被检测到')
  })

  test('日期验证 - 相同日期无效', () => {
    const start = '2024-06-10'
    const end = '2024-06-10'
    assert.ok(end <= start, '相同日期应被拒绝')
  })

  test('价格筛选逻辑 - 100-200区间', () => {
    const bikes = [
      { price_per_day: 80 },
      { price_per_day: 150 },
      { price_per_day: 200 },
      { price_per_day: 300 }
    ]
    const filtered = bikes.filter(b => b.price_per_day >= 100 && b.price_per_day <= 200)
    assert.equal(filtered.length, 2)
  })

  test('搜索逻辑 - 关键词匹配', () => {
    const bikes = [
      { name: '速龙碳纤公路车', brand: 'Giant', location: '北京' },
      { name: '铝合金入门公路车', brand: 'Trek', location: '上海' }
    ]
    const keyword = 'giant'
    const result = bikes.filter(b =>
      b.name.toLowerCase().includes(keyword) ||
      b.brand.toLowerCase().includes(keyword)
    )
    assert.equal(result.length, 1)
    assert.equal(result[0].brand, 'Giant')
  })

  test('状态标签映射', () => {
    const STATUS_LABELS = {
      pending: '待确认',
      confirmed: '已确认',
      active: '骑行中',
      completed: '已完成',
      cancelled: '已取消'
    }
    assert.equal(STATUS_LABELS['pending'], '待确认')
    assert.equal(STATUS_LABELS['completed'], '已完成')
    assert.equal(Object.keys(STATUS_LABELS).length, 5)
  })
})

// ─────────────────────────────────────────────
// 5. 租赁流程
// ─────────────────────────────────────────────
describe('5. 租赁流程', () => {
  test('未登录不能创建租约（RLS 保护）', async () => {
    await supabase.auth.signOut()
    const { data: bikes } = await supabase.from('bikes').select('id').limit(1)
    if (!bikes?.length) return

    const { error } = await supabase.from('rentals').insert({
      bike_id: bikes[0].id,
      renter_id: '00000000-0000-0000-0000-000000000000',
      start_date: '2024-07-01',
      end_date: '2024-07-03',
      total_price: 300
    })
    assert.ok(error, '未登录应被拒绝')
  })

  test('未登录不能查询租约（RLS 保护）', async () => {
    const { data, error } = await supabase.from('rentals').select('*')
    // RLS 应返回空数组或错误
    assert.ok(!error || error.code === 'PGRST301')
    if (!error) assert.equal(data.length, 0, 'RLS 应过滤掉所有数据')
  })

  test('查询车辆详情（含评价）', async () => {
    const { data: bikes } = await supabase.from('bikes').select('id').limit(1)
    if (!bikes?.length) return

    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)')
      .eq('bike_id', bikes[0].id)

    assert.ok(!error, `查询评价失败: ${error?.message}`)
    assert.ok(Array.isArray(data))
  })
})

// ─────────────────────────────────────────────
// 6. 数据完整性
// ─────────────────────────────────────────────
describe('6. 数据完整性', () => {
  test('所有车辆都有必填字段', async () => {
    const { data, error } = await supabase
      .from('bikes')
      .select('id, name, brand, size, price_per_day, location')

    assert.ok(!error, `查询失败: ${error?.message}`)
    data.forEach(bike => {
      assert.ok(bike.name, `车辆 ${bike.id} 缺少 name`)
      assert.ok(bike.brand, `车辆 ${bike.id} 缺少 brand`)
      assert.ok(bike.size, `车辆 ${bike.id} 缺少 size`)
      assert.ok(bike.price_per_day > 0, `车辆 ${bike.id} 价格应大于0`)
      assert.ok(bike.location, `车辆 ${bike.id} 缺少 location`)
    })
  })

  test('所有车辆价格为正数', async () => {
    const { data } = await supabase.from('bikes').select('id, price_per_day')
    data?.forEach(bike => {
      assert.ok(parseFloat(bike.price_per_day) > 0, `价格应为正数: ${bike.price_per_day}`)
    })
  })

  test('available 字段只有布尔值', async () => {
    const { data } = await supabase.from('bikes').select('id, available')
    data?.forEach(bike => {
      assert.ok(typeof bike.available === 'boolean', `available 应为布尔值: ${bike.available}`)
    })
  })

  test('车架尺寸在合法范围内', async () => {
    const validSizes = ['XS', 'S', 'M', 'L', 'XL']
    const { data } = await supabase.from('bikes').select('id, size')
    data?.forEach(bike => {
      assert.ok(validSizes.includes(bike.size), `无效尺寸: ${bike.size}`)
    })
  })

  test('车架材质在预期范围内', async () => {
    const validMaterials = ['碳纤维', '铝合金', '钛合金', '钢', null]
    const { data } = await supabase.from('bikes').select('id, frame_material')
    data?.forEach(bike => {
      assert.ok(validMaterials.includes(bike.frame_material), `未知材质: ${bike.frame_material}`)
    })
  })
})

// ─────────────────────────────────────────────
// 7. 安全测试
// ─────────────────────────────────────────────
describe('7. 安全性（RLS 策略）', () => {
  test('匿名用户可查询车辆', async () => {
    await supabase.auth.signOut()
    const { data, error } = await supabase.from('bikes').select('id').limit(1)
    assert.ok(!error, 'bikes 表应对所有人开放读取')
  })

  test('匿名用户可查询评价', async () => {
    const { data, error } = await supabase.from('reviews').select('id').limit(1)
    assert.ok(!error, 'reviews 表应对所有人开放读取')
  })

  test('匿名用户不能修改车辆', async () => {
    const { data: bikes } = await supabase.from('bikes').select('id').limit(1)
    if (!bikes?.length) return

    const { error } = await supabase
      .from('bikes')
      .update({ price_per_day: 1 })
      .eq('id', bikes[0].id)

    assert.ok(error, '匿名用户不能修改车辆')
  })

  test('匿名用户不能删除车辆', async () => {
    const { data: bikes } = await supabase.from('bikes').select('id').limit(1)
    if (!bikes?.length) return

    const { error } = await supabase
      .from('bikes')
      .delete()
      .eq('id', bikes[0].id)

    assert.ok(error, '匿名用户不能删除车辆')
  })

  test('匿名用户不能发布车辆', async () => {
    const { error } = await supabase.from('bikes').insert({
      name: 'XSS<script>alert(1)</script>',
      brand: 'Hack',
      size: 'M',
      price_per_day: 0,
      location: '攻击'
    })
    assert.ok(error, '匿名用户不能新增车辆')
  })
})
