import React, { useState, useId, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2,
  Check,
  Building2,
  Truck,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
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

type StepNumber = 1 | 2 | 3;

export default function SmartXeroxModal({ onClose }: SmartXeroxModalProps) {
  const { user } = useAuth();
  const fileInputId = useId();

  // Three primary steps (1 = Upload Document, 2 = Choose Print Settings, 3 = Review & Confirm)
  // Step 4 is the Success Receipt
  const [currentStep, setCurrentStep] = useState<StepNumber | 4>(1);

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

  // Discard confirmation state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Has user touched or modified anything?
  const hasModifications = useMemo(() => {
    return Boolean(
      selectedFile !== null ||
      customer.name.trim().length > 0 ||
      customer.phone.trim().length > 0 ||
      currentStep > 1
    );
  }, [selectedFile, customer, currentStep]);

  // Lock background scroll and listen for Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleAttemptClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasModifications, currentStep]);

  // Close handler with discard check
  const handleAttemptClose = () => {
    if (currentStep === 4) {
      onClose();
      return;
    }
    if (hasModifications) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

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
    } else if (pageCount <= 1) {
      setPageCount(1);
    }

    toast.success(`Document Selected: ${file.name}`, {
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

  // Step transitions
  const handleContinueToSettings = () => {
    if (!selectedFile) {
      setFileError("Please select a file to continue");
      return;
    }
    setFileError(null);
    setCurrentStep(2);
  };

  const handleContinueToReview = () => {
    setCurrentStep(3);
  };

  // Final confirmation
  const handleConfirmOrder = () => {
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
        description: "Please provide a valid name and 10-digit mobile number.",
      });
      return;
    }

    setCustomerErrors({});
    if (isSubmitting) return;
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
      setCurrentStep(4); // Success screen

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
    toast.success("Order Reference copied to clipboard", { description: createdOrder.id });
  };

  const handleResetForNewOrder = () => {
    setSelectedFile(null);
    setFileError(null);
    setPageCount(1);
    setCreatedOrder(null);
    setCurrentStep(1);
  };

  return (
    <div
      className="sx-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Smart Xerox Print Studio"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleAttemptClose();
        }
      }}
    >
      <motion.div
        className="sx-modal"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="sx-header">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-yellow border-2 border-ink flex items-center justify-center text-ink shadow-xs">
              <Printer size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg sm:text-xl font-headline tracking-tight leading-none text-ink">
                  Smart Xerox Studio
                </h2>
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-cyan border border-ink text-ink">
                  Instant Counter
                </span>
              </div>
              <p className="text-xs text-muted font-body mt-0.5">
                Upload Document → Choose Settings → Review &amp; Confirm
              </p>
            </div>
          </div>
          <button
            onClick={handleAttemptClose}
            className="w-8 h-8 rounded-full border-2 border-ink bg-paper hover:bg-cream flex items-center justify-center text-ink transition-colors cursor-pointer"
            aria-label="Close dialog"
            title="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* THREE PRIMARY STEPS PROGRESS INDICATOR (Queue removed) */}
        {currentStep !== 4 && (
          <div className="sx-steps-bar" role="navigation" aria-label="Order steps">
            {/* Step 1: Upload Document */}
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) setCurrentStep(1);
              }}
              className={`sx-step-item ${currentStep === 1 ? "active" : currentStep > 1 ? "completed" : "upcoming"}`}
              aria-current={currentStep === 1 ? "step" : undefined}
            >
              <span className={`w-5 h-5 rounded-full border border-ink text-[11px] flex items-center justify-center font-bold ${
                currentStep > 1 ? "bg-emerald-600 text-white border-emerald-700" : currentStep === 1 ? "bg-ink text-paper" : "bg-paper text-muted"
              }`}>
                {currentStep > 1 ? "✓" : "1"}
              </span>
              <span>1. Upload Document</span>
              <span className="text-[10px] opacity-75 font-normal hidden sm:inline">
                {currentStep === 1 ? "(Current)" : currentStep > 1 ? "(Done)" : ""}
              </span>
            </button>

            {/* Step 2: Choose Print Settings */}
            <button
              type="button"
              onClick={() => {
                if (selectedFile && currentStep > 2) setCurrentStep(2);
                else if (selectedFile && currentStep === 1) handleContinueToSettings();
              }}
              disabled={!selectedFile}
              className={`sx-step-item ${currentStep === 2 ? "active" : currentStep > 2 ? "completed" : "upcoming"}`}
              aria-current={currentStep === 2 ? "step" : undefined}
            >
              <span className={`w-5 h-5 rounded-full border border-ink text-[11px] flex items-center justify-center font-bold ${
                currentStep > 2 ? "bg-emerald-600 text-white border-emerald-700" : currentStep === 2 ? "bg-ink text-paper" : "bg-paper text-muted"
              }`}>
                {currentStep > 2 ? "✓" : "2"}
              </span>
              <span>2. Choose Print Settings</span>
              <span className="text-[10px] opacity-75 font-normal hidden sm:inline">
                {currentStep === 2 ? "(Current)" : currentStep > 2 ? "(Done)" : ""}
              </span>
            </button>

            {/* Step 3: Review & Confirm */}
            <button
              type="button"
              onClick={() => {
                if (selectedFile && currentStep < 3) handleContinueToReview();
              }}
              disabled={!selectedFile || currentStep === 1}
              className={`sx-step-item ${currentStep === 3 ? "active" : "upcoming"}`}
              aria-current={currentStep === 3 ? "step" : undefined}
            >
              <span className={`w-5 h-5 rounded-full border border-ink text-[11px] flex items-center justify-center font-bold ${
                currentStep === 3 ? "bg-ink text-paper" : "bg-paper text-muted"
              }`}>
                3
              </span>
              <span>3. Review &amp; Confirm</span>
              <span className="text-[10px] opacity-75 font-normal hidden sm:inline">
                {currentStep === 3 ? "(Current)" : ""}
              </span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="sx-body">
          {/* STEP 1: UPLOAD DOCUMENT */}
          {currentStep === 1 && (
            <div className="space-y-5 text-left">
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl text-ink tracking-tight">
                  Print Your Documents in 3 Easy Steps
                </h3>
                <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                  Choose a document to print. Next, select your print settings and review your estimated total.
                </p>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`p-6 sm:p-8 rounded-xl border-2 text-center transition-all ${
                  isDragging
                    ? "border-blue bg-blue/10 scale-[1.01]"
                    : selectedFile
                    ? "border-ink bg-cream/30"
                    : "border-dashed border-ink bg-[#fffdf9] hover:bg-cream/40"
                }`}
              >
                <input
                  id={fileInputId}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                {!selectedFile ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-cream border-2 border-ink flex items-center justify-center text-ink shadow-xs">
                      <UploadCloud size={28} />
                    </div>
                    <div>
                      <strong className="block text-base font-bold text-ink">
                        Drag and drop your document here
                      </strong>
                      <span className="block text-xs text-muted mt-1">
                        or click the button below to browse from your device
                      </span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById(fileInputId)?.click()}
                        className="button button-dark text-xs px-5 py-2.5 rounded-lg shadow-xs font-bold cursor-pointer inline-flex items-center gap-2"
                      >
                        <FileText size={15} /> Browse Files
                      </button>
                    </div>

                    <div className="pt-3 border-t border-ink/15 text-[11px] text-muted flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                      <span>Supported formats: <strong>PDF, DOCX, JPG, JPEG, PNG</strong></span>
                      <span className="hidden sm:inline">·</span>
                      <span>Maximum size: <strong>25 MB</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border-2 border-ink bg-white flex items-start justify-between gap-3 text-left shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-lg bg-cyan border border-ink flex items-center justify-center shrink-0 text-ink font-bold">
                          <FileText size={22} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-bold truncate text-ink block">
                              {selectedFile.name}
                            </strong>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Valid document
                            </span>
                          </div>
                          <span className="text-xs text-muted block mt-0.5">
                            {formatFileSize(selectedFile.size)} · {selectedFile.type || "Document file"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => document.getElementById(fileInputId)?.click()}
                          className="px-2.5 py-1 text-xs font-bold rounded border border-ink bg-paper hover:bg-cream text-ink cursor-pointer"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setFileError(null);
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Page Count Stepper */}
                    <div className="p-3.5 rounded-xl border border-ink bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                      <div>
                        <label htmlFor="doc-page-count" className="block text-xs font-bold text-ink">
                          Document Page Count
                        </label>
                        <span className="text-[11px] text-muted block leading-tight">
                          Specify the page count to calculate accurate print pricing.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => setPageCount(Math.max(1, pageCount - 1))}
                          className="w-8 h-8 rounded border border-ink bg-paper-soft hover:bg-cream flex items-center justify-center font-bold cursor-pointer"
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
                          className="w-16 h-8 text-center border border-ink rounded font-bold text-sm bg-paper text-ink"
                        />
                        <button
                          type="button"
                          onClick={() => setPageCount(pageCount + 1)}
                          className="w-8 h-8 rounded border border-ink bg-paper-soft hover:bg-cream flex items-center justify-center font-bold cursor-pointer"
                          aria-label="Increase pages"
                        >
                          <Plus size={14} />
                        </button>
                        <span className="text-xs font-bold text-muted ml-1">pages</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Validation error message */}
              {fileError && (
                <div className="p-3.5 rounded-lg bg-red-50 border-2 border-red-300 text-red-800 text-xs flex items-center gap-2.5">
                  <AlertCircle size={18} className="shrink-0 text-red-600" />
                  <div>
                    <strong>Upload Error: </strong>
                    <span>{fileError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHOOSE PRINT SETTINGS */}
          {currentStep === 2 && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-ink/15 pb-2.5">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-ink">
                    Step 2: Choose Print Settings
                  </h3>
                  <p className="text-xs text-muted">
                    {selectedFile?.name} · {pageCount} {pageCount === 1 ? "page" : "pages"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Estimated Total</span>
                  <strong className="text-xl font-black text-ink font-headline">₹{pricing.totalAmount}</strong>
                </div>
              </div>

              {/* Group 1: Paper & Color */}
              <div className="sx-panel">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Paper &amp; Colour Mode
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Paper Size
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["A4", "A3", "Legal", "Letter"] as PaperSize[]).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setConfig({ ...config, paperSize: size })}
                          className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            config.paperSize === size
                              ? "border-ink bg-cyan text-ink shadow-xs"
                              : "border-ink/20 bg-white text-muted hover:border-ink/60"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Colour Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, colorMode: "BW" })}
                        className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                          config.colorMode === "BW"
                            ? "border-ink bg-white shadow-xs font-bold"
                            : "border-ink/20 bg-paper-soft text-muted hover:border-ink/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-ink">Black &amp; White</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-cream border border-ink/20 text-ink font-semibold">
                            ₹{config.sides === "DOUBLE" ? "1.50" : "2.00"}/pg
                          </span>
                        </div>
                        <span className="text-[11px] text-muted block mt-0.5">High-speed sharp mono laser Xerox</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, colorMode: "COLOR" })}
                        className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                          config.colorMode === "COLOR"
                            ? "border-ink bg-white shadow-xs font-bold"
                            : "border-ink/20 bg-paper-soft text-muted hover:border-ink/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-ink flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500" />
                            Full Colour
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow border border-ink text-ink font-semibold">
                            ₹{config.sides === "DOUBLE" ? "9.00" : "10.00"}/pg
                          </span>
                        </div>
                        <span className="text-[11px] text-muted block mt-0.5">Rich digital color printing</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Layout & Paper GSM */}
              <div className="sx-panel">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Layout &amp; Paper Weight
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Sides
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, sides: "SINGLE" })}
                        className={`py-2 px-2 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          config.sides === "SINGLE"
                            ? "border-ink bg-yellow text-ink shadow-xs"
                            : "border-ink/20 bg-white text-muted hover:border-ink/60"
                        }`}
                      >
                        Single-sided
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, sides: "DOUBLE" })}
                        className={`py-2 px-2 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          config.sides === "DOUBLE"
                            ? "border-ink bg-yellow text-ink shadow-xs"
                            : "border-ink/20 bg-white text-muted hover:border-ink/60"
                        }`}
                      >
                        Double-sided (Duplex)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Paper Weight (GSM)
                    </label>
                    <select
                      value={config.paperGsm}
                      onChange={(e) => setConfig({ ...config, paperGsm: e.target.value as PaperGsm })}
                      className="w-full p-2 rounded-lg border border-ink text-xs font-bold bg-white text-ink cursor-pointer"
                    >
                      <option value="75_GSM">Standard 75 GSM (Everyday Xerox)</option>
                      <option value="100_GSM">Executive 100 GSM (+₹1.50/sheet)</option>
                      <option value="220_GSM">Cardstock 220 GSM (+₹6.00/sheet)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 3: Finishing & Copies */}
              <div className="sx-panel">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Finishing &amp; Copies
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Number of Copies
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, copies: Math.max(1, config.copies - 1) })}
                        className="w-8 h-8 rounded border border-ink bg-paper-soft hover:bg-cream flex items-center justify-center font-bold cursor-pointer"
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
                        className="w-14 h-8 text-center border border-ink rounded font-bold text-xs bg-white text-ink"
                      />
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, copies: config.copies + 1 })}
                        className="w-8 h-8 rounded border border-ink bg-paper-soft hover:bg-cream flex items-center justify-center font-bold cursor-pointer"
                        aria-label="Increase copies"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Binding
                    </label>
                    <select
                      value={config.binding}
                      onChange={(e) => setConfig({ ...config, binding: e.target.value as BindingOption })}
                      className="w-full p-2 rounded-lg border border-ink text-xs font-bold bg-white text-ink cursor-pointer"
                    >
                      <option value="NONE">None (Loose sheets)</option>
                      <option value="STAPLE">Corner Stapling (+₹5/copy)</option>
                      <option value="SPIRAL">Spiral Wire (+₹35/copy)</option>
                      <option value="HARD_BOUND">Hard Bound Book (+₹95/copy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Lamination
                    </label>
                    <select
                      value={config.lamination}
                      onChange={(e) => setConfig({ ...config, lamination: e.target.value as LaminationOption })}
                      className="w-full p-2 rounded-lg border border-ink text-xs font-bold bg-white text-ink cursor-pointer"
                    >
                      <option value="NONE">No Lamination</option>
                      <option value="GLOSS">Gloss Lam (+₹15/sheet)</option>
                      <option value="MATTE">Matte Lam (+₹20/sheet)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 4: Collection & Fulfillment */}
              <div className="sx-panel">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Collection Method
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomer({ ...customer, fulfillment: "STORE_PICKUP" })}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      customer.fulfillment === "STORE_PICKUP"
                        ? "border-ink bg-cyan font-bold text-ink shadow-xs"
                        : "border-ink/20 bg-white text-muted hover:border-ink/60"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-bold text-ink">
                      <Building2 size={14} /> Store Counter Pickup
                    </span>
                    <span className="text-[10px] text-muted block mt-0.5">12 Paper Street · Free</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomer({ ...customer, fulfillment: "LOCAL_DELIVERY" })}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      customer.fulfillment === "LOCAL_DELIVERY"
                        ? "border-ink bg-cyan font-bold text-ink shadow-xs"
                        : "border-ink/20 bg-white text-muted hover:border-ink/60"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-bold text-ink">
                      <Truck size={14} /> Campus Delivery
                    </span>
                    <span className="text-[10px] text-muted block mt-0.5">Hostels &amp; Campus (+₹40)</span>
                  </button>
                </div>
              </div>

              {/* Prominent Estimated Price Box */}
              <div className="p-4 rounded-xl border-2 border-ink bg-[#fff18c] text-ink space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink/80 block">
                      Estimated Total Price
                    </span>
                    <span className="text-2xl font-black font-headline tracking-tight">
                      ₹{pricing.totalAmount}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPricingDetails(!showPricingDetails)}
                    className="text-xs font-bold underline text-ink hover:text-blue-700 cursor-pointer"
                  >
                    {showPricingDetails ? "Hide formula" : "View pricing formula"}
                  </button>
                </div>

                <p className="text-[11px] text-ink/80 leading-tight">
                  * Transparent prototype pricing estimate in INR. Includes paper, ink, and finishing options.
                </p>

                {showPricingDetails && (
                  <div className="pt-2 border-t border-ink/20 text-xs text-ink/90 space-y-1 bg-white/60 p-2.5 rounded-lg">
                    <div className="flex justify-between">
                      <span>Base Print ({pageCount} pgs × {config.copies} copies @ ₹{pricing.ratePerPage}/pg):</span>
                      <strong>₹{pricing.printCost}</strong>
                    </div>
                    {pricing.paperSurcharge > 0 && (
                      <div className="flex justify-between">
                        <span>GSM Surcharge ({config.paperGsm.replace("_", " ")}):</span>
                        <strong>₹{pricing.paperSurcharge}</strong>
                      </div>
                    )}
                    {pricing.bindingCost > 0 && (
                      <div className="flex justify-between">
                        <span>Binding ({config.binding.replace("_", " ")}):</span>
                        <strong>₹{pricing.bindingCost}</strong>
                      </div>
                    )}
                    {pricing.laminationCost > 0 && (
                      <div className="flex justify-between">
                        <span>Lamination ({config.lamination}):</span>
                        <strong>₹{pricing.laminationCost}</strong>
                      </div>
                    )}
                    {pricing.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Campus Delivery Fee:</span>
                        <strong>₹{pricing.deliveryFee}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & CONFIRM */}
          {currentStep === 3 && (
            <div className="space-y-4 text-left">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-ink">
                  Step 3: Review &amp; Confirm Demo Order
                </h3>
                <p className="text-xs text-muted">
                  Review your configuration summary and enter customer details for the demo ticket.
                </p>
              </div>

              {/* Order Recap Summary Card */}
              <div className="p-4 rounded-xl border-2 border-ink bg-[#fbf7ee] space-y-2.5 text-xs text-ink shadow-xs">
                <div className="flex justify-between items-start pb-2 border-b border-ink/15">
                  <div>
                    <strong className="block text-sm font-bold text-ink">{selectedFile?.name}</strong>
                    <span className="text-muted">
                      {pageCount} {pageCount === 1 ? "page" : "pages"} · {config.copies} {config.copies === 1 ? "copy" : "copies"} · {formatFileSize(selectedFile?.size || 0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted block uppercase font-bold">Estimated Total</span>
                    <span className="text-lg font-black text-ink font-headline">₹{pricing.totalAmount}</span>
                  </div>
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
                    <span className="text-[10px] uppercase font-bold text-muted block">Paper Weight</span>
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
                    <span className="text-[10px] uppercase font-bold text-muted block">Fulfillment</span>
                    <strong>{customer.fulfillment === "STORE_PICKUP" ? "Counter Pickup" : "Campus Delivery"}</strong>
                  </div>
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="sx-panel">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                  Customer &amp; Collection Information
                </h4>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">
                        Customer Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="e.g. Aarav Sharma"
                        className={`w-full p-2.5 rounded-lg border text-xs font-bold bg-white text-ink ${
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
                        10-Digit Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        maxLength={14}
                        className={`w-full p-2.5 rounded-lg border text-xs font-bold bg-white text-ink ${
                          customerErrors.phone ? "border-red-500 bg-red-50" : "border-ink"
                        }`}
                        required
                      />
                      {customerErrors.phone && (
                        <span className="text-[11px] text-red-600 block mt-0.5">{customerErrors.phone}</span>
                      )}
                    </div>
                  </div>

                  {customer.fulfillment === "LOCAL_DELIVERY" && (
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">
                        Hostel / Campus Delivery Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customer.deliveryAddress}
                        onChange={(e) => setCustomer({ ...customer, deliveryAddress: e.target.value })}
                        placeholder="e.g. Hostel 4, Room 212, Campus North"
                        className="w-full p-2.5 rounded-lg border border-ink text-xs bg-white text-ink"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Notes for Operator <span className="text-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customer.notes}
                      onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                      placeholder="e.g. Keep front page separate, needed for exam today"
                      className="w-full p-2.5 rounded-lg border border-ink text-xs bg-white text-ink"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS RECEIPT */}
          {currentStep === 4 && createdOrder && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-700 mx-auto flex items-center justify-center text-emerald-800 shadow-xs">
                <Check size={28} />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-yellow border-2 border-ink text-xs font-black tracking-wide text-ink mb-1">
                  PROTOTYPE DEMO ORDER CREATED
                </span>
                <h3 className="font-extrabold text-xl font-headline tracking-tight text-ink">
                  Demo Reference #{createdOrder.id}
                </h3>
                <p className="text-xs text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                  Your order has been recorded in the local demo queue. View and transition its status in the Admin Operations Dashboard.
                </p>
              </div>

              {/* Neo-Memphis Ticket Receipt */}
              <div className="p-4 rounded-xl border-2 border-ink bg-[#fffaf1] text-left text-xs max-w-md mx-auto space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-ink/15">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Order Reference</span>
                    <strong className="text-sm font-black text-ink">{createdOrder.id}</strong>
                  </div>
                  <button
                    onClick={copyOrderId}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue hover:underline bg-white px-2 py-1 rounded border border-ink cursor-pointer"
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

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 max-w-md mx-auto">
                <strong>Demonstration notice:</strong> This is a prototype order. No real payment has been processed, and no hardware printer command has been triggered.
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
                <a
                  href="/admin"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-ink bg-cyan hover:bg-cyan/80 text-ink font-bold text-xs shadow-xs transition-transform active:translate-y-0.5"
                >
                  <ExternalLink size={14} /> Open Admin Operations Queue
                </a>
                <button
                  type="button"
                  onClick={handleResetForNewOrder}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-ink bg-white hover:bg-cream text-ink font-bold text-xs transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} /> Print Another Document
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-ink bg-ink text-paper font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Toolbar */}
        {currentStep !== 4 && (
          <div className="sx-footer">
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={handleAttemptClose}
                className="px-4 py-2 rounded-lg border border-ink text-xs font-bold text-muted hover:text-ink hover:bg-paper cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as StepNumber)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-ink text-xs font-bold text-ink hover:bg-paper cursor-pointer"
              >
                <ArrowLeft size={14} /> {currentStep === 2 ? "Back to Upload" : "Back to Settings"}
              </button>
            )}

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleContinueToSettings}
                disabled={!selectedFile || Boolean(fileError)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border-2 border-ink bg-ink text-paper font-bold text-xs shadow-xs hover:bg-ink-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all active:translate-y-0.5 cursor-pointer"
              >
                Continue to Print Settings <ArrowRight size={14} />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleContinueToReview}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border-2 border-ink bg-ink text-paper font-bold text-xs shadow-xs hover:bg-ink-secondary transition-all active:translate-y-0.5 cursor-pointer"
              >
                Review &amp; Confirm (₹{pricing.totalAmount}) <ArrowRight size={14} />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg border-2 border-ink bg-lime text-ink font-black text-xs shadow-sm hover:brightness-105 disabled:opacity-50 transition-all active:translate-y-0.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting Order…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Confirm Demo Order (₹{pricing.totalAmount})
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Discard Confirmation Modal / Backdrop dialog */}
        <AnimatePresence>
          {showDiscardConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs"
              role="alertdialog"
              aria-modal="true"
            >
              <motion.div
                className="bg-white border-2 border-ink rounded-xl p-5 max-w-sm w-full text-left shadow-lg space-y-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="flex items-center gap-2.5 text-amber-600">
                  <AlertTriangle size={20} />
                  <strong className="text-sm text-ink">Discard Draft Order?</strong>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  You have an uploaded document and configured print settings. If you close now, your draft selections will be discarded.
                </p>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscardConfirm(false)}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-ink text-ink bg-paper hover:bg-cream cursor-pointer"
                  >
                    Keep Editing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscardConfirm(false);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg border-2 border-ink text-white bg-red-600 hover:bg-red-700 shadow-xs cursor-pointer"
                  >
                    Discard &amp; Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
