'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePos } from '@/context/PosContext';
import { ThermalReceiptPreview } from '@/components/receipt/ThermalReceiptPreview';
import { OrderRecord } from '@/types/pos';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';

export default function PublicDigitalReceiptPage() {
  const params = useParams<{ id: string }>();
  const { orders } = usePos();
  const [dbOrder, setDbOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const memOrder = orders.find(
    (o) => o.id === params?.id || o.orderNo === params?.id
  );

  useEffect(() => {
    if (!params?.id) {
      setLoading(false);
      return;
    }
    if (memOrder) {
      setDbOrder(memOrder);
      setLoading(false);
      return;
    }
    fetch(`/api/supabase-sync?orderId=${encodeURIComponent(params.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.order) {
          setDbOrder(data.order);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params?.id, memOrder]);

  const order = memOrder || dbOrder;

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-200 flex flex-col items-center justify-center p-6 text-xs gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
        <p>Memuat struk digital dari database...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-200 flex flex-col items-center justify-center p-6 text-xs">
        <p>Struk digital tidak ditemukan di database.</p>
        <Link href="/pos" className="text-brand-400 underline mt-2">
          Kembali ke POS
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 py-10 px-4 flex flex-col items-center">
      <div className="w-full max-w-sm flex items-center justify-between mb-6 no-print">
        <Link
          href="/pos"
          className="text-xs font-bold text-stone-300 hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke MyPOS</span>
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Simpan PDF / Cetak</span>
        </button>
      </div>

      <ThermalReceiptPreview order={order} />
    </main>
  );
}
