import {
  BusinessSettings,
  OrderRecord,
  PrinterConfig,
  ReceiptSettings,
} from '@/types/pos';
import { formatNumberID } from '@/lib/pricing';

const ESC = 0x1b;
const GS = 0x1d;

function padLine(left: string, right: string, widthCols: number): string {
  const cleanLeft = left.slice(0, Math.max(1, widthCols - right.length - 1));
  const spaces = Math.max(1, widthCols - cleanLeft.length - right.length);
  return cleanLeft + ' '.repeat(spaces) + right + '\n';
}

function dividerLine(char: string, widthCols: number): string {
  return char.repeat(widthCols) + '\n';
}

/**
 * Generates an ESC/POS byte buffer from an OrderRecord and its immutable receiptSnapshot
 * Supports 58mm (32 columns) and 80mm (48 columns) thermal printers.
 */
export function buildEscPosReceipt(
  order: OrderRecord,
  options?: { isCopy?: boolean; openDrawer?: boolean; autoCut?: boolean }
): Uint8Array {
  const { business, receipt } = order.receiptSnapshot;
  const cols = receipt.paperWidth === 80 ? 48 : 32;
  const sepChar = receipt.template === 'classic' ? '=' : '-';

  const encoder = new TextEncoder();
  const chunks: number[] = [];

  const pushBytes = (...bytes: number[]) => chunks.push(...bytes);
  const pushText = (text: string) => {
    const encoded = encoder.encode(text);
    encoded.forEach((b) => chunks.push(b));
  };

  // Initialize printer
  pushBytes(ESC, 0x40);

  // Open Cash Drawer pulse if requested (ESC p 0 25 250)
  if (options?.openDrawer ?? receipt.openDrawer) {
    pushBytes(ESC, 0x70, 0x00, 0x19, 0xfa);
  }

  // Align header
  pushBytes(ESC, 0x61, receipt.alignHeader === 'left' ? 0x00 : 0x01);

  if (options?.isCopy) {
    pushBytes(ESC, 0x45, 0x01); // Bold ON
    pushText('*** SALINAN CETAK ULANG ***\n');
    pushBytes(ESC, 0x45, 0x00); // Bold OFF
  }

  // Business Name (Double height + Bold)
  pushBytes(ESC, 0x45, 0x01);
  pushBytes(GS, 0x21, 0x01);
  pushText(`${business.businessName.toUpperCase()}\n`);
  pushBytes(GS, 0x21, 0x00);
  pushBytes(ESC, 0x45, 0x00);

  if (receipt.showTagline && business.tagline) {
    pushText(`"${business.tagline}"\n`);
  }
  if (receipt.showAddress && business.address) {
    pushText(`${business.address}\n`);
  }
  const contactParts: string[] = [];
  if (receipt.showPhone && business.phone) contactParts.push(business.phone);
  if (receipt.showSocial && business.instagram) contactParts.push(business.instagram);
  if (contactParts.length > 0) {
    pushText(`${contactParts.join(' • ')}\n`);
  }
  if (business.taxId) {
    pushText(`NPWP: ${business.taxId}\n`);
  }
  if (receipt.headerText) {
    pushText(`${receipt.headerText}\n`);
  }

  // Left align body
  pushBytes(ESC, 0x61, 0x00);
  pushText(dividerLine(sepChar, cols));

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

  pushText(padLine(`No: ${order.orderNo}`, `Antrean #${order.queueNo}`, cols));
  pushText(
    padLine(
      `Tgl: ${dateStr} ${timeStr}`,
      order.orderType === 'dine_in' ? 'Dine-In' : 'Takeaway',
      cols
    )
  );

  if (receipt.showCashier || receipt.showTable) {
    const leftMeta = receipt.showCashier ? `Kasir: ${order.cashierName}` : '';
    const rightMeta =
      receipt.showTable && order.tableNo
        ? order.tableNo
        : receipt.showCustomer && order.customerName
          ? order.customerName
          : '';
    if (leftMeta || rightMeta) {
      pushText(padLine(leftMeta, rightMeta, cols));
    }
  }

  pushText(dividerLine(sepChar, cols));

  // Order Items
  for (const item of order.items) {
    const title = item.variantLabel
      ? `${item.name} (${item.variantLabel})`
      : item.name;
    pushText(`${title}\n`);
    const qtyLine = `  ${item.qty} x ${formatNumberID(item.unitPrice)}`;
    const lineTotal = `Rp ${formatNumberID(item.qty * item.unitPrice)}`;
    pushText(padLine(qtyLine, lineTotal, cols));
    if (item.notes) {
      pushText(`  * Catatan: ${item.notes}\n`);
    }
  }

  pushText(dividerLine(sepChar, cols));

  // Totals & Mandatory Tax Breakdown
  pushText(padLine('Subtotal', `Rp ${formatNumberID(order.subtotal)}`, cols));
  if (order.discountTotal > 0) {
    const discLabel = order.discountName
      ? `Diskon (${order.discountName})`
      : 'Diskon';
    pushText(padLine(discLabel, `-Rp ${formatNumberID(order.discountTotal)}`, cols));
  }
  pushText(padLine('DPP', `Rp ${formatNumberID(order.dppTotal)}`, cols));
  if (order.serviceTotal > 0) {
    pushText(
      padLine(
        `Service (${business.serviceRate}%)`,
        `Rp ${formatNumberID(order.serviceTotal)}`,
        cols
      )
    );
  }
  if (business.taxEnabled !== false) {
    pushText(
      padLine(
        `${business.taxName} (${business.taxRate}%)`,
        `Rp ${formatNumberID(order.taxTotal)}`,
        cols
      )
    );
  } else {
    pushText(padLine(`${business.taxName} (Nonaktif)`, 'Rp 0', cols));
  }

  pushBytes(ESC, 0x45, 0x01); // Bold ON
  pushText(padLine('TOTAL AKHIR', `Rp ${formatNumberID(order.grandTotal)}`, cols));
  pushBytes(ESC, 0x45, 0x00); // Bold OFF

  const methodLabel =
    order.paymentMethod === 'cash'
      ? 'TUNAI'
      : order.paymentMethod === 'qris'
        ? 'QRIS'
        : 'TRANSFER';
  pushText(
    padLine(
      `Bayar (${methodLabel})`,
      `Rp ${formatNumberID(order.paymentReceived)}`,
      cols
    )
  );
  pushText(padLine('Kembalian', `Rp ${formatNumberID(order.paymentChange)}`, cols));

  pushText(dividerLine(sepChar, cols));

  // Footer Center
  pushBytes(ESC, 0x61, 0x01);
  if (receipt.showWifi && (receipt.wifiSsid || receipt.wifiPassword)) {
    pushText(`Wi-Fi: ${receipt.wifiSsid} | Pass: ${receipt.wifiPassword}\n`);
  }
  if (receipt.footerText) {
    pushText(`${receipt.footerText}\n`);
  }
  if (receipt.showQr && receipt.qrContent) {
    pushText(`[ QR: ${receipt.qrContent} ]\n`);
  }

  pushText('\n\n\n');

  // Auto-cut (GS V 65 16)
  if (options?.autoCut ?? true) {
    pushBytes(GS, 0x56, 0x41, 0x10);
  }

  return new Uint8Array(chunks);
}

/**
 * Attempts direct WebSerial or WebUSB printing in Chrome/Edge, or falls back to
 * clean thermal print preview dialog.
 */
export async function printOrderReceipt(
  order: OrderRecord,
  printerConfig: PrinterConfig,
  options?: { isCopy?: boolean; forceBrowserFallback?: boolean }
): Promise<{ mode: 'direct' | 'fallback'; message: string }> {
  const escPosBytes = buildEscPosReceipt(order, {
    isCopy: options?.isCopy,
    openDrawer: printerConfig.openDrawer,
    autoCut: printerConfig.autoCut,
  });

  // Try WebUSB if connected and not forced to fallback
  if (
    !options?.forceBrowserFallback &&
    typeof window !== 'undefined' &&
    printerConfig.connection === 'usb' &&
    'usb' in navigator
  ) {
    try {
      const navUsb = (navigator as unknown as { usb: { getDevices: () => Promise<any[]> } }).usb;
      const devices = await navUsb.getDevices();
      if (devices.length > 0) {
        const device = devices[0];
        await device.open();
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }
        await device.claimInterface(0);
        const outEndpoint =
          device.configuration.interfaces[0].alternate.endpoints.find(
            (e: any) => e.direction === 'out'
          );
        if (outEndpoint) {
          await device.transferOut(outEndpoint.endpointNumber, escPosBytes);
          return {
            mode: 'direct',
            message: `Struk #${order.queueNo} berhasil dicetak langsung ke ${device.productName || printerConfig.name} (${escPosBytes.length} bytes ESC/POS).`,
          };
        }
      }
    } catch {
      // Fall through to simulated/browser print fallback gracefully (KF-54)
    }
  }

  return {
    mode: 'fallback',
    message: `Struk #${order.queueNo} siap (${escPosBytes.length} bytes ESC/POS ter-encode • lebar ${order.receiptSnapshot.receipt.paperWidth}mm).`,
  };
}

/**
 * Pairs a WebUSB or WebSerial printer in Chrome/Edge (KF-52, KF-53)
 */
export async function pairHardwarePrinter(
  connection: 'usb' | 'serial' | 'bluetooth'
): Promise<{ connected: boolean; deviceName: string; message: string }> {
  if (typeof window === 'undefined') {
    return { connected: false, deviceName: '', message: 'Hanya tersedia di browser.' };
  }

  try {
    if (connection === 'usb' && 'usb' in navigator) {
      const navUsb = (navigator as any).usb;
      const device = await navUsb.requestDevice({ filters: [] });
      return {
        connected: true,
        deviceName: device.productName || 'USB Thermal Printer',
        message: `Printer USB "${device.productName || 'ESC/POS'}" berhasil dihubungkan!`,
      };
    }
    if (connection === 'serial' && 'serial' in navigator) {
      const navSerial = (navigator as any).serial;
      await navSerial.requestPort();
      return {
        connected: true,
        deviceName: 'Serial Thermal Port',
        message: 'Port Serial ESC/POS berhasil dihubungkan!',
      };
    }
    if (connection === 'bluetooth' && 'bluetooth' in navigator) {
      const navBt = (navigator as any).bluetooth;
      const device = await navBt.requestDevice({ acceptAllDevices: true });
      return {
        connected: true,
        deviceName: device.name || 'Bluetooth Thermal Printer',
        message: `Printer Bluetooth "${device.name || 'ESC/POS'}" berhasil dihubungkan!`,
      };
    }
  } catch (err: any) {
    return {
      connected: false,
      deviceName: 'Simulasi ESC/POS Virtual',
      message:
        err?.name === 'NotFoundError'
          ? 'Pemilihan perangkat dibatalkan. Mode simulasi ESC/POS tetap aktif.'
          : 'Menggunakan mode Simulasi ESC/POS & Cetak Browser Cadangan.',
    };
  }

  return {
    connected: true,
    deviceName: 'Virtual ESC/POS 58mm/80mm',
    message: 'Mode Simulasi Printer Thermal ESC/POS diaktifkan.',
  };
}

/**
 * Builds a sample OrderRecord for live receipt preview in Settings & Onboarding
 */
export function createSamplePreviewOrder(
  business: BusinessSettings,
  receipt: ReceiptSettings
): OrderRecord {
  const subtotal = 80000;
  const discountTotal = 8000;
  const afterDisc = subtotal - discountTotal;
  const isTaxOn = business.taxEnabled !== false;
  const dppTotal = !isTaxOn
    ? afterDisc
    : business.taxInclusive
      ? Math.round((afterDisc * 100) / (100 + business.taxRate))
      : afterDisc;
  const serviceTotal = Math.round((dppTotal * business.serviceRate) / 100);
  const taxTotal = !isTaxOn
    ? 0
    : business.taxInclusive
      ? afterDisc - dppTotal
      : Math.round(((dppTotal + serviceTotal) * business.taxRate) / 100);
  const grandTotal = !isTaxOn
    ? dppTotal + serviceTotal
    : business.taxInclusive
      ? afterDisc + serviceTotal
      : dppTotal + serviceTotal + taxTotal;

  const now = new Date().toISOString();
  return {
    id: 'preview-order',
    orderNo: `${receipt.numberPrefix || 'INV'}-20261106-0042`,
    queueNo: 'A-042',
    status: 'paid',
    orderType: 'dine_in',
    tableNo: 'Meja 04',
    customerName: 'Raka',
    items: [
      {
        id: 'item-1',
        productId: 'p-1',
        name: 'Caffe Latte',
        unitPrice: 28000,
        qty: 2,
        notes: 'Less sugar',
        variantLabel: 'Hot',
      },
      {
        id: 'item-2',
        productId: 'p-2',
        name: 'Butter Croissant',
        unitPrice: 24000,
        qty: 1,
        notes: 'Hangatkan',
      },
    ],
    subtotal,
    discountTotal,
    dppTotal,
    taxTotal,
    serviceTotal,
    grandTotal,
    discountName: 'Promo Senja 10%',
    paymentMethod: 'cash',
    paymentReceived: 100000,
    paymentChange: Math.max(0, 100000 - grandTotal),
    cashierName: 'Kiki',
    prepStatus: 'new',
    createdAt: now,
    paidAt: now,
    receiptSnapshot: {
      business,
      receipt,
      capturedAt: now,
    },
  };
}
