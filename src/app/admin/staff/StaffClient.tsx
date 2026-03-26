'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { Profile } from '@/types';
import { formatDate } from '@/lib/utils';
import { UserPlus, Loader2, UserX, Users, Wrench, Store, ToggleLeft, ToggleRight, X, Plus } from 'lucide-react';

interface StaffClientProps {
  staff: Profile[];
  adminProfile: Profile;
}

export default function StaffClient({ staff: initialStaff, adminProfile }: StaffClientProps) {
  const supabase = createClient();
  const [staff, setStaff] = useState(initialStaff);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', owner_name: '', role: 'technician' as 'technician' | 'optician' });
  const [tab, setTab] = useState<'technician' | 'optician'>('technician');

  const u = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const technicians = staff.filter(s => s.role === 'technician');
  const opticians = staff.filter(s => s.role === 'optician');
  const displayed = tab === 'technician' ? technicians : opticians;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.owner_name) {
      toast.error('All fields required');
      return;
    }
    setLoading(true);

    try {
      // Use service role via API route
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setStaff(prev => [data.profile, ...prev]);
      setShowAddModal(false);
      setForm({ email: '', password: '', owner_name: '', role: 'technician' });
      toast.success(`${form.role} account created!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    }
    setLoading(false);
  };

  const handleToggleActive = async (member: Profile) => {
    setActionLoading(member.id);
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);

    if (error) {
      toast.error('Failed to update');
    } else {
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: !s.is_active } : s));
      toast.success(member.is_active ? 'Account deactivated' : 'Account activated');
    }
    setActionLoading(null);
  };

  const TabBtn = ({ value, label, count, icon: Icon }: { value: 'technician' | 'optician'; label: string; count: number; icon: typeof Wrench }) => (
    <button onClick={() => setTab(value)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
        tab === value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
      }`}>
      <Icon className="w-4 h-4" />
      {label}
      <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Staff Management</h1>
            <p className="text-slate-400 text-xs">{technicians.length} technicians · {opticians.length} opticians</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition shadow-sm">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
        <div className="flex gap-2">
          <TabBtn value="technician" label="Technicians" count={technicians.length} icon={Wrench} />
          <TabBtn value="optician" label="Opticians" count={opticians.length} icon={Store} />
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-3">
        {displayed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-900 mb-1">No {tab}s yet</p>
            <p className="text-slate-400 text-sm mb-4">Create accounts for your {tab}s</p>
            <button onClick={() => { setForm(f => ({ ...f, role: tab })); setShowAddModal(true); }}
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition">
              <UserPlus className="w-4 h-4" />
              Add {tab}
            </button>
          </div>
        ) : (
          displayed.map(member => (
            <div key={member.id} className={`bg-white rounded-2xl border p-4 transition ${
              !member.is_active ? 'border-slate-100 opacity-60' : 'border-slate-100 hover:border-blue-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  member.role === 'technician' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                  <span className={`font-bold text-sm ${member.role === 'technician' ? 'text-amber-700' : 'text-blue-700'}`}>
                    {(member.owner_name || member.shop_name || member.email)[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {member.owner_name || member.shop_name || 'No name set'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{member.email}</p>
                  <p className="text-xs text-slate-300 mt-0.5">Joined {formatDate(member.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    member.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleToggleActive(member)} disabled={actionLoading === member.id}
                    className="text-slate-400 hover:text-blue-600 transition p-1.5 rounded-lg hover:bg-blue-50">
                    {actionLoading === member.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : member.is_active
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-900 text-lg">Create Staff Account</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-slate-100 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['technician', 'optician'] as const).map(r => (
                    <button key={r} type="button" onClick={() => u('role', r)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                        form.role === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <input type="text" required value={form.owner_name} onChange={e => u('owner_name', e.target.value)}
                  placeholder="Ravi Patel"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" required value={form.email} onChange={e => u('email', e.target.value)}
                  placeholder="ravi@lab.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
                <input type="password" required value={form.password} onChange={e => u('password', e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
