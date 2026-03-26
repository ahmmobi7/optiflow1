'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Profile } from '@/types';
import { User, Save, Loader2, Store, Phone, MapPin, Hash } from 'lucide-react';

export default function ProfileClient({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    shop_name: profile.shop_name || '',
    owner_name: profile.owner_name || '',
    phone: profile.phone || '',
    address: profile.address || '',
    gst_number: profile.gst_number || '',
  });

  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update(form)
      .eq('id', profile.id);

    if (error) toast.error('Failed to update profile');
    else toast.success('Profile updated!');
    setLoading(false);
  };

  const roleLabel = profile.role === 'admin' ? 'Lab Admin' : profile.role === 'technician' ? 'Lab Technician' : 'Optician';
  const roleBg = profile.role === 'admin' ? 'bg-violet-100 text-violet-700' : profile.role === 'technician' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className="max-w-xl mx-auto">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-400 text-xs mt-0.5">{profile.email}</p>
      </div>

      <div className="p-4 lg:p-8 space-y-5">
        {/* Avatar card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {(form.shop_name || form.owner_name || profile.email)[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-lg">{form.shop_name || form.owner_name || 'Your Shop'}</p>
            <p className="text-slate-400 text-sm">{profile.email}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${roleBg}`}>{roleLabel}</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shop Information</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> Shop Name
            </label>
            <input type="text" value={form.shop_name} onChange={e => u('shop_name', e.target.value)}
              placeholder="Vision Care Optics"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Owner Name
            </label>
            <input type="text" value={form.owner_name} onChange={e => u('owner_name', e.target.value)}
              placeholder="Rajesh Sharma"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </label>
            <input type="tel" value={form.phone} onChange={e => u('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Shop Address
            </label>
            <textarea value={form.address} onChange={e => u('address', e.target.value)}
              placeholder="Shop No. 5, Main Market, Mumbai 400001"
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> GST Number <span className="text-slate-300 normal-case font-normal">(optional)</span>
            </label>
            <input type="text" value={form.gst_number} onChange={e => u('gst_number', e.target.value)}
              placeholder="22AAAAA0000A1Z5"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </form>

        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-xs text-slate-400 text-center">Account email cannot be changed. Contact support for email changes.</p>
        </div>
      </div>
    </div>
  );
}
