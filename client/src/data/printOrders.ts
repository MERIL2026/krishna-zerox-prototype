export type PaperSize = "A4" | "A3" | "Legal" | "Letter";
export type ColorMode = "BW" | "COLOR";
export type PaperGsm = "75_GSM" | "100_GSM" | "220_GSM";
export type SidesMode = "SINGLE" | "DOUBLE";
export type BindingOption = "NONE" | "STAPLE" | "SPIRAL" | "HARD_BOUND";
export type LaminationOption = "NONE" | "GLOSS" | "MATTE";
export type FulfillmentType = "STORE_PICKUP" | "LOCAL_DELIVERY";
export type OrderStatus = "NEW" | "ACCEPTED" | "IN_PROGRESS" | "READY" | "COMPLETED";

export type PrintConfig = {
  paperSize: PaperSize;
  colorMode: ColorMode;
  paperGsm: PaperGsm;
  sides: SidesMode;
  copies: number;
  binding: BindingOption;
  lamination: LaminationOption;
};

export type CustomerDetails = {
  name: string;
  phone: string;
  email?: string;
  fulfillment: FulfillmentType;
  deliveryAddress?: string;
  notes?: string;
};

export type PricingBreakdown = {
  ratePerPage: number;
  printCost: number;
  paperSurcharge: number;
  bindingCost: number;
  laminationCost: number;
  deliveryFee: number;
  totalAmount: number;
  currency: "INR";
};

export type PrintOrder = {
  id: string; // e.g. "KX-PRNT-4821"
  createdAt: string;
  status: OrderStatus;
  document: {
    name: string;
    sizeBytes: number;
    type: string;
    pageCount: number;
  };
  config: PrintConfig;
  customer: CustomerDetails;
  pricing: PricingBreakdown;
  isPrototype: true;
};

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateFile(file: File): { valid: boolean; error?: string } {
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(extension);
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.type) || isAllowedExt;

  if (!isAllowedMime) {
    return {
      valid: false,
      error: `Unsupported file format (${extension || "unknown"}). Allowed formats: PDF, DOCX, JPG, JPEG, PNG.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the 25MB limit. Please upload a smaller file.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "The selected file is empty (0 bytes). Please choose a valid file.",
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Transparent Demo Pricing Engine (Rates in INR)
 */
export function calculatePrintPricing(
  pageCount: number,
  config: PrintConfig,
  fulfillment: FulfillmentType
): PricingBreakdown {
  const safePages = Math.max(1, Math.min(1000, pageCount));
  const safeCopies = Math.max(1, Math.min(500, config.copies));

  // 1. Base rate per page
  let ratePerPage = 2.0; // Default A4 BW Single
  if (config.colorMode === "COLOR") {
    ratePerPage = config.sides === "DOUBLE" ? 9.0 : 10.0;
  } else {
    ratePerPage = config.sides === "DOUBLE" ? 1.5 : 2.0;
  }

  // Paper size multiplier
  if (config.paperSize === "A3") {
    ratePerPage += config.colorMode === "COLOR" ? 12.0 : 4.0;
  } else if (config.paperSize === "Legal") {
    ratePerPage += config.colorMode === "COLOR" ? 3.0 : 1.0;
  }

  const printCost = Math.round(ratePerPage * safePages * safeCopies * 100) / 100;

  // 2. Paper sheets calculation (Double sided uses half the sheets)
  const sheetsPerCopy = config.sides === "DOUBLE" ? Math.ceil(safePages / 2) : safePages;
  const totalSheets = sheetsPerCopy * safeCopies;

  let gsmSurchargePerSheet = 0;
  if (config.paperGsm === "100_GSM") gsmSurchargePerSheet = 1.5;
  if (config.paperGsm === "220_GSM") gsmSurchargePerSheet = 6.0;

  const paperSurcharge = Math.round(gsmSurchargePerSheet * totalSheets * 100) / 100;

  // 3. Binding cost (per copy)
  let bindingRatePerCopy = 0;
  if (config.binding === "STAPLE") bindingRatePerCopy = 5.0;
  if (config.binding === "SPIRAL") bindingRatePerCopy = 35.0;
  if (config.binding === "HARD_BOUND") bindingRatePerCopy = 95.0;

  const bindingCost = bindingRatePerCopy * safeCopies;

  // 4. Lamination cost (per sheet)
  let laminationRatePerSheet = 0;
  if (config.lamination === "GLOSS") laminationRatePerSheet = 15.0;
  if (config.lamination === "MATTE") laminationRatePerSheet = 20.0;

  const laminationCost = laminationRatePerSheet * totalSheets;

  // 5. Fulfillment fee
  const deliveryFee = fulfillment === "LOCAL_DELIVERY" ? 40.0 : 0.0;

  const totalAmount = Math.max(
    5,
    Math.round(printCost + paperSurcharge + bindingCost + laminationCost + deliveryFee)
  );

  return {
    ratePerPage,
    printCost,
    paperSurcharge,
    bindingCost,
    laminationCost,
    deliveryFee,
    totalAmount,
    currency: "INR",
  };
}

export const PRINT_ORDERS_STORAGE_KEY = "krishna-zerox-print-orders";

export const INITIAL_DEMO_ORDERS: PrintOrder[] = [
  {
    id: "KX-PRNT-1024",
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    status: "IN_PROGRESS",
    document: {
      name: "project-brief.pdf",
      sizeBytes: 1.8 * 1024 * 1024,
      type: "application/pdf",
      pageCount: 6,
    },
    config: {
      paperSize: "A4",
      colorMode: "COLOR",
      paperGsm: "75_GSM",
      sides: "SINGLE",
      copies: 2,
      binding: "STAPLE",
      lamination: "NONE",
    },
    customer: {
      name: "Meril Patel",
      phone: "9876543210",
      email: "meril@paperlane.local",
      fulfillment: "STORE_PICKUP",
      notes: "Need before lunch meeting",
    },
    pricing: {
      ratePerPage: 10,
      printCost: 120,
      paperSurcharge: 0,
      bindingCost: 10,
      laminationCost: 0,
      deliveryFee: 0,
      totalAmount: 130,
      currency: "INR",
    },
    isPrototype: true,
  },
  {
    id: "KX-PRNT-1025",
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    status: "ACCEPTED",
    document: {
      name: "wedding-invite.pdf",
      sizeBytes: 4.2 * 1024 * 1024,
      type: "application/pdf",
      pageCount: 2,
    },
    config: {
      paperSize: "A4",
      colorMode: "COLOR",
      paperGsm: "220_GSM",
      sides: "DOUBLE",
      copies: 25,
      binding: "NONE",
      lamination: "GLOSS",
    },
    customer: {
      name: "Priya Shah",
      phone: "9823456781",
      email: "priya.shah@example.com",
      fulfillment: "STORE_PICKUP",
      notes: "High gloss finish on thick cardstock",
    },
    pricing: {
      ratePerPage: 9,
      printCost: 450,
      paperSurcharge: 150,
      bindingCost: 0,
      laminationCost: 375,
      deliveryFee: 0,
      totalAmount: 975,
      currency: "INR",
    },
    isPrototype: true,
  },
  {
    id: "KX-PRNT-1026",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: "NEW",
    document: {
      name: "engineering-notes.docx",
      sizeBytes: 850 * 1024,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pageCount: 40,
    },
    config: {
      paperSize: "A4",
      colorMode: "BW",
      paperGsm: "75_GSM",
      sides: "DOUBLE",
      copies: 1,
      binding: "SPIRAL",
      lamination: "NONE",
    },
    customer: {
      name: "Rahul Mehta",
      phone: "9811223344",
      email: "rahul.m@example.com",
      fulfillment: "STORE_PICKUP",
      notes: "Front cover transparent sheet please",
    },
    pricing: {
      ratePerPage: 1.5,
      printCost: 60,
      paperSurcharge: 0,
      bindingCost: 35,
      laminationCost: 0,
      deliveryFee: 0,
      totalAmount: 95,
      currency: "INR",
    },
    isPrototype: true,
  },
];

export function getPrintOrders(): PrintOrder[] {
  if (typeof window === "undefined") return INITIAL_DEMO_ORDERS;
  try {
    const raw = localStorage.getItem(PRINT_ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PRINT_ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ORDERS));
      return INITIAL_DEMO_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_ORDERS;
  } catch (e) {
    console.warn("[PrintOrders] Failed to parse orders from localStorage:", e);
    return INITIAL_DEMO_ORDERS;
  }
}

export function savePrintOrder(order: PrintOrder): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getPrintOrders();
    const updated = [order, ...existing.filter((o) => o.id !== order.id)];
    localStorage.setItem(PRINT_ORDERS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("krishna-print-orders-updated", { detail: order }));
  } catch (e) {
    console.error("[PrintOrders] Failed to save order to localStorage:", e);
  }
}

export function updatePrintOrderStatus(orderId: string, nextStatus: OrderStatus): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getPrintOrders();
    const updated = existing.map((order) =>
      order.id === orderId ? { ...order, status: nextStatus } : order
    );
    localStorage.setItem(PRINT_ORDERS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("krishna-print-orders-updated", { detail: { orderId, nextStatus } }));
  } catch (e) {
    console.error("[PrintOrders] Failed to update order status:", e);
  }
}

export function deletePrintOrder(orderId: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getPrintOrders();
    const updated = existing.filter((order) => order.id !== orderId);
    localStorage.setItem(PRINT_ORDERS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("krishna-print-orders-updated", { detail: { orderId, deleted: true } }));
  } catch (e) {
    console.error("[PrintOrders] Failed to delete order:", e);
  }
}
