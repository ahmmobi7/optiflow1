export type UserRole = 'optician' | 'technician' | 'admin';

export type OrderStatus =
  | 'order_received'
  | 'frame_scanning'
  | 'lens_edging'
  | 'lens_fitting'
  | 'quality_check'
  | 'ready_for_delivery'
  | 'delivered';

export type FrameType = 'Full Rim' | 'Half Rim' | 'Rimless' | 'Supra';
export type LensType = 'Single Vision' | 'Bifocal' | 'Progressive' | 'Photochromic' | 'Anti-Reflective';
export type LensMaterial = 'CR-39' | 'Polycarbonate' | 'High Index 1.67' | 'High Index 1.74' | 'Trivex';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  shop_name?: string;
  owner_name?: string;
  phone?: string;
  address?: string;
  gst_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Partial profile shape returned by Supabase joins
export interface JoinedProfile {
  id?: string;
  shop_name?: string | null;
  owner_name?: string | null;
  phone?: string | null;
  email?: string | null;
  gst_number?: string | null;
  address?: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  optician_id?: string;
  assigned_technician_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  frame_type?: FrameType; | null;
  frame_brand?: string | null;
  lens_type?: LensType; | null;
  lens_material?: LensMaterial | null;
  lens_coating?: string | null;
  re_sph?: string | null;
  re_cyl?: string | null;
  re_axis?: string | null;
  re_add?: string | null;
  le_sph?: string | null;
  le_cyl?: string | null;
  le_axis?: string | null;
  le_add?: string | null;
  pd_distance?: string | null;
  pd_near?: string | null;
  special_instructions?: string | null;
  is_urgent: boolean;
  prescription_photo_url?: string | null;
  frame_photo_url?: string | null;
  status: OrderStatus;
  delivery_type?: 'pickup' | 'delivery';
  delivery_address?: string | null;
  estimated_delivery?: string | null;
  actual_delivery_date?: string | null;
  base_price: number;
  extra_charges: number;
  discount: number;
  created_at: string;
  updated_at: string;
  // Joined fields from Supabase select
  profiles?: JoinedProfile | null;
  technician?: JoinedProfile | null;
  invoices?: Invoice[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes?: string;
  updated_by?: string;
  created_at: string;
  profiles?: Profile;
}

// Partial order shape returned by Supabase joins
export interface JoinedOrder {
  id?: string;
  order_number?: string;
  customer_name?: string;
  status?: OrderStatus;
  frame_type?: string;
  lens_type?: string;
  base_price?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  optician_id: string;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  discount: number;
  total_amount: number;
  status: 'unpaid' | 'paid' | 'partial';
  paid_amount: number;
  payment_method?: string | null;
  payment_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields from Supabase select
  orders?: JoinedOrder | null;
  profiles?: JoinedProfile | null;
}

export interface Notification {
  id: string;
  user_id: string;
  order_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface DeliveryRequest {
  id: string;
  order_id: string;
  optician_id: string;
  request_type: 'pickup' | 'delivery' | 'urgent';
  preferred_time?: string;
  address?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  order_received: 'Order Received',
  frame_scanning: 'Frame Scanning',
  lens_edging: 'Lens Edging',
  lens_fitting: 'Lens Fitting',
  quality_check: 'Quality Check',
  ready_for_delivery: 'Ready for Delivery',
  delivered: 'Delivered',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  order_received: 'bg-slate-100 text-slate-700',
  frame_scanning: 'bg-blue-100 text-blue-700',
  lens_edging: 'bg-violet-100 text-violet-700',
  lens_fitting: 'bg-amber-100 text-amber-700',
  quality_check: 'bg-orange-100 text-orange-700',
  ready_for_delivery: 'bg-green-100 text-green-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};

export const ORDER_STATUSES: OrderStatus[] = [
  'order_received',
  'frame_scanning',
  'lens_edging',
  'lens_fitting',
  'quality_check',
  'ready_for_delivery',
  'delivered',
];
