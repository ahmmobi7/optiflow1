import Link from 'next/link';
import { Layers, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">OptiFlow</span>
        </div>
        <h1 className="text-6xl font-black text-slate-900 mb-3">404</h1>
        <p className="text-slate-500 mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/"
          className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-3 rounded-xl hover:bg-blue-700 transition">
          <ArrowLeft className="w-4 h-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
