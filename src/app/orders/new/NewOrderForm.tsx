'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Profile, FrameType, LensType, LensMaterial } from '@/types';
import { POWER_VALUES, CYL_VALUES, AXIS_VALUES, ADD_VALUES, generateOrderNumber } from '@/lib/utils';
import { Camera, Upload, X, AlertTriangle, ChevronLeft, CheckCircle2, Loader2, Eye, User, Settings } from 'lucide-react';

interface NewOrderFormProps { profile: Profile; }

type Step = 'patient' | 'prescription' | 'lens' | 'details';
const STEPS: Step[] = ['patient', 'prescription', 'lens', 'details'];
const STEP_LABELS = { patient: 'Patient', prescription: 'Rx', lens: 'Lens', details: 'Details' };

const FRAME_TYPES: FrameType[] = ['Full Rim', 'Half Rim', 'Rimless', 'Supra'];
const LENS_TYPES: LensType[] = ['Single Vision', 'Bifocal', 'Progressive', 'Photochromic', 'Anti-Reflective'];
const LENS_MATERIALS: LensMaterial[] = ['CR-39', 'Polycarbonate', 'High Index 1.67', 'High Index 1.74', 'Trivex'];
const COATINGS = ['None', 'Anti-Reflective (AR)', 'Blue Cut', 'Blue Cut + AR', 'Photochromic', 'Polarized'];

const PD_VALUES = Array.from({ length: 40 }, (_, i) => String(55 + i * 0.5));

export default function NewOrderForm({ profile }: NewOrderFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>('patient');
  const [loading, setLoading] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const prescriptionRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    frame_type: 'Full Rim' as FrameType,
    frame_brand: '',
    lens_type: 'Single Vision' as LensType,
    lens_material: 'CR-39' as LensMaterial,
    lens_coating: 'None',
    re_sph: 'PL', re_cyl: 'DS', re_axis: '', re_add: '',
    le_sph: 'PL', le_cyl: 'DS', le_axis: '', le_add: '',
    pd_distance: '63', pd_near: '',
    special_instructions: '',
    is_urgent: false,
    delivery_type: 'pickup' as 'pickup' | 'delivery',
    delivery_address: '',
    base_price: '',
    estimated_delivery: '',
  });

  const u = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const currentStepIndex = STEPS.indexOf(step);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/${folder}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('order-attachments')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('order-attachments').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) { toast.error('Customer name is required'); return; }
    setLoading(true);
    try {
      let prescriptionUrl = '';
      let frameUrl = '';
      if (prescriptionFile) prescriptionUrl = await uploadFile(prescriptionFile, 'rx');
      if (frameFile) frameUrl = await uploadFile(frameFile, 'frame');

      const orderNumber = generateOrderNumber();
      const { data: order, error } = await supabase.from('orders').insert({
        order_number: orderNumber,
        optician_id: profile.id,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        frame_type: form.frame_type,
        frame_brand: form.frame_brand.trim() || null,
        lens_type: form.lens_type,
        lens_material: form.lens_material,
        lens_coating: form.lens_coating !== 'None' ? form.lens_coating : null,
        re_sph: form.re_sph, re_cyl: form.re_cyl,
        re_axis: form.re_axis || null, re_add: form.re_add || null,
        le_sph: form.le_sph, le_cyl: form.le_cyl,
        le_axis: form.le_axis || null, le_add: form.le_add || null,
        pd_distance: form.pd_distance,
        pd_near: form.pd_near || null,
        special_instructions: form.special_instructions.trim() || null,
        is_urgent: form.is_urgent,
        prescription_photo_url: prescriptionUrl || null,
        frame_photo_url: frameUrl || null,
        status: 'order_received',
        delivery_type: form.delivery_type,
        delivery_address: form.delivery_address.trim() || null,
        base_price: parseFloat(form.base_price) || 0,
        estimated_delivery: form.estimated_delivery || null,
      }).select().single();

      if (error) throw error;

      // Add initial status history
      await supabase.from('order_status_history').insert({
        order_id: order.id, status: 'order_received', updated_by: profile.id, notes: 'Order placed by optician',
      });

      // Create notification for admin
      await supabase.from('notifications').insert({
        user_id: profile.id,
        order_id: order.id,
        title: 'Order placed successfully',
        message: `Order ${orderNumber} for ${form.customer_name} has been submitted.`,
        type: 'success',
      });

      toast.success(`Order ${orderNumber} placed!`);
      router.push(`/orders/${order.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    }
    setLoading(false);
  };

  const SelectField = ({ label, value, options, onChange, required }: {
    label: string; value: string; options: string[]; onChange: (v: string) => void; required?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition appearance-none">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const PowerRow = ({ side, prefix }: { side: 'RE' | 'LE'; prefix: 're' | 'le' }) => {
    const needAxis = form[`${prefix}_cyl`] !== 'DS';
    const needAdd = ['Bifocal', 'Progressive'].includes(form.lens_type);
    return (
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${side === 'RE' ? 'bg-blue-500' : 'bg-violet-500'}`}>
            {side === 'RE' ? 'R' : 'L'}
          </div>
          <span className="font-semibold text-sm text-slate-700">{side === 'RE' ? 'Right Eye' : 'Left Eye'}</span>
        </div>
        <div className={`grid gap-2 ${needAdd ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <SelectField label="SPH" value={form[`${prefix}_sph`] as string} options={POWER_VALUES} onChange={v => u(`${prefix}_sph`, v)} />
          <SelectField label="CYL" value={form[`${prefix}_cyl`] as string} options={CYL_VALUES} onChange={v => u(`${prefix}_cyl`, v)} />
          {needAxis && <SelectField label="AXIS" value={form[`${prefix}_axis`] as string || '90'} options={AXIS_VALUES} onChange={v => u(`${prefix}_axis`, v)} />}
          {!needAxis && <div className="flex flex-col justify-end pb-1">
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">AXIS</span>
              <span className="text-sm text-slate-300 bg-slate-100 rounded-xl px-3 py-2 block text-center">—</span>
            </div>
          </div>}
          {needAdd && <SelectField label="ADD" value={form[`${prefix}_add`] as string || '+1.00'} options={ADD_VALUES} onChange={v => u(`${prefix}_add`, v)} />}
        </div>
      </div>
    );
  };

  const FileUpload = ({ label, file, setFile, inputRef, accept }: {
    label: string; file: File | null; setFile: (f: File | null) => void;
    inputRef: React.RefObject<HTMLInputElement>; accept: string;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
      {file ? (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Camera className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm text-blue-700 font-medium truncate flex-1">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-blue-400 hover:text-red-500 transition flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition">
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Tap to upload</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => currentStepIndex > 0 ? setStep(STEPS[currentStepIndex - 1]) : router.back()}
            className="p-2 rounded-xl hover:bg-slate-200 transition text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-slate-900 text-lg">New Order</h1>
            <p className="text-xs text-slate-400">Step {currentStepIndex + 1} of {STEPS.length} — {STEP_LABELS[step]}</p>
          </div>
          {form.is_urgent && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-lg urgent-pulse">URGENT</span>
          )}
        </div>
        {/* Progress */}
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentStepIndex ? 'bg-blue-500' : i === currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'
            }`} />
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-8 pb-32">
        {/* STEP 1: Patient Info */}
        {step === 'patient' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> Patient Info
              </h2>
              <p className="text-slate-400 text-sm mt-1">Who is this order for?</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Customer Name <span className="text-red-400">*</span>
              </label>
              <input type="text" value={form.customer_name} onChange={e => u('customer_name', e.target.value)}
                placeholder="Rahul Shah" required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
              <input type="tel" value={form.customer_phone} onChange={e => u('customer_phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Frame Type <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FRAME_TYPES.map(ft => (
                    <button key={ft} onClick={() => u('frame_type', ft)}
                      className={`px-2 py-2 rounded-xl text-xs font-semibold border transition ${
                        form.frame_type === ft ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}>
                      {ft}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Frame Brand</label>
                <input type="text" value={form.frame_brand} onChange={e => u('frame_brand', e.target.value)}
                  placeholder="Titan, Ray-Ban..."
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
              </div>
            </div>
            {/* Urgent toggle */}
            <button onClick={() => u('is_urgent', !form.is_urgent)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition ${
                form.is_urgent ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
              <AlertTriangle className={`w-5 h-5 ${form.is_urgent ? 'text-red-500' : 'text-slate-300'}`} />
              <div className="text-left flex-1">
                <p className={`font-semibold text-sm ${form.is_urgent ? 'text-red-700' : 'text-slate-600'}`}>Mark as Urgent</p>
                <p className={`text-xs ${form.is_urgent ? 'text-red-500' : 'text-slate-400'}`}>Priority processing requested</p>
              </div>
              <div className={`w-10 h-6 rounded-full transition-all ${form.is_urgent ? 'bg-red-500' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm mt-0.5 transition-all ${form.is_urgent ? 'ml-4.5 ml-5' : 'ml-0.5'}`} />
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: Prescription */}
        {step === 'prescription' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" /> Prescription
              </h2>
              <p className="text-slate-400 text-sm mt-1">Enter the power details for both eyes</p>
            </div>
            <PowerRow side="RE" prefix="re" />
            <PowerRow side="LE" prefix="le" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="PD Distance" value={form.pd_distance} options={PD_VALUES} onChange={v => u('pd_distance', v)} />
              <SelectField label="PD Near" value={form.pd_near || 'N/A'} options={['N/A', ...PD_VALUES]} onChange={v => u('pd_near', v === 'N/A' ? '' : v)} />
            </div>
            <FileUpload label="Upload Prescription Photo (optional)" file={prescriptionFile}
              setFile={setPrescriptionFile} inputRef={prescriptionRef} accept="image/*" />
          </div>
        )}

        {/* STEP 3: Lens */}
        {step === 'lens' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" /> Lens Options
              </h2>
              <p className="text-slate-400 text-sm mt-1">Choose lens type and material</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lens Type</label>
              <div className="grid grid-cols-2 gap-2">
                {LENS_TYPES.map(lt => (
                  <button key={lt} onClick={() => u('lens_type', lt)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition ${
                      form.lens_type === lt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}>
                    {lt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lens Material</label>
              <div className="grid grid-cols-1 gap-2">
                {LENS_MATERIALS.map(lm => (
                  <button key={lm} onClick={() => u('lens_material', lm)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition flex items-center justify-between ${
                      form.lens_material === lm ? 'bg-blue-50 text-blue-700 border-blue-400' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}>
                    {lm}
                    {form.lens_material === lm && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lens Coating</label>
              <div className="grid grid-cols-2 gap-2">
                {COATINGS.map(c => (
                  <button key={c} onClick={() => u('lens_coating', c)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                      form.lens_coating === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <FileUpload label="Upload Frame Photo (optional)" file={frameFile}
              setFile={setFrameFile} inputRef={frameRef} accept="image/*" />
          </div>
        )}

        {/* STEP 4: Delivery & Details */}
        {step === 'details' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Final Details</h2>
              <p className="text-slate-400 text-sm mt-1">Delivery preferences and special instructions</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Delivery Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['pickup', 'delivery'] as const).map(dt => (
                  <button key={dt} onClick={() => u('delivery_type', dt)}
                    className={`py-3 rounded-xl text-sm font-semibold border transition ${
                      form.delivery_type === dt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                    {dt === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                  </button>
                ))}
              </div>
            </div>
            {form.delivery_type === 'delivery' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Delivery Address</label>
                <textarea value={form.delivery_address} onChange={e => u('delivery_address', e.target.value)}
                  placeholder="Full shop address for delivery..." rows={2}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expected Delivery Date</label>
              <input type="date" value={form.estimated_delivery} onChange={e => u('estimated_delivery', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Job Price (₹)</label>
              <input type="number" value={form.base_price} onChange={e => u('base_price', e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Special Instructions</label>
              <textarea value={form.special_instructions} onChange={e => u('special_instructions', e.target.value)}
                placeholder="E.g. Tint required, handle with care, match existing frame..." rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none" />
            </div>

            {/* Order Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Order Summary</p>
              {[
                ['Customer', form.customer_name],
                ['Frame', `${form.frame_type}${form.frame_brand ? ` — ${form.frame_brand}` : ''}`],
                ['Lens', `${form.lens_type}, ${form.lens_material}`],
                ['Coating', form.lens_coating],
                ['RE Power', `${form.re_sph} / ${form.re_cyl}${form.re_axis ? ` × ${form.re_axis}` : ''}`],
                ['LE Power', `${form.le_sph} / ${form.le_cyl}${form.le_axis ? ` × ${form.le_axis}` : ''}`],
                ['PD', form.pd_distance],
                ['Delivery', form.delivery_type === 'pickup' ? 'Shop pickup' : 'Delivery to address'],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800 text-right max-w-[55%]">{v}</span>
                </div>
              ))}
              {form.is_urgent && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-red-600 text-xs font-semibold">URGENT ORDER</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 p-4 flex gap-3">
        {currentStepIndex > 0 && (
          <button onClick={() => setStep(STEPS[currentStepIndex - 1])}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition">
            Back
          </button>
        )}
        {step !== 'details' ? (
          <button onClick={() => {
            if (step === 'patient' && !form.customer_name.trim()) {
              toast.error('Please enter customer name');
              return;
            }
            setStep(STEPS[currentStepIndex + 1]);
          }}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-200 active:scale-[0.98]">
            Continue →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 bg-blue-600 disabled:opacity-60 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Placing Order...</> : '✓ Place Order'}
          </button>
        )}
      </div>
    </div>
  );
}
