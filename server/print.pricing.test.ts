import { describe, it, expect } from "vitest";
import {
  calculatePrintPricing,
  validateFile,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  INITIAL_DEMO_ORDERS,
  type PrintConfig,
} from "../client/src/data/printOrders";

describe("Phase 2 — Smart Xerox Pricing Engine", () => {
  const defaultConfig: PrintConfig = {
    paperSize: "A4",
    colorMode: "BW",
    paperGsm: "75_GSM",
    sides: "SINGLE",
    copies: 1,
    binding: "NONE",
    lamination: "NONE",
  };

  it("calculates standard A4 B&W single-sided base print correctly", () => {
    // 10 pages, 1 copy = 10 * 2.0 = ₹20
    const pricing = calculatePrintPricing(10, defaultConfig, "STORE_PICKUP");
    expect(pricing.ratePerPage).toBe(2.0);
    expect(pricing.printCost).toBe(20);
    expect(pricing.paperSurcharge).toBe(0);
    expect(pricing.bindingCost).toBe(0);
    expect(pricing.laminationCost).toBe(0);
    expect(pricing.deliveryFee).toBe(0);
    expect(pricing.totalAmount).toBe(20);
    expect(pricing.currency).toBe("INR");
  });

  it("applies discounted duplex rate for B&W double-sided printing", () => {
    // 10 pages, double-sided: rate 1.5/page = 10 * 1.5 = ₹15
    const config: PrintConfig = { ...defaultConfig, sides: "DOUBLE" };
    const pricing = calculatePrintPricing(10, config, "STORE_PICKUP");
    expect(pricing.ratePerPage).toBe(1.5);
    expect(pricing.printCost).toBe(15);
    expect(pricing.totalAmount).toBe(15);
  });

  it("calculates full colour single-sided printing", () => {
    // 5 pages, colour single: rate 10.0/page = 5 * 10 = ₹50
    const config: PrintConfig = { ...defaultConfig, colorMode: "COLOR" };
    const pricing = calculatePrintPricing(5, config, "STORE_PICKUP");
    expect(pricing.ratePerPage).toBe(10.0);
    expect(pricing.printCost).toBe(50);
    expect(pricing.totalAmount).toBe(50);
  });

  it("calculates full colour duplex printing with sheet-saving factor", () => {
    // 6 pages, colour duplex: rate 9.0/page = 6 * 9 = ₹54
    const config: PrintConfig = { ...defaultConfig, colorMode: "COLOR", sides: "DOUBLE" };
    const pricing = calculatePrintPricing(6, config, "STORE_PICKUP");
    expect(pricing.ratePerPage).toBe(9.0);
    expect(pricing.printCost).toBe(54);
    expect(pricing.totalAmount).toBe(54);
  });

  it("applies A3 size surcharge correctly", () => {
    // A3 BW: base 2.0 + 4.0 = 6.0/page. 10 pages = ₹60
    const config: PrintConfig = { ...defaultConfig, paperSize: "A3" };
    const pricing = calculatePrintPricing(10, config, "STORE_PICKUP");
    expect(pricing.ratePerPage).toBe(6.0);
    expect(pricing.printCost).toBe(60);
  });

  it("applies Legal paper size surcharge correctly", () => {
    // Legal BW: base 2.0 + 1.0 = 3.0/page. 10 pages = ₹30
    const config: PrintConfig = { ...defaultConfig, paperSize: "Legal" };
    const pricing = calculatePrintPricing(10, config, "STORE_PICKUP");
    expect(pricing.ratePerPage).toBe(3.0);
    expect(pricing.printCost).toBe(30);
  });

  it("calculates heavy cardstock (220 GSM) paper surcharge", () => {
    // 10 pages single-sided = 10 sheets * ₹6.0 surcharge = ₹60 surcharge
    const config: PrintConfig = { ...defaultConfig, paperGsm: "220_GSM" };
    const pricing = calculatePrintPricing(10, config, "STORE_PICKUP");
    expect(pricing.paperSurcharge).toBe(60);
    // Print cost (20) + Surcharge (60) = ₹80
    expect(pricing.totalAmount).toBe(80);
  });

  it("calculates spiral binding and gloss lamination add-ons", () => {
    // 10 pages, single-sided, 1 copy
    // Print: ₹20
    // Spiral binding: ₹35
    // Gloss lamination: 10 sheets * ₹15 = ₹150
    // Total: 20 + 35 + 150 = ₹205
    const config: PrintConfig = {
      ...defaultConfig,
      binding: "SPIRAL",
      lamination: "GLOSS",
    };
    const pricing = calculatePrintPricing(10, config, "STORE_PICKUP");
    expect(pricing.printCost).toBe(20);
    expect(pricing.bindingCost).toBe(35);
    expect(pricing.laminationCost).toBe(150);
    expect(pricing.totalAmount).toBe(205);
  });

  it("adds ₹40 local delivery fee for LOCAL_DELIVERY fulfillment", () => {
    const pricing = calculatePrintPricing(5, defaultConfig, "LOCAL_DELIVERY");
    expect(pricing.deliveryFee).toBe(40);
    // 5 * 2 = 10 + 40 = 50
    expect(pricing.totalAmount).toBe(50);
  });

  it("scales costs cleanly with copy counts", () => {
    // 10 pages, 3 copies = 30 pages total
    // Print: 30 * 2 = ₹60
    // Staple: 3 * ₹5 = ₹15
    // Total = ₹75
    const config: PrintConfig = { ...defaultConfig, copies: 3, binding: "STAPLE" };
    const pricing = calculatePrintPricing(10, config, "STORE_PICKUP");
    expect(pricing.printCost).toBe(60);
    expect(pricing.bindingCost).toBe(15);
    expect(pricing.totalAmount).toBe(75);
  });

  it("enforces minimum prototype order fee of ₹5", () => {
    // 1 page, double sided (1 * 1.5 = 1.5) -> min capped at ₹5
    const config: PrintConfig = { ...defaultConfig, sides: "DOUBLE" };
    const pricing = calculatePrintPricing(1, config, "STORE_PICKUP");
    expect(pricing.totalAmount).toBeGreaterThanOrEqual(5);
  });
});

describe("Phase 2 — Smart Xerox File & Input Validation", () => {
  // Helper to create mock File in Node test environment
  function createMockFile(name: string, sizeBytes: number, type: string): File {
    const buffer = new Uint8Array(sizeBytes > 0 ? 1 : 0);
    const file = new File([buffer], name, { type });
    Object.defineProperty(file, "size", { value: sizeBytes });
    return file;
  }

  it("accepts valid PDF file under 25MB", () => {
    const file = createMockFile("syllabus.pdf", 2 * 1024 * 1024, "application/pdf");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts valid DOCX file", () => {
    const file = createMockFile(
      "assignment.docx",
      500 * 1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    const result = validateFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts JPG and PNG image files", () => {
    const jpg = createMockFile("poster.jpg", 3 * 1024 * 1024, "image/jpeg");
    const png = createMockFile("diagram.png", 1.5 * 1024 * 1024, "image/png");
    expect(validateFile(jpg).valid).toBe(true);
    expect(validateFile(png).valid).toBe(true);
  });

  it("rejects unsupported executable and archive files", () => {
    const exe = createMockFile("malware.exe", 1024, "application/x-msdownload");
    const zip = createMockFile("archive.zip", 2048, "application/zip");
    expect(validateFile(exe).valid).toBe(false);
    expect(validateFile(exe).error).toContain("Unsupported file format");
    expect(validateFile(zip).valid).toBe(false);
  });

  it("rejects files exceeding 25MB limit", () => {
    const oversized = createMockFile("heavy_video.pdf", 26 * 1024 * 1024, "application/pdf");
    const result = validateFile(oversized);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds the 25MB limit");
  });

  it("rejects empty 0-byte files", () => {
    const emptyFile = createMockFile("empty.pdf", 0, "application/pdf");
    const result = validateFile(emptyFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("is empty (0 bytes)");
  });

  it("verifies allowed extensions and mime lists are exhaustive", () => {
    expect(ALLOWED_EXTENSIONS).toContain(".pdf");
    expect(ALLOWED_EXTENSIONS).toContain(".docx");
    expect(ALLOWED_EXTENSIONS).toContain(".doc");
    expect(ALLOWED_EXTENSIONS).toContain(".jpg");
    expect(ALLOWED_EXTENSIONS).toContain(".jpeg");
    expect(ALLOWED_EXTENSIONS).toContain(".png");
    expect(MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024);
  });
});

describe("Phase 2 — Initial Demo Orders Integrity", () => {
  it("includes pre-seeded demo orders with valid configurations", () => {
    expect(INITIAL_DEMO_ORDERS.length).toBeGreaterThanOrEqual(3);
    for (const order of INITIAL_DEMO_ORDERS) {
      expect(order.id).toMatch(/^KX-PRNT-\d+$/);
      expect(order.isPrototype).toBe(true);
      expect(["NEW", "ACCEPTED", "IN_PROGRESS", "READY", "COMPLETED"]).toContain(order.status);
      expect(order.document.name).toBeTruthy();
      expect(order.document.pageCount).toBeGreaterThanOrEqual(1);
      expect(order.pricing.totalAmount).toBeGreaterThanOrEqual(5);
      expect(order.customer.name).toBeTruthy();
      expect(order.customer.phone).toBeTruthy();
    }
  });
});
