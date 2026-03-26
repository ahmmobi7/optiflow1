import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUSES, type OrderStatus } from '@/types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = ORDER_STATUS_COLORS[status];
  const label = ORDER_STATUS_LABELS[status];

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${colors} ${
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
    }`}>
      {status === 'delivered' ? (
        <CheckCircle2 className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
      ) : status === 'order_received' ? (
        <Circle className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
      ) : (
        <Clock className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-pulse`} />
      )}
      {label}
    </span>
  );
}

interface StatusProgressProps {
  status: OrderStatus;
}

export function StatusProgress({ status }: StatusProgressProps) {
  const currentIndex = ORDER_STATUSES.indexOf(status);
  const progress = ((currentIndex + 1) / ORDER_STATUSES.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Progress</span>
        <span className="font-medium text-slate-700">{Math.round(progress)}%</span>
      </div>
      <div className="progress-track h-2">
        <div className="progress-fill h-2" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {ORDER_STATUSES.map((s, i) => {
          const isPast = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                isCurrent ? 'bg-blue-600 ring-2 ring-blue-200 ring-offset-1' :
                isPast ? 'bg-blue-400' : 'bg-slate-200'
              }`} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-slate-400">Received</span>
        <span className="text-xs text-slate-400">Delivered</span>
      </div>
    </div>
  );
}

interface StatusStepsProps {
  status: OrderStatus;
  compact?: boolean;
}

export function StatusSteps({ status, compact = false }: StatusStepsProps) {
  const currentIndex = ORDER_STATUSES.indexOf(status);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {ORDER_STATUSES.map((s, i) => {
          const isPast = i <= currentIndex;
          return (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${
              i === currentIndex ? 'bg-blue-600' :
              isPast ? 'bg-blue-300' : 'bg-slate-200'
            }`} />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ORDER_STATUSES.map((s, i) => {
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={s} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isCurrent ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
                isPast ? 'bg-blue-100 text-blue-600' :
                'bg-slate-100 text-slate-400'
              }`}>
                {isPast ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              {i < ORDER_STATUSES.length - 1 && (
                <div className={`w-0.5 h-4 ${isPast ? 'bg-blue-200' : 'bg-slate-200'}`} />
              )}
            </div>
            <div className={`text-sm font-medium transition-all ${
              isCurrent ? 'text-blue-700' : isPast ? 'text-slate-500' : 'text-slate-300'
            }`}>
              {ORDER_STATUS_LABELS[s]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
