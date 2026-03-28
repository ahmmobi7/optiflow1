-- OptiFlow Database Schema — v2 (fixed RLS + triggers)
-- Run this in your Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'optician' CHECK (role IN ('optician', 'technician', 'admin')),
  shop_name TEXT,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS  (removed CHECK constraints that caused 500 errors)
-- ============================================================
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  optician_id UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_technician_id UUID REFERENCES public.profiles(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  frame_type TEXT NOT NULL,
  frame_brand TEXT,
  lens_type TEXT NOT NULL,
  lens_material TEXT DEFAULT 'CR-39',
  lens_coating TEXT,
  re_sph TEXT, re_cyl TEXT, re_axis TEXT, re_add TEXT,
  le_sph TEXT, le_cyl TEXT, le_axis TEXT, le_add TEXT,
  pd_distance TEXT,
  pd_near TEXT,
  special_instructions TEXT,
  is_urgent BOOLEAN DEFAULT false,
  prescription_photo_url TEXT,
  frame_photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'order_received',
  delivery_type TEXT DEFAULT 'pickup',
  delivery_address TEXT,
  estimated_delivery DATE,
  actual_delivery_date DATE,
  base_price DECIMAL(10,2) DEFAULT 0,
  extra_charges DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================
CREATE TABLE public.order_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  optician_id UUID REFERENCES public.profiles(id) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 18.00,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  paid_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  payment_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DELIVERY REQUESTS
-- ============================================================
CREATE TABLE public.delivery_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  optician_id UUID REFERENCES public.profiles(id) NOT NULL,
  request_type TEXT NOT NULL,
  preferred_time TEXT,
  address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'optician')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can do anything with profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ORDERS — opticians manage their own; staff see all
CREATE POLICY "Opticians can view own orders" ON public.orders FOR SELECT USING (optician_id = auth.uid());
CREATE POLICY "Opticians can create orders" ON public.orders FOR INSERT WITH CHECK (optician_id = auth.uid());
CREATE POLICY "Opticians can update own orders" ON public.orders FOR UPDATE USING (optician_id = auth.uid());
CREATE POLICY "Staff can view all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);
CREATE POLICY "Staff can update all orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);

-- ORDER STATUS HISTORY — allow ALL authenticated users to insert (opticians, techs, admins)
CREATE POLICY "Authenticated users can insert history" ON public.order_status_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "View history for own orders" ON public.order_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND optician_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);

-- INVOICES
CREATE POLICY "Opticians view own invoices" ON public.invoices FOR SELECT USING (optician_id = auth.uid());
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Authenticated insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- DELIVERY REQUESTS
CREATE POLICY "Opticians manage own delivery requests" ON public.delivery_requests
  FOR ALL USING (optician_id = auth.uid());
CREATE POLICY "Staff view delivery requests" ON public.delivery_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);

-- ============================================================
-- STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('order-attachments', 'order-attachments', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'order-attachments' AND auth.role() = 'authenticated'
);
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'order-attachments');

-- ============================================================
-- AFTER RUNNING THIS SCHEMA:
-- 1. Create your admin user via Supabase Auth Dashboard (or register page)
-- 2. Run this to grant admin role:
--    UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
--
-- To create technician accounts, use the Admin > Staff page in the app.
-- ============================================================
