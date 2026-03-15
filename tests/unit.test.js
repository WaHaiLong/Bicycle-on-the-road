/**
 * 单元测试 - 纯业务逻辑（无网络依赖）
 * 运行：node --test tests/unit.test.js
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

// ─────────────────────────────────────────────
// 复用前端相同的业务函数（从 JS 文件提取）
// ─────────────────────────────────────────────

function calcRentalDays(startDate, endDate) {
  return Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000)
}

function calcTotalPrice(startDate, endDate, pricePerDay) {
  const days = calcRentalDays(startDate, endDate)
  return days * pricePerDay
}

function isValidDateRange(startDate, endDate) {
  return endDate > startDate
}

function filterBikes(bikes, { price, material, size, keyword } = {}) {
  return bikes.filter(bike => {
    if (material && bike.frame_material !== material) return false
    if (size && bike.size !== size) return false
    if (price) {
      const p = parseFloat(bike.price_per_day)
      if (price === '0-100' && p >= 100) return false
      if (price === '100-200' && (p < 100 || p > 200)) return false
      if (price === '200+' && p <= 200) return false
    }
    if (keyword) {
      const k = keyword.toLowerCase()
      const match =
        bike.name.toLowerCase().includes(k) ||
        bike.brand.toLowerCase().includes(k) ||
        bike.location.toLowerCase().includes(k) ||
        (bike.model && bike.model.toLowerCase().includes(k))
      if (!match) return false
    }
    return true
  })
}

const STATUS_LABELS = {
  pending: '待确认',
  confirmed: '已确认',
  active: '骑行中',
  completed: '已完成',
  cancelled: '已取消'
}

// 测试数据
const MOCK_BIKES = [
  { id: '1', name: '速龙碳纤公路车', brand: 'Giant', model: 'TCR Advanced', size: 'M', price_per_day: 150, frame_material: '碳纤维', location: '北京朝阳区', available: true },
  { id: '2', name: '铝合金入门公路车', brand: 'Trek', model: 'Domane AL 2', size: 'S', price_per_day: 80, frame_material: '铝合金', location: '上海静安区', available: true },
  { id: '3', name: '钛合金旅行公路车', brand: 'Surly', model: 'Cross-Check', size: 'L', price_per_day: 200, frame_material: '钛合金', location: '广州天河区', available: true },
  { id: '4', name: '竞速碳纤公路车', brand: 'Specialized', model: 'Tarmac SL7', size: 'M', price_per_day: 300, frame_material: '碳纤维', location: '深圳南山区', available: false },
  { id: '5', name: '经典铝合金公路车', brand: 'Cannondale', model: 'Synapse 105', size: 'L', price_per_day: 120, frame_material: '铝合金', location: '成都武侯区', available: true },
]

// ─────────────────────────────────────────────
// 1. 租金计算
// ─────────────────────────────────────────────
describe('1. 租金计算', () => {
  test('1天租金', () => {
    assert.equal(calcRentalDays('2024-06-01', '2024-06-02'), 1)
    assert.equal(calcTotalPrice('2024-06-01', '2024-06-02', 150), 150)
  })

  test('5天租金', () => {
    assert.equal(calcRentalDays('2024-06-01', '2024-06-06'), 5)
    assert.equal(calcTotalPrice('2024-06-01', '2024-06-06', 150), 750)
  })

  test('跨月租金', () => {
    assert.equal(calcRentalDays('2024-06-28', '2024-07-03'), 5)
    assert.equal(calcTotalPrice('2024-06-28', '2024-07-03', 200), 1000)
  })

  test('跨年租金', () => {
    assert.equal(calcRentalDays('2024-12-30', '2025-01-02'), 3)
    assert.equal(calcTotalPrice('2024-12-30', '2025-01-02', 300), 900)
  })

  test('小数价格计算', () => {
    const total = calcTotalPrice('2024-06-01', '2024-06-04', 99.5)
    assert.equal(total, 298.5)
  })
})

// ─────────────────────────────────────────────
// 2. 日期验证
// ─────────────────────────────────────────────
describe('2. 日期验证', () => {
  test('有效日期范围', () => {
    assert.equal(isValidDateRange('2024-06-01', '2024-06-10'), true)
  })

  test('相同日期无效', () => {
    assert.equal(isValidDateRange('2024-06-01', '2024-06-01'), false)
  })

  test('结束早于开始无效', () => {
    assert.equal(isValidDateRange('2024-06-10', '2024-06-01'), false)
  })

  test('跨月有效', () => {
    assert.equal(isValidDateRange('2024-06-25', '2024-07-05'), true)
  })

  test('跨年有效', () => {
    assert.equal(isValidDateRange('2024-12-31', '2025-01-01'), true)
  })
})

// ─────────────────────────────────────────────
// 3. 搜索与筛选
// ─────────────────────────────────────────────
describe('3. 搜索与筛选', () => {
  test('无筛选返回全部', () => {
    const result = filterBikes(MOCK_BIKES)
    assert.equal(result.length, 5)
  })

  test('按材质筛选 - 碳纤维', () => {
    const result = filterBikes(MOCK_BIKES, { material: '碳纤维' })
    assert.equal(result.length, 2)
    result.forEach(b => assert.equal(b.frame_material, '碳纤维'))
  })

  test('按材质筛选 - 铝合金', () => {
    const result = filterBikes(MOCK_BIKES, { material: '铝合金' })
    assert.equal(result.length, 2)
  })

  test('按材质筛选 - 钛合金', () => {
    const result = filterBikes(MOCK_BIKES, { material: '钛合金' })
    assert.equal(result.length, 1)
    assert.equal(result[0].brand, 'Surly')
  })

  test('按尺寸筛选 - M码', () => {
    const result = filterBikes(MOCK_BIKES, { size: 'M' })
    assert.equal(result.length, 2)
    result.forEach(b => assert.equal(b.size, 'M'))
  })

  test('按尺寸筛选 - L码', () => {
    const result = filterBikes(MOCK_BIKES, { size: 'L' })
    assert.equal(result.length, 2)
  })

  test('价格筛选 - 100元以下', () => {
    const result = filterBikes(MOCK_BIKES, { price: '0-100' })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, '2')
  })

  test('价格筛选 - 100-200元', () => {
    const result = filterBikes(MOCK_BIKES, { price: '100-200' })
    assert.equal(result.length, 3)
    result.forEach(b => {
      assert.ok(parseFloat(b.price_per_day) >= 100 && parseFloat(b.price_per_day) <= 200)
    })
  })

  test('价格筛选 - 200元以上', () => {
    const result = filterBikes(MOCK_BIKES, { price: '200+' })
    assert.equal(result.length, 1)
    assert.equal(result[0].id, '4')
  })

  test('关键词搜索 - 品牌名', () => {
    const result = filterBikes(MOCK_BIKES, { keyword: 'giant' })
    assert.equal(result.length, 1)
    assert.equal(result[0].brand, 'Giant')
  })

  test('关键词搜索 - 地点', () => {
    const result = filterBikes(MOCK_BIKES, { keyword: '上海' })
    assert.equal(result.length, 1)
    assert.equal(result[0].location, '上海静安区')
  })

  test('关键词搜索 - 不存在的词', () => {
    const result = filterBikes(MOCK_BIKES, { keyword: 'BrandXYZ' })
    assert.equal(result.length, 0)
  })

  test('组合筛选 - 碳纤维 + M码', () => {
    const result = filterBikes(MOCK_BIKES, { material: '碳纤维', size: 'M' })
    assert.equal(result.length, 2)
  })

  test('组合筛选 - 铝合金 + 100-200 + L码', () => {
    const result = filterBikes(MOCK_BIKES, { material: '铝合金', price: '100-200', size: 'L' })
    assert.equal(result.length, 1)
    assert.equal(result[0].brand, 'Cannondale')
  })
})

// ─────────────────────────────────────────────
// 4. 状态标签
// ─────────────────────────────────────────────
describe('4. 租约状态', () => {
  test('所有状态都有对应标签', () => {
    const statuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled']
    statuses.forEach(s => {
      assert.ok(STATUS_LABELS[s], `状态 ${s} 缺少标签`)
    })
  })

  test('标签内容正确', () => {
    assert.equal(STATUS_LABELS['pending'], '待确认')
    assert.equal(STATUS_LABELS['confirmed'], '已确认')
    assert.equal(STATUS_LABELS['active'], '骑行中')
    assert.equal(STATUS_LABELS['completed'], '已完成')
    assert.equal(STATUS_LABELS['cancelled'], '已取消')
  })
})

// ─────────────────────────────────────────────
// 5. 数据验证（前端表单）
// ─────────────────────────────────────────────
describe('5. 表单验证', () => {
  test('必填字段验证', () => {
    const validateBike = ({ name, brand, size, price_per_day, location }) => {
      const errors = []
      if (!name?.trim()) errors.push('名称必填')
      if (!brand?.trim()) errors.push('品牌必填')
      if (!size) errors.push('尺寸必填')
      if (!price_per_day || price_per_day <= 0) errors.push('价格必须大于0')
      if (!location?.trim()) errors.push('地点必填')
      return errors
    }

    assert.deepEqual(validateBike({}), ['名称必填', '品牌必填', '尺寸必填', '价格必须大于0', '地点必填'])
    assert.deepEqual(validateBike({ name: '测试', brand: 'Brand', size: 'M', price_per_day: 100, location: '北京' }), [])
    assert.deepEqual(validateBike({ name: '测试', brand: 'Brand', size: 'M', price_per_day: -1, location: '北京' }), ['价格必须大于0'])
  })

  test('密码长度验证', () => {
    const isValidPassword = pwd => !!(pwd && pwd.length >= 8)
    assert.equal(isValidPassword('12345678'), true)
    assert.equal(isValidPassword('1234567'), false)
    assert.equal(isValidPassword(''), false)
    assert.equal(isValidPassword(null), false)
  })

  test('密码一致性验证', () => {
    const passwordMatch = (pwd, confirm) => pwd === confirm
    assert.equal(passwordMatch('Test@123', 'Test@123'), true)
    assert.equal(passwordMatch('Test@123', 'Test@124'), false)
  })

  test('评价星级范围验证', () => {
    const isValidRating = r => Number.isInteger(r) && r >= 1 && r <= 5
    assert.equal(isValidRating(1), true)
    assert.equal(isValidRating(5), true)
    assert.equal(isValidRating(0), false)
    assert.equal(isValidRating(6), false)
    assert.equal(isValidRating(3.5), false)
  })

  test('图片 URL 格式验证', () => {
    const isValidUrl = url => {
      if (!url) return true // 可选字段
      try { new URL(url); return true } catch { return false }
    }
    assert.equal(isValidUrl(''), true)
    assert.equal(isValidUrl(null), true)
    assert.equal(isValidUrl('https://example.com/image.jpg'), true)
    assert.equal(isValidUrl('not-a-url'), false)
  })
})

// ─────────────────────────────────────────────
// 6. 车辆展示逻辑
// ─────────────────────────────────────────────
describe('6. 车辆展示', () => {
  test('可用车辆计数', () => {
    const available = MOCK_BIKES.filter(b => b.available)
    assert.equal(available.length, 4)
  })

  test('不可用车辆计数', () => {
    const unavailable = MOCK_BIKES.filter(b => !b.available)
    assert.equal(unavailable.length, 1)
    assert.equal(unavailable[0].brand, 'Specialized')
  })

  test('价格排序 - 从低到高', () => {
    const sorted = [...MOCK_BIKES].sort((a, b) => a.price_per_day - b.price_per_day)
    assert.equal(sorted[0].price_per_day, 80)
    assert.equal(sorted[4].price_per_day, 300)
  })

  test('价格排序 - 从高到低', () => {
    const sorted = [...MOCK_BIKES].sort((a, b) => b.price_per_day - a.price_per_day)
    assert.equal(sorted[0].price_per_day, 300)
    assert.equal(sorted[4].price_per_day, 80)
  })

  test('平均评分计算', () => {
    const ratings = [5, 4, 3, 5, 4]
    const avg = (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
    assert.equal(avg, '4.2')
  })

  test('星级显示', () => {
    const stars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating)
    assert.equal(stars(5), '★★★★★')
    assert.equal(stars(3), '★★★☆☆')
    assert.equal(stars(1), '★☆☆☆☆')
  })
})
