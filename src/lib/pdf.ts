import type { Invoice, JoinedProfile } from '@/types';
import { formatDate, formatCurrency } from './utils';

// Loose type so callers can pass full Order or partial joined objects
type OrderLike = Record<string, unknown>;

/**
 * Accepts the full Order (from order detail page) or a slim partial order
 * (from billing/invoices pages). All fields are read with nullish fallbacks.
 */
export async function generatePDF(order: OrderLike, invoice: Invoice) {
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Safe field readers (works with full Order or partial object)
  const get = (key: string): string => String(order[key] ?? '—');
  const getNum = (key: string): number => Number(order[key] ?? 0);

  // ─── Header brand bar ────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('OptiFlow', margin, 17);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Optical Lab Management Platform', margin, 23);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageW - margin, 17, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, pageW - margin, 23, { align: 'right' });

  // ─── Optician details ─────────────────────────────────────────────────────
  let y = 38;
  doc.setTextColor(30, 30, 30);

  const joinedProfile = (order.profiles ?? {}) as JoinedProfile;
  const shopName = joinedProfile.shop_name ?? 'Optician';
  const ownerName = joinedProfile.owner_name ?? '';
  const gstNumber = joinedProfile.gst_number ?? '';

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(shopName, margin, y + 6);
  if (ownerName) doc.text(ownerName, margin, y + 11);
  if (gstNumber) doc.text(`GSTIN: ${gstNumber}`, margin, y + 16);

  // Right side: invoice meta
  const col2x = pageW / 2 + 10;
  doc.setFontSize(9);
  const metaRows: [string, string][] = [
    ['Invoice No', invoice.invoice_number],
    ['Order No',   get('order_number')],
    ['Invoice Date', formatDate(invoice.created_at)],
    ['Order Date',   formatDate(get('created_at'))],
    ['Status',       invoice.status.toUpperCase()],
  ];
  metaRows.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', col2x, y + 6 + i * 6);
    doc.setFont('helvetica', 'normal');
    doc.text(value, col2x + 32, y + 6 + i * 6);
  });

  // ─── Divider ──────────────────────────────────────────────────────────────
  y += 32;
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);

  // ─── Job Details ──────────────────────────────────────────────────────────
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Job Details', margin, y);

  y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Field', 'Details']],
    body: [
      ['Patient Name', get('customer_name')],
      ['Frame Type',   get('frame_type')],
      ['Lens Type',    get('lens_type')],
      ['Lens Material', get('lens_material')],
      ['Coating',      get('lens_coating')],
      ['PD',           get('pd_distance')],
    ],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
  });

  // ─── Prescription ─────────────────────────────────────────────────────────
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Prescription', margin, y);

  y += 5;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Eye', 'SPH', 'CYL', 'AXIS', 'ADD']],
    body: [
      ['Right (RE)', get('re_sph'), get('re_cyl'), get('re_axis'), get('re_add')],
      ['Left (LE)',  get('le_sph'), get('le_cyl'), get('le_axis'), get('le_add')],
    ],
    theme: 'grid',
    headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9, fontStyle: 'bold', cellPadding: 4, halign: 'center' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
  });

  // ─── Pricing ──────────────────────────────────────────────────────────────
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Amount']],
    body: [
      ['Lens & Frame Service', formatCurrency(invoice.subtotal)],
      ...(invoice.discount > 0 ? [['Discount', `-${formatCurrency(invoice.discount)}`]] : []),
      [`GST @ ${invoice.gst_rate}%`, formatCurrency(invoice.gst_amount)],
    ],
    foot: [['TOTAL AMOUNT', formatCurrency(invoice.total_amount)]],
    theme: 'plain',
    headStyles: { fillColor: [248, 250, 252], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9, cellPadding: 4 },
    footStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 11 },
    columnStyles: { 1: { halign: 'right' } },
  });

  // ─── Footer ───────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageH - 20, pageW, 20, 'F');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Generated by OptiFlow · Thank you for your business!', pageW / 2, pageH - 11, { align: 'center' });
  doc.text(new Date().toLocaleDateString('en-IN'), pageW / 2, pageH - 6, { align: 'center' });

  doc.save(`${invoice.invoice_number}.pdf`);
}
