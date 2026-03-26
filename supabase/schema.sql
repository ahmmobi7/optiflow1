-- OptiFlow Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
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
-- ORDERS TABLE
-- ============================================================
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  optician_id UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_technician_id UUID REFERENCES public.profiles(id),

  -- Customer details
  customer_name TEXT NOT NULL,
  customer_phone TEXT,

  -- Frame details
  frame_type TEXT NOT NULL CHECK (frame_type IN ('Full Rim', 'Half Rim', 'Rimless', 'Supra')),
  frame_brand TEXT,

  -- Lens details
  lens_type TEXT NOT NULL CHECK (lens_type IN ('Single Vision', 'Bifocal', 'Progressive', 'Photochromic', 'Anti-Reflective')),
  lens_material TEXT DEFAULT 'CR-39' CHECK (lens_material IN ('CR-39', 'Polycarbonate', 'High Index 1.67', 'High Index 1.74', 'Trivex')),
  lens_coating TEXT,

  -- Power details (RE = Right Eye, LE = Left Eye)
  re_sph TEXT,
  re_cyl TEXT,
  re_axis TEXT,
  re_add TEXT,
  le_sph TEXT,
  le_cyl TEXT,
  le_axis TEXT,
  le_add TEXT,
  pd_distance TEXT,
  pd_near TEXT,

  -- Job details
  special_instructions TEXT,
  is_urgent BOOLEAN DEFAULT false,
  prescription_photo_url TEXT,
  frame_photo_url TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'order_received' CHECK (status IN (
    'order_received',
    'frame_scanning',
    'lens_edging',
    'lens_fitting',
    'quality_check',
    'ready_for_delivery',
    'delivered'
  )),

  -- Delivery
  delivery_type TEXT DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  estimated_delivery DATE,
  actual_delivery_date DATE,

  -- Pricing
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
-- INVOICES TABLE
-- ============================================================
CREATE TABLE public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  optician_id UUID REFERENCES public.profiles(id) NOT NULL,

  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 18.00,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partial')),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  payment_date TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DELIVERY REQUESTS TABLE
-- ============================================================
CREATE TABLE public.delivery_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  optician_id UUID REFERENCES public.profiles(id) NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('pickup', 'delivery', 'urgent')),
  preferred_time TEXT,
  address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
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
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'optician'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM public.orders;
  v_number := 'OPT-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM public.invoices;
  v_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Track status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, status, updated_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION track_order_status_change();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Orders: opticians see their own, technicians & admins see all
CREATE POLICY "Opticians can view own orders" ON public.orders FOR SELECT USING (optician_id = auth.uid());
CREATE POLICY "Opticians can create orders" ON public.orders FOR INSERT WITH CHECK (optician_id = auth.uid());
CREATE POLICY "Opticians can update own orders" ON public.orders FOR UPDATE USING (optician_id = auth.uid());
CREATE POLICY "Staff can view all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);

-- Order status history
CREATE POLICY "View order history" ON public.order_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND optician_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);
CREATE POLICY "Insert order history" ON public.order_status_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);

-- Invoices: opticians see their own, admins see all
CREATE POLICY "Opticians can view own invoices" ON public.invoices FOR SELECT USING (optician_id = auth.uid());
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications: users see their own
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Delivery requests
CREATE POLICY "Opticians view own delivery requests" ON public.delivery_requests FOR SELECT USING (optician_id = auth.uid());
CREATE POLICY "Opticians create delivery requests" ON public.delivery_requests FOR INSERT WITH CHECK (optician_id = auth.uid());
CREATE POLICY "Staff view all delivery requests" ON public.delivery_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);
CREATE POLICY "Staff update delivery requests" ON public.delivery_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'technician'))
);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('order-attachments', 'order-attachments', true);

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'order-attachments' AND auth.role() = 'authenticated'
);
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'order-attachments');
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (
  bucket_id = 'order-attachments' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- SEED DATA - Create initial admin user
-- ============================================================
-- Note: After running this schema, create your admin user via Supabase Auth Dashboard
-- Then run: UPDATE public.profiles SET role = 'admin', owner_name = 'Lab Admin', shop_name = 'OptiFlow Lab' WHERE email = 'your-admin@email.com';
