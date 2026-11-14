'use client';

import React from 'react';
import { OrderRecord } from '@/types/pos';
import { formatNumberID } from '@/lib/pricing';
import { Printer, QrCode, Wifi } from 'lucide-react';

interface ThermalReceiptPreviewProps {
  order: OrderRecord;
  isCopy?: boolean;
  isPracticeMode?: boolean;
  animateFeed?: boolean;
  showPrintActions?: boolean;
  onPrintThermal?: () => void;
  onPrintBrowser?: () => void;
}

export function ThermalReceiptPreview({
  order,
  isCopy = false,
  isPracticeMode = false,
  animateFeed = false,
  showPrintActions = false,
  onPrintThermal,
  onPrintBrowser,
}: ThermalReceiptPreviewProps) {
  const { business, receipt } = order.receiptSnapshot;

  const is80mm = receipt.paperWidth === 80;
  const fontSizeClass =
    receipt.fontSize === 'small'
      ? 'text-[10px]'
      : receipt.fontSize === 'large'
        ? 'text-[12.5px]'
        : 'text-[11px]';

  const alignClass =
    receipt.alignHeader === 'left' ? 'text-left' : 'text-center';

  const dividerClass =
    receipt.template === 'classic'
      ? 'border-b-2 border-double border-stone-500 my-2.5'
      : receipt.template === 'modern'
        ? 'border-b border-stone-300 my-2.5'
        : 'border-b border-dashed border-stone-400 my-2.5';

  const paidDate = new Date(order.paidAt);
  const dateStr = paidDate.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = paidDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const paymentLabel =
    order.paymentMethod === 'cash'
      ? 'TUNAI'
      : order.paymentMethod === 'qris'
        ? 'QRIS'
        : 'TRANSFER';

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`receipt-paper text-stone-900 font-mono ${fontSizeClass} leading-tight p-5 rounded-sm select-none border border-stone-300/70 transition-all duration-300 ${
          is80mm ? 'w-full max-w-[360px]' : 'w-full max-w-[295px]'
        } ${animateFeed ? 'animate-paper' : ''}`}
      >
        {/* Top Copy / Practice Badges */}
        {isPracticeMode && (
          <div className="bg-amber-200/80 text-stone-900 text-center font-bold py-1 px-2 mb-2 text-[10px] tracking-wider uppercase border border-amber-500">
            *** CONTOH LATIHAN ONBOARDING ***
          </div>
        )}
        {isCopy && (
          <div className="bg-stone-200 text-stone-800 text-center font-bold py-0.5 px-2 mb-2 text-[10px] tracking-widest uppercase">
            *** SALINAN CETAK ULANG ***
          </div>
        )}
        {order.status === 'voided' && (
          <div className="bg-red-200 text-red-900 text-center font-bold py-1 px-2 mb-2 text-[10px] tracking-widest uppercase border border-red-500">
            *** TRANSAKSI VOID / DIBATALKAN ***
          </div>
        )}

        {/* Business Identity Header */}
        <div className={`${alignClass} space-y-1`}>
          {receipt.showLogo && (
            <div
              className={`inline-flex items-center justify-center ${
                receipt.template === 'modern'
                  ? 'w-10 h-10 rounded-full bg-stone-900 text-stone-50 text-lg font-bold mb-1'
                  : 'text-base font-bold mb-0.5'
              }`}
            >
              {business.logoText || '☕'}
            </div>
          )}

          <div
            className={`font-bold tracking-wider text-stone-950 ${
              receipt.template === 'classic'
                ? 'text-sm uppercase underline decoration-stone-400 underline-offset-4'
                : 'text-sm uppercase'
            }`}
          >
            {business.businessName || 'Nama Cafe'}
          </div>

          {receipt.showTagline && business.tagline && (
            <div className="text-[10px] text-stone-600 italic">
              &ldquo;{business.tagline}&rdquo;
            </div>
          )}

          {receipt.showAddress && business.address && (
            <div className="text-[10px] text-stone-600 leading-snug">
              {business.address}
            </div>
          )}

          {(receipt.showPhone || receipt.showSocial) && (
            <div className="text-[10px] text-stone-600">
              {[
                receipt.showPhone ? business.phone : '',
                receipt.showSocial ? business.instagram : '',
              ]
                .filter(Boolean)
                .join(' • ')}
            </div>
          )}

          {business.taxId && (
            <div className="text-[9.5px] text-stone-500">
              NPWP: {business.taxId}
            </div>
          )}

          {receipt.headerText && (
            <div className="text-[10px] text-stone-700 pt-1 font-medium">
              {receipt.headerText}
            </div>
          )}
        </div>

        <div className={dividerClass} />

        {/* Order Metadata & Queue Number */}
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between items-center">
            <span className="truncate pr-2">No: {order.orderNo}</span>
            <span className="font-bold bg-stone-900 text-stone-50 px-1.5 py-0.5 rounded-[2px]">
              #{order.queueNo}
            </span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>
              Tgl: {dateStr} {timeStr}
            </span>
            <span className="font-semibold text-stone-800">
              {order.orderType === 'dine_in' ? 'Dine-In' : 'Takeaway'}
            </span>
          </div>
          {(receipt.showCashier || receipt.showTable || receipt.showCustomer) && (
            <div className="flex justify-between text-stone-600">
              <span>
                {receipt.showCashier ? `Kasir: ${order.cashierName}` : ''}
              </span>
              <span className="font-medium text-stone-800">
                {[
                  receipt.showTable && order.tableNo ? order.tableNo : '',
                  receipt.showCustomer && order.customerName
                    ? order.customerName
                    : '',
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            </div>
          )}
        </div>

        <div className={dividerClass} />

        {/* Order Line Items */}
        <div className="space-y-1.5">
          {order.items.map((item) => (
            <div key={item.id} className="leading-snug">
              <div className="font-semibold text-stone-900">
                {item.name}
                {item.variantLabel ? (
                  <span className="font-normal text-stone-600">
                    {' '}
                    ({item.variantLabel})
                  </span>
                ) : null}
              </div>
              <div className="flex justify-between text-stone-700">
                <span>
                  {item.qty} x {formatNumberID(item.unitPrice)}
                </span>
                <span className="font-bold text-stone-950">
                  Rp {formatNumberID(item.qty * item.unitPrice)}
                </span>
              </div>
              {item.notes && (
                <div className="text-[9.5px] text-stone-500 italic">
                  * Catatan: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={dividerClass} />

        {/* Financial Totals & Mandatory Tax Breakdown */}
        <div className="space-y-1">
          <div className="flex justify-between text-stone-700">
            <span>Subtotal</span>
            <span>Rp {formatNumberID(order.subtotal)}</span>
          </div>

          {order.discountTotal > 0 && (
            <div className="flex justify-between text-stone-700">
              <span>
                Diskon{order.discountName ? ` (${order.discountName})` : ''}
              </span>
              <span>-Rp {formatNumberID(order.discountTotal)}</span>
            </div>
          )}

          {business.taxEnabled !== false && (
            <div className="flex justify-between text-stone-600 text-[10px]">
              <span>DPP (Dasar Pajak)</span>
              <span>Rp {formatNumberID(order.dppTotal)}</span>
            </div>
          )}

          {order.serviceTotal > 0 && (
            <div className="flex justify-between text-stone-700">
              <span>Service ({business.serviceRate}%)</span>
              <span>Rp {formatNumberID(order.serviceTotal)}</span>
            </div>
          )}

          {business.taxEnabled !== false ? (
            <div className="flex justify-between text-stone-800 font-medium">
              <span>
                {business.taxName || 'Pajak'} ({business.taxRate}%
                {business.taxInclusive ? ' Termasuk' : ''})
              </span>
              <span>Rp {formatNumberID(order.taxTotal)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-stone-500 text-[10px]">
              <span>{business.taxName || 'PPN'} (Nonaktif)</span>
              <span>Rp 0</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-stone-950 text-xs pt-1.5 border-t border-stone-400">
            <span>TOTAL AKHIR</span>
            <span>Rp {formatNumberID(order.grandTotal)}</span>
          </div>

          <div className="flex justify-between text-stone-600 pt-0.5 text-[10px]">
            <span>Diterima ({paymentLabel})</span>
            <span>Rp {formatNumberID(order.paymentReceived)}</span>
          </div>
          <div className="flex justify-between text-stone-600 text-[10px]">
            <span>Kembalian</span>
            <span>Rp {formatNumberID(order.paymentChange)}</span>
          </div>
        </div>

        <div className={dividerClass} />

        {/* Custom Footer & Wi-Fi & QR */}
        <div className="text-center space-y-1.5 text-[10px] text-stone-700">
          {receipt.showWifi && (receipt.wifiSsid || receipt.wifiPassword) && (
            <div className="inline-flex items-center justify-center gap-1 bg-stone-200/70 px-2 py-0.5 rounded text-[9.5px] font-mono text-stone-800">
              <Wifi className="w-3 h-3" />
              <span>
                Wi-Fi: <strong>{receipt.wifiSsid}</strong> • Pass:{' '}
                <strong>{receipt.wifiPassword}</strong>
              </span>
            </div>
          )}

          {receipt.footerText && (
            <div className="whitespace-pre-line leading-relaxed font-sans text-stone-700">
              {receipt.footerText}
            </div>
          )}

          {receipt.showQr && receipt.qrContent && (
            <div className="pt-1.5 flex flex-col items-center gap-1">
              <div className="p-1.5 border border-stone-400 rounded bg-white inline-flex items-center justify-center">
                <QrCode className="w-12 h-12 text-stone-900 stroke-[1.5]" />
              </div>
              <span className="text-[9px] text-stone-500 truncate max-w-[220px]">
                {receipt.qrContent}
              </span>
            </div>
          )}

          <div className="pt-2 text-[8.5px] font-mono text-stone-400 tracking-widest uppercase">
            *** MyPOS • {receipt.paperWidth}MM THERMAL ***
          </div>
        </div>
      </div>

      {showPrintActions && (
        <div className="mt-4 flex items-center gap-2 w-full max-w-[320px] no-print">
          {onPrintThermal && (
            <button
              type="button"
              onClick={onPrintThermal}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center gap-1.5 shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Thermal ESC/POS</span>
            </button>
          )}
          {onPrintBrowser && (
            <button
              type="button"
              onClick={onPrintBrowser}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors"
            >
              Dialog Print / PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
