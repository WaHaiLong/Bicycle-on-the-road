-- 公路车出租平台数据库结构
-- Road Bike Rental Platform Database Schema

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户资料表（关联 Supabase Auth）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 公路车表
CREATE TABLE IF NOT EXISTS bikes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,
  size TEXT NOT NULL,           -- 车架尺寸: XS/S/M/L/XL
  price_per_day DECIMAL(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  location TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  frame_material TEXT,          -- 车架材质: 碳纤维/铝合金/钛合金
  groupset TEXT,                -- 变速组: Shimano 105/Ultegra/SRAM等
  weight_kg DECIMAL(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 租赁订单表
CREATE TABLE IF NOT EXISTS rentals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bike_id UUID REFERENCES bikes(id) ON DELETE CASCADE NOT NULL,
  renter_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER GENERATED ALWAYS AS (end_date - start_date) STORED,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- 评价表
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bike_id UUID REFERENCES bikes(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (rental_id, reviewer_id)
);

-- 行级安全策略 (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- profiles 策略
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- bikes 策略
CREATE POLICY "Bikes are viewable by everyone" ON bikes FOR SELECT USING (TRUE);
CREATE POLICY "Owners can insert bikes" ON bikes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update bikes" ON bikes FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete bikes" ON bikes FOR DELETE USING (auth.uid() = owner_id);

-- rentals 策略
CREATE POLICY "Users can view own rentals" ON rentals FOR SELECT USING (auth.uid() = renter_id);
CREATE POLICY "Bike owners can view rentals for their bikes" ON rentals FOR SELECT
  USING (EXISTS (SELECT 1 FROM bikes WHERE bikes.id = bike_id AND bikes.owner_id = auth.uid()));
CREATE POLICY "Authenticated users can create rentals" ON rentals FOR INSERT
  WITH CHECK (auth.uid() = renter_id);
CREATE POLICY "Renters can update own rentals" ON rentals FOR UPDATE USING (auth.uid() = renter_id);

-- reviews 策略
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "Renters can write reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- 自动创建用户资料的触发器
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 无示例数据，由真实用户注册后通过"发布车辆"页面添加
