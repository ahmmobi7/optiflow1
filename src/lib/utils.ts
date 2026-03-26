
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `OPT-${year}${month}-${random}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}-${random}`;
}

export const POWER_VALUES = [
  'PL', '+0.25', '+0.50', '+0.75', '+1.00', '+1.25', '+1.50', '+1.75',
  '+2.00', '+2.25', '+2.50', '+2.75', '+3.00', '+3.25', '+3.50', '+3.75',
  '+4.00', '+4.50', '+5.00', '+5.50', '+6.00',
  '-0.25', '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75',
  '-2.00', '-2.25', '-2.50', '-2.75', '-3.00', '-3.25', '-3.50', '-3.75',
  '-4.00', '-4.50', '-5.00', '-5.50', '-6.00', '-6.50', '-7.00', '-8.00',
  '-9.00', '-10.00', '-11.00', '-12.00',
];

export const CYL_VALUES = [
  'DS', '-0.25', '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75',
  '-2.00', '-2.25', '-2.50', '-2.75', '-3.00', '-3.50', '-4.00',
];

export const AXIS_VALUES = Array.from({ length: 180 }, (_, i) => String(i + 1));

export const ADD_VALUES = [
  '+0.75', '+1.00', '+1.25', '+1.50', '+1.75', '+2.00',
  '+2.25', '+2.50', '+2.75', '+3.00', '+3.25', '+3.50',
];
