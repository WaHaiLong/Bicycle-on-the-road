-- 为 bikes 表添加坐标字段（用于地图显示）
-- 在 Supabase SQL Editor 中执行此文件

ALTER TABLE bikes ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 7);
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS lng DECIMAL(10, 7);
