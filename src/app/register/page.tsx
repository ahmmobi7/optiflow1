'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Layers, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';

type Step = 1 | 2;

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    shop_name: '',
    owner_name: '',
    phone: '',
    address: '',
    gst_number: '',
  });

  const update = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { role: 'optician' },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          shop_name: form.shop_name,
          owner_name: form.owner_name,
          phone: form.phone,
          address: form.address,
          gst_number: form.gst_number || null,
          role: 'optician',
        })
        .eq('id', data.user.id);

      if (profileError) {
        // Profile might not exist yet if email confirmation needed
        toast.success('Account created! Please check your email to verify.');
      } else {
        toast.success('Account created successfully!');
        router.push('/dashboard');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
        backgroundSize: '32px 32px',
      }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">OptiFlow</span>
          </div>
          <p className="text-slate-400 text-sm">Register your optical shop</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                step === s ? 'bg-blue-500 text-white' :
                step > s ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-400'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'bg-green-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          {step === 1 ? (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Account Details</h2>
              <p className="text-slate-400 text-sm mb-6">Step 1 of 2 — Create your login</p>
              <form onSubmit={handleNext} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                  <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-blue-400 transition text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                  <input type="password" required value={form.password} onChange={e => update('password', e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-blue-400 transition text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
                  <input type="password" required value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-blue-400 transition text-sm" />
                </div>
                <button type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white transition">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-white">Shop Details</h2>
              </div>
              <p className="text-slate-400 text-sm mb-6 ml-7">Step 2 of 2 — Your shop information</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Shop name <span className="text-red-400">*</span></label>
                  <input type="text" required value={form.shop_name} onChange={e => update('shop_name', e.target.value)}
                    placeholder="Vision Care Optics"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-blue-400 transition text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Owner name <span className="text-red-400">*</span></label>
                  <input type="text" required value={form.owner_name} onChange={e => update('owner_name', e.target.value)}
                    placeholder="Rajesh Sharma"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-blue-400 transition text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone number <span className="text-red-400">*</span></label>
                  <input type="tel" required value={form.phone} onChange={e => update('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-blue-400 transition text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Shop address <span className="text-red-400">*</span></label>
                  <textarea required value={form.address} onChange={e => update('address', e.target.value)}
                    placeholder="Shop No. 5, Main Market, Mumbai 400001"
                    rows={2}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-blue-400 transition text-sm resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">GST number <span className="text-slate-500">(optional)</span></label>
                  <input type="text" value={form.gst_number} onChange={e => update('gst_number', e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:border-blue-400 transition text-sm" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</> : <>Create Account <Check className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-slate-400 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
