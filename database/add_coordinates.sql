-- 为 bikes 表添加坐标字段（用于地图显示）
-- 在 Supabase SQL Editor 中执行此文件

ALTER TABLE bikes ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 7);
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS lng DECIMAL(10, 7);

-- 更新示例数据的坐标
UPDATE bikes SET lat = 39.9219, lng = 116.4439 WHERE location = '北京朝阳区';
UPDATE bikes SET lat = 31.2317, lng = 121.4533 WHERE location = '上海静安区';
UPDATE bikes SET lat = 23.1291, lng = 113.3644 WHERE location = '广州天河区';
UPDATE bikes SET lat = 22.5431, lng = 113.9301 WHERE location = '深圳南山区';
UPDATE bikes SET lat = 30.6419, lng = 104.0677 WHERE location = '成都武侯区';
