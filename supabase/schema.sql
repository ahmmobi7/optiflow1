-- OptiFlow Schema v3 — fixes infinite recursion + role assignment
-- Drop everything and recreate cleanly in Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'optician',
  shop_name TEXT,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE public.order_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at   BEFORE UPDATE ON public.orders   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup (only inserts, never overwrites existing role)
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
-- SECURITY DEFINER HELPER — reads role WITHOUT triggering RLS
-- This is the KEY fix for "infinite recursion detected in policy"
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- Uses get_my_role() — never queries profiles from within a profiles policy
-- ============================================================
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests  ENABLE ROW LEVEL SECURITY;

-- PROFILES: simple own-row access + role-based using the helper function
CREATE POLICY "profiles_select_own"   ON public.profiles FOR SELECT USING (auth.uid() = id OR public.get_my_role() IN ('admin', 'technician'));
CREATE POLICY "profiles_insert_own"   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.get_my_role() = 'admin');

-- ORDERS
CREATE POLICY "orders_select" ON public.orders FOR SELECT USING (
  optician_id = auth.uid() OR public.get_my_role() IN ('admin', 'technician')
);
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (
  optician_id = auth.uid() OR public.get_my_role() = 'admin'
);
CREATE POLICY "orders_update" ON public.orders FOR UPDATE USING (
  optician_id = auth.uid() OR public.get_my_role() IN ('admin', 'technician')
);

-- ORDER STATUS HISTORY: open insert for all authenticated, read based on ownership/role
CREATE POLICY "history_insert" ON public.order_status_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "history_select" ON public.order_status_history FOR SELECT USING (
  public.get_my_role() IN ('admin', 'technician')
  OR EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND optician_id = auth.uid())
);

-- INVOICES
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (
  optician_id = auth.uid() OR public.get_my_role() = 'admin'
);
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE USING (public.get_my_role() = 'admin');

-- NOTIFICATIONS
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- DELIVERY REQUESTS
CREATE POLICY "delivery_all_own"   ON public.delivery_requests FOR ALL   USING (optician_id = auth.uid());
CREATE POLICY "delivery_staff_sel" ON public.delivery_requests FOR SELECT USING (public.get_my_role() IN ('admin', 'technician'));

-- ============================================================
-- STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('order-attachments', 'order-attachments', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'order-attachments');

-- ============================================================
-- AFTER RUNNING: set admin role for your admin user
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
-- ============================================================
