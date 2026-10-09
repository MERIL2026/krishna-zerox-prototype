import React, { useState, useId, useMemo } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Printer,
  Copy,
  Plus,
  Minus,
  Sparkles,
  ShieldAlert,
  Loader2,
  FileCheck,
  Check,
  Building2,
  Truck,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  type PaperSize,
  type ColorMode,
  type PaperGsm,
  type SidesMode,
  type BindingOption,
  type LaminationOption,
  type FulfillmentType,
  type PrintConfig,
  type CustomerDetails,
  type PrintOrder,
  validateFile,
  formatFileSize,
  calculatePrintPricing,
  savePrintOrder,
} from "@/data/printOrders";
import { useAuth } from "@/_core/hooks/useAuth";

interface SmartXeroxModalProps {
  onClose: () => void;
}

type Step = "UPLOAD" | "CUSTOMIZE" | "CONFIRM" | "SUCCESS";

export default function SmartXeroxModal({ onClose }: SmartXeroxModalProps) {
  const { user } = useAuth();
  const fileInputId = useId();

  // Wizard step state
  const [step, setStep] = useState<Step>("UPLOAD");

  // Step 1: Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);

  // Step 2: Customization state
  const [config, setConfig] = useState<PrintConfig>({
    paperSize: "A4",
    colorMode: "BW",
    paperGsm: "75_GSM",
    sides: "SINGLE",
    copies: 1,
    binding: "NONE",
    lamination: "NONE",
  });

  // Step 3: Customer details & fulfillment state
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: user?.name || "",
    phone: "",
    email: user?.email || "",
    fulfillment: "STORE_PICKUP",
    deliveryAddress: "",
    notes: "",
  });

  const [customerErrors, setCustomerErrors] = useState<{ name?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<PrintOrder | null>(null);
  const [showPricingDetails, setShowPricingDetails] = useState(false);

  // Live dynamic pricing
  const pricing = useMemo(() => {
    return calculatePrintPricing(pageCount, config, customer.fulfillment);
  }, [pageCount, config, customer.fulfillment]);

  // File selection & validation
  const handleFile = (file: File) => {
    setFileError(null);
    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.error || "Invalid file");
      setSelectedFile(null);
      toast.error("File Validation Error", { description: validation.error });
      return;
    }

    setSelectedFile(file);
    // Auto-detect page count defaults (images are 1 page)
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(file.name);
    if (isImage) {
      setPageCount(1);
    } else {
      // Default to 1 page if user hasn't touched it
      if (pageCount <= 1) setPageCount(1);
    }

    toast.success(`File selected: ${file.name}`, {
      description: `Size: ${formatFileSize(file.size)}`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Step 3 validation & submission
  const handleProceedToConfirm = () => {
    if (!selectedFile) {
      setFileError("Please select a file to continue");
      return;
    }
    if (pageCount < 1) {
      toast.error("Page count must be at least 1");
      return;
    }
    setStep("CONFIRM");
  };

  const handleConfirmOrder = () => {
    // Validate customer fields
    const errors: { name?: string; phone?: string } = {};
    if (!customer.name.trim() || customer.name.trim().length < 2) {
      errors.name = "Please enter customer full name (min 2 characters)";
    }
    const cleanPhone = customer.phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = "Please enter a valid 10-digit mobile number";
    }

    if (Object.keys(errors).length > 0) {
      setCustomerErrors(errors);
      toast.error("Missing Customer Details", {
        description: "Please provide a valid name and phone number for collection.",
      });
      return;
    }

    setCustomerErrors({});
    if (isSubmitting) return; // Prevent duplicate submission
    setIsSubmitting(true);

    try {
      const orderId = `KX-PRNT-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      const newOrder: PrintOrder = {
        id: orderId,
        createdAt: new Date().toISOString(),
        status: "NEW",
        document: {
          name: selectedFile?.name || "document.pdf",
          sizeBytes: selectedFile?.size || 1024,
          type: selectedFile?.type || "application/pdf",
          pageCount,
        },
        config,
        customer: {
          ...customer,
          phone: cleanPhone,
        },
        pricing,
        isPrototype: true,
      };

      savePrintOrder(newOrder);
      setCreatedOrder(newOrder);
      setStep("SUCCESS");

      toast.success("Print Order Queued Successfully!", {
        description: `Order Ref: ${orderId} · Total ₹${pricing.totalAmount}`,
      });
    } catch (e) {
      console.error("[SmartXerox] Order submission failed:", e);
      toast.error("Submission Failed", { description: "Could not persist order to local queue." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyOrderId = () => {
    if (!createdOrder) return;
    navigator.clipboard.writeText(createdOrder.id);
    toast.success("Order ID copied to clipboard", { description: createdOrder.id });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/70 backdrop-blur-xs overflow-y-auto" role="dialog" aria-modal="true" aria-label="Smart Xerox Print Studio">
      <motion.div
        className="w-full max-w-2xl bg-paper border-2 border-ink rounded-xl shadow-lg overflow-hidden my-auto text-ink flex flex-col max-h-[92vh]"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-ink bg-cream">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-cyan border border-ink flex items-center justify-center text-ink shadow-xs">
              <Printer size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg sm:text-xl font-headline tracking-tight leading-none text-ink">
                  Smart Xerox
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-yellow border border-ink">
                  Instant Counter
                </span>
              </div>
              <p className="text-xs text-muted font-body mt-0.5">
                Upload → Customize → Confirm · Krishna Xerox Counter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-ink bg-paper hover:bg-cream flex items-center justify-center text-ink transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Wizard Indicator */}
        <div className="grid grid-cols-4 border-b border-ink/20 bg-paper-soft text-xs font-bold divide-x divide-ink/10">
          <div className={`py-2 px-3 text-center flex items-center justify-center gap-1.5 ${step === "UPLOAD" ? "bg-cyan/30 text-ink" : "text-muted"}`}>
            <span className="w-4 h-4 rounded-full bg-ink text-paper text-[10px] flex items-center justify-center">1</span>
            <span className="hidden sm:inline">Upload</span>
          </div>
          <div className={`py-2 px-3 text-center flex items-center justify-center gap-1.5 ${step === "CUSTOMIZE" ? "bg-cyan/30 text-ink" : "text-muted"}`}>
            <span className="w-4 h-4 rounded-full bg-ink text-paper text-[10px] flex items-center justify-center">2</span>
            <span className="hidden sm:inline">Customize</span>
          </div>
          <div className={`py-2 px-3 text-center flex items-center justify-center gap-1.5 ${step === "CONFIRM" ? "bg-cyan/30 text-ink" : "text-muted"}`}>
            <span className="w-4 h-4 rounded-full bg-ink text-paper text-[10px] flex items-center justify-center">3</span>
            <span className="hidden sm:inline">Confirm</span>
          </div>
          <div className={`py-2 px-3 text-center flex items-center justify-center gap-1.5 ${step === "SUCCESS" ? "bg-success-bg text-success" : "text-muted"}`}>
            <span className="w-4 h-4 rounded-full bg-ink text-paper text-[10px] flex items-center justify-center">✓</span>
            <span className="hidden sm:inline">Queue</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: UPLOAD */}
          {step === "UPLOAD" && (
            <div className="space-y-4">
              <div className="text-left">
                <h3 className="font-extrabold text-base sm:text-lg">Step 1: Choose Your Document</h3>
                <p className="text-xs text-muted mt-0.5">
                  Select your PDF report, Word notes, or photo. We validate the file size and type before sending to print.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              {!selectedFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-blue bg-blue/10 scale-[1.01]"
                      : "border-ink/40 bg-paper hover:border-ink hover:bg-cream/40"
                  }`}
                  onClick={() => document.getElementById(fileInputId)?.click()}
                >
                  <input
                    id={fileInputId}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-cream border-2 border-ink flex items-center justify-center text-ink shadow-xs">
                    <UploadCloud size={28} />
                  </div>
                  <strong className="block text-sm sm:text-base font-bold text-ink">
                    Click to browse or drag & drop document
                  </strong>
                  <span className="block text-xs text-muted mt-1">
                    Supports <strong>PDF, DOCX, JPG, JPEG, PNG</strong> · Max 25 MB
                  </span>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-soft border border-ink/20 text-[11px] font-semibold text-muted">
                    <Sparkles size={12} className="text-blue" />
                    <span>Instant counter handover or express campus pickup</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border-2 border-ink bg-cream/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-lg bg-paper border border-ink flex items-center justify-center shrink-0 text-blue font-bold">
                        <FileText size={20} />
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-sm font-bold truncate text-ink">
                          {selectedFile.name}
                        </strong>
                        <span className="text-xs text-muted">
                          {formatFileSize(selectedFile.size)} · {selectedFile.type || "Document"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Accurate Page Count Input */}
                  <div className="pt-3 border-t border-ink/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper p-3 rounded-lg border border-ink/20">
                    <div>
                      <label htmlFor="doc-page-count" className="block text-xs font-bold text-ink">
                        Document Page Count
                      </label>
                      <span className="text-[11px] text-muted block leading-tight">
                        Enter total pages in this file (used for accurate price estimation)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => setPageCount(Math.max(1, pageCount - 1))}
                        className="w-8 h-8 rounded border border-ink bg-paper-soft hover:bg-cream flex items-center justify-center font-bold"
                        aria-label="Decrease pages"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        id="doc-page-count"
                        type="number"
                        min={1}
                        max={1000}
                        value={pageCount}
                        onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 h-8 text-center border border-ink rounded font-bold text-sm bg-paper"
                      />
                      <button
                        type="button"
                        onClick={() => setPageCount(pageCount + 1)}
                        className="w-8 h-8 rounded border border-ink bg-paper-soft hover:bg-cream flex items-center justify-center font-bold"
                        aria-label="Increase pages"
                      >
                        <Plus size={14} />
                      </button>
                      <span className="text-xs font-semibold text-muted ml-1">pages</span>
                    </div>
                  </div>
                </div>
              )}

              {fileError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CUSTOMIZE */}
          {step === "CUSTOMIZE" && (
            <div className="space-y-5 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">Step 2: Print Settings</h3>
                  <p className="text-xs text-muted">
                    {selectedFile?.name} ({pageCount} {pageCount === 1 ? "page" : "pages"})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Estimated Total</span>
                  <strong className="text-lg font-black text-ink font-headline">₹{pricing.totalAmount}</strong>
                </div>
              </div>

              {/* Color Mode */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  1. Print Colour Mode
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, colorMode: "BW" })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      config.colorMode === "BW"
                        ? "border-ink bg-paper shadow-xs font-bold"
                        : "border-ink/20 bg-paper-soft text-muted hover:border-ink/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-ink">Black &amp; White</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-paper-soft border border-ink/20 text-ink font-semibold">
                        ₹{config.sides === "DOUBLE" ? "1.50" : "2.00"}/pg
                      </span>
                    </div>
                    <span className="text-[11px] text-muted block mt-0.5">High-speed sharp mono laser Xerox</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, colorMode: "COLOR" })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      config.colorMode === "COLOR"
                        ? "border-ink bg-paper shadow-xs font-bold"
                        : "border-ink/20 bg-paper-soft text-muted hover:border-ink/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-ink flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink to-cyan" />
                        Full Colour
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow border border-ink text-ink font-semibold">
                        ₹{config.sides === "DOUBLE" ? "9.00" : "10.00"}/pg
                      </span>
                    </div>
                    <span className="text-[11px] text-muted block mt-0.5">Rich CMYK digital color printing</span>
                  </button>
                </div>
              </div>

              {/* Paper Size & Sides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Paper Size */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    2. Paper Size
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["A4", "A3", "Legal", "Letter"] as PaperSize[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setConfig({ ...config, paperSize: size })}
                        className={`py-2 px-1 text-center rounded-md border text-xs font-bold transition-all ${
                          config.paperSize === size
                            ? "border-ink bg-cyan text-ink shadow-xs"
                            : "border-ink/20 bg-paper text-muted hover:border-ink/60"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sides */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    3. Sides (Duplex)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, sides: "SINGLE" })}
                      className={`py-2 px-2 text-center rounded-md border text-xs font-bold transition-all ${
                        config.sides === "SINGLE"
                          ? "border-ink bg-yellow text-ink shadow-xs"
                          : "border-ink/20 bg-paper text-muted hover:border-ink/60"
                      }`}
                    >
                      Single-sided
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, sides: "DOUBLE" })}
                      className={`py-2 px-2 text-center rounded-md border text-xs font-bold transition-all ${
                        config.sides === "DOUBLE"
                          ? "border-ink bg-yellow text-ink shadow-xs"
                          : "border-ink/20 bg-paper text-muted hover:border-ink/60"
                      }`}
                    >
                      Double-sided (Back to back)
                    </button>
                  </div>
                </div>
              </div>

              {/* Paper GSM & Finishing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* GSM */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    4. Paper Quality (GSM)
                  </label>
                  <select
                    value={config.paperGsm}
                    onChange={(e) => setConfig({ ...config, paperGsm: e.target.value as PaperGsm })}
                    className="w-full p-2.5 rounded-lg border border-ink text-xs font-bold bg-paper text-ink"
                  >
                    <option value="75_GSM">Standard 75 GSM (Everyday Xerox)</option>
                    <option value="100_GSM">Executive 100 GSM (+₹1.50/sheet)</option>
                    <option value="220_GSM">Cardstock 220 GSM (+₹6.00/sheet)</option>
                  </select>
                </div>

                {/* Binding */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    5. Binding Options
                  </label>
                  <select
                    value={config.binding}
                    onChange={(e) => setConfig({ ...config, binding: e.target.value as BindingOption })}
                    className="w-full p-2.5 rounded-lg border border-ink text-xs font-bold bg-paper text-ink"
                  >
                    <option value="NONE">None (Loose sheets)</option>
                    <option value="STAPLE">Corner Stapling (+₹5/copy)</option>
                    <option value="SPIRAL">Spiral / Comb Binding (+₹35/copy)</option>
                    <option value="HARD_BOUND">Hard Book Stitch Binding (+₹95/copy)</option>
                  </select>
                </div>
              </div>

              {/* Lamination & Copies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lamination */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    6. Lamination
                  </label>
                  <select
                    value={config.lamination}
                    onChange={(e) => setConfig({ ...config, lamination: e.target.value as LaminationOption })}
                    className="w-full p-2.5 rounded-lg border border-ink text-xs font-bold bg-paper text-ink"
                  >
                    <option value="NONE">No Lamination</option>
                    <option value="GLOSS">Gloss Lamination (+₹15/sheet)</option>
                    <option value="MATTE">Matte Satin Lamination (+₹20/sheet)</option>
                  </select>
                </div>

                {/* Copies Stepper */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    7. Number of Copies
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, copies: Math.max(1, config.copies - 1) })}
                      className="w-9 h-9 rounded-md border border-ink bg-paper-soft hover:bg-cream flex items-center justify-center font-bold"
                      aria-label="Decrease copies"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={config.copies}
                      onChange={(e) => setConfig({ ...config, copies: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 h-9 text-center border border-ink rounded-md font-bold text-sm bg-paper"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, copies: config.copies + 1 })}
                      className="w-9 h-9 rounded-md border border-ink bg-paper-soft hover:bg-cream flex items-center justify-center font-bold"
                      aria-label="Increase copies"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-xs font-bold text-muted ml-1">
                      {config.copies === 1 ? "set" : "sets"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown Toggle */}
              <div className="p-3.5 rounded-xl border border-ink/20 bg-cream/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Sparkles size={14} className="text-blue" />
                    <span>Live Estimate Breakdown</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPricingDetails(!showPricingDetails)}
                    className="text-xs text-blue underline font-bold"
                  >
                    {showPricingDetails ? "Hide breakdown" : "View formula"}
                  </button>
                </div>

                {showPricingDetails && (
                  <div className="pt-2 border-t border-ink/10 text-xs text-muted space-y-1">
                    <div className="flex justify-between">
                      <span>Base Print ({pageCount} pgs × {config.copies} copies @ ₹{pricing.ratePerPage}/pg):</span>
                      <strong className="text-ink">₹{pricing.printCost}</strong>
                    </div>
                    {pricing.paperSurcharge > 0 && (
                      <div className="flex justify-between">
                        <span>Paper Stock Surcharge ({config.paperGsm.replace("_", " ")}):</span>
                        <strong className="text-ink">₹{pricing.paperSurcharge}</strong>
                      </div>
                    )}
                    {pricing.bindingCost > 0 && (
                      <div className="flex justify-between">
                        <span>Binding ({config.binding.replace("_", " ")}):</span>
                        <strong className="text-ink">₹{pricing.bindingCost}</strong>
                      </div>
                    )}
                    {pricing.laminationCost > 0 && (
                      <div className="flex justify-between">
                        <span>Lamination ({config.lamination}):</span>
                        <strong className="text-ink">₹{pricing.laminationCost}</strong>
                      </div>
                    )}
                    <div className="text-[11px] text-muted-light pt-1 italic">
                      * Transparent prototype demo pricing in INR. All rates configured dynamically.
                    </div>
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs font-bold text-ink">Total Estimated Amount:</span>
                  <span className="text-xl font-black text-ink font-headline">₹{pricing.totalAmount}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & CUSTOMER DETAILS */}
          {step === "CONFIRM" && (
            <div className="space-y-5 text-left">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">Step 3: Review &amp; Customer Details</h3>
                <p className="text-xs text-muted">
                  Verify your print configuration and provide contact details for order handover.
                </p>
              </div>

              {/* Order Specs Recap Card */}
              <div className="p-4 rounded-xl border-2 border-ink bg-cream/40 space-y-2.5 text-xs">
                <div className="flex justify-between items-start pb-2 border-b border-ink/15">
                  <div>
                    <strong className="block text-sm font-bold text-ink">{selectedFile?.name}</strong>
                    <span className="text-muted">
                      {pageCount} {pageCount === 1 ? "page" : "pages"} · {config.copies} {config.copies === 1 ? "copy" : "copies"}
                    </span>
                  </div>
                  <span className="text-base font-black text-ink font-headline">₹{pricing.totalAmount}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-ink">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Colour Mode</span>
                    <strong>{config.colorMode === "COLOR" ? "Full Colour" : "Black & White"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Paper &amp; Sides</span>
                    <strong>{config.paperSize} · {config.sides === "DOUBLE" ? "2-Sided" : "1-Sided"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Paper Stock</span>
                    <strong>{config.paperGsm.replace("_", " ")}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Binding</span>
                    <strong>{config.binding === "NONE" ? "None" : config.binding.replace("_", " ")}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Lamination</span>
                    <strong>{config.lamination === "NONE" ? "None" : config.lamination}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Total Sheets</span>
                    <strong>{config.sides === "DOUBLE" ? Math.ceil(pageCount / 2) * config.copies : pageCount * config.copies} sheets</strong>
                  </div>
                </div>
              </div>

              {/* Customer Contact Details Form */}
              <div className="space-y-3.5 bg-paper p-4 rounded-xl border border-ink/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Customer &amp; Counter Collection Info
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="e.g. Meril Patel"
                      className={`w-full p-2.5 rounded-lg border text-xs font-bold bg-paper text-ink ${
                        customerErrors.name ? "border-red-500 bg-red-50" : "border-ink"
                      }`}
                      required
                    />
                    {customerErrors.name && (
                      <span className="text-[11px] text-red-600 block mt-0.5">{customerErrors.name}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="e.g. 9876543210 (10 digits)"
                      maxLength={14}
                      className={`w-full p-2.5 rounded-lg border text-xs font-bold bg-paper text-ink ${
                        customerErrors.phone ? "border-red-500 bg-red-50" : "border-ink"
                      }`}
                      required
                    />
                    {customerErrors.phone && (
                      <span className="text-[11px] text-red-600 block mt-0.5">{customerErrors.phone}</span>
                    )}
                  </div>
                </div>

                {/* Fulfillment Picker */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Fulfillment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomer({ ...customer, fulfillment: "STORE_PICKUP" })}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        customer.fulfillment === "STORE_PICKUP"
                          ? "border-ink bg-cyan font-bold text-ink shadow-xs"
                          : "border-ink/20 bg-paper-soft text-muted hover:border-ink/60"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-bold text-ink">
                        <Building2 size={14} /> Store Counter Pickup
                      </span>
                      <span className="text-[10px] text-muted block mt-0.5">Shop No. 4, College Road · Free</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomer({ ...customer, fulfillment: "LOCAL_DELIVERY" })}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        customer.fulfillment === "LOCAL_DELIVERY"
                          ? "border-ink bg-cyan font-bold text-ink shadow-xs"
                          : "border-ink/20 bg-paper-soft text-muted hover:border-ink/60"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-bold text-ink">
                        <Truck size={14} /> Campus Delivery
                      </span>
                      <span className="text-[10px] text-muted block mt-0.5">Hostels &amp; College Campus (+₹40)</span>
                    </button>
                  </div>
                </div>

                {/* Special Operator Notes */}
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Notes for Printer Operator <span className="text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={customer.notes}
                    onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                    placeholder="e.g. Urgent for 3 PM exam, print back cover in blue"
                    className="w-full p-2.5 rounded-lg border border-ink text-xs bg-paper text-ink"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS RECEIPT */}
          {step === "SUCCESS" && createdOrder && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-success-bg border-2 border-ink mx-auto flex items-center justify-center text-success shadow-xs">
                <Check size={28} />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-yellow border border-ink text-xs font-black tracking-wide text-ink mb-1">
                  ORDER PLACED · QUEUED AT PRINTER 01
                </span>
                <h3 className="font-extrabold text-xl font-headline tracking-tight">
                  Order #{createdOrder.id}
                </h3>
                <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                  Your print job is queued for production. Handover ready in approx. 15–25 minutes.
                </p>
              </div>

              {/* Neo-Memphis Ticket Receipt */}
              <div className="p-4 rounded-xl border-2 border-ink bg-cream text-left text-xs max-w-md mx-auto space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-ink/15">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Order Reference</span>
                    <strong className="text-sm font-black text-ink">{createdOrder.id}</strong>
                  </div>
                  <button
                    onClick={copyOrderId}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue hover:underline bg-paper px-2 py-1 rounded border border-ink/20"
                  >
                    <Copy size={12} /> Copy Ref
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-ink">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Document</span>
                    <span className="font-bold truncate block">{createdOrder.document.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Pages &amp; Sets</span>
                    <span className="font-bold">{createdOrder.document.pageCount} pgs × {createdOrder.config.copies} sets</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Customer</span>
                    <span className="font-bold">{createdOrder.customer.name} ({createdOrder.customer.phone})</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Estimated Amount</span>
                    <span className="font-bold text-sm text-ink">₹{createdOrder.pricing.totalAmount}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-ink/15 text-[11px] text-muted flex items-center justify-between">
                  <span>Fulfillment: <strong>{createdOrder.customer.fulfillment === "STORE_PICKUP" ? "Counter Pickup" : "Campus Delivery"}</strong></span>
                  <span className="text-emerald-700 font-bold">Status: NEW</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
                <a
                  href="/admin"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-ink bg-cyan hover:bg-cyan/80 text-ink font-bold text-xs shadow-xs transition-transform active:translate-y-0.5"
                >
                  <ExternalLink size={14} /> Open Operations Queue in Admin
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-ink bg-paper hover:bg-cream text-ink font-bold text-xs transition-colors"
                >
                  Done / Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {step !== "SUCCESS" && (
          <div className="px-5 py-3.5 border-t-2 border-ink bg-paper-soft flex items-center justify-between">
            {step === "UPLOAD" ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-ink text-xs font-bold text-muted hover:text-ink hover:bg-paper"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step === "CONFIRM" ? "CUSTOMIZE" : "UPLOAD")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-ink text-xs font-bold text-ink hover:bg-paper"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {step === "UPLOAD" && (
              <button
                type="button"
                onClick={() => {
                  if (!selectedFile) {
                    setFileError("Please select a file to continue");
                    return;
                  }
                  setStep("CUSTOMIZE");
                }}
                disabled={!selectedFile}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border-2 border-ink bg-ink text-paper font-bold text-xs shadow-xs hover:bg-ink-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
              >
                Customize Print <ArrowRight size={14} />
              </button>
            )}

            {step === "CUSTOMIZE" && (
              <button
                type="button"
                onClick={handleProceedToConfirm}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border-2 border-ink bg-ink text-paper font-bold text-xs shadow-xs hover:bg-ink-secondary transition-all active:translate-y-0.5"
              >
                Review &amp; Confirm (₹{pricing.totalAmount}) <ArrowRight size={14} />
              </button>
            )}

            {step === "CONFIRM" && (
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg border-2 border-ink bg-lime text-ink font-black text-xs shadow-sm hover:brightness-105 disabled:opacity-50 transition-all active:translate-y-0.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Queuing Order…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Confirm &amp; Send to Printer (₹{pricing.totalAmount})
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
