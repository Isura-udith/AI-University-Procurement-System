import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import vendorService from "../../../services/vendor.service";
import {
  FaFileUpload,
  FaArrowLeft,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaMapMarkerAlt,
  FaRegAddressCard,
  FaCheckCircle,
  FaSpinner,
  FaTrash,
  FaSearch,
  FaEdit,
  FaFileAlt,
  FaArrowRight,
  FaTimes,
  FaPrint,
} from "react-icons/fa";
import uwuLogo from "../../../assets/logos/Logo_uwu.jpg";
import Footer from "../../../components/navigation/Footer";

export default function VendorRegister() {
  const { user } = useSelector(state => state.auth);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName: "",
    registrationNumber: "",
    vatNumber: "",
    cidaGrade: "",
    businessType: "",
    contactPerson: "",
    email: "",
    phone: "",
    website: "",
    street: "",
    city: "",
    district: "",
    province: "",
    categories: [],
  });

  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [referenceNo, setReferenceNo] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const update = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const categories = [
    "Laboratory Equipment",
    "Medical Supplies",
    "IT Equipment",
    "Furniture",
    "Office Supplies",
    "Construction",
    "Civil Works",
    "Consulting",
    "Maintenance",
    "Printing",
    "Transport",
    "Catering",
    "Security",
    "Cleaning",
    "Academic Resources",
    "Research Equipment",
  ];

  const provinces = [
    "Uva",
    "Central",
    "Western",
    "Southern",
    "Northern",
    "Eastern",
    "North Western",
    "North Central",
    "Sabaragamuwa",
  ];

  const businessTypes = [
    "Sole Proprietor",
    "Partnership",
    "Private Limited",
    "Public Limited",
    "State Enterprise",
    "Foreign Entity",
  ];

  const validateStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!form.companyName.trim())
        newErrors.companyName = "Company name is required";
      if (!form.registrationNumber.trim())
        newErrors.registrationNumber = "Registration number is required";
      if (!form.businessType)
        newErrors.businessType = "Business type is required";
    } else if (currentStep === 2) {
      if (!form.contactPerson.trim())
        newErrors.contactPerson = "Contact person is required";
      if (!form.email.trim()) {
        newErrors.email = "Email address is required";
      } else if (!/\S+@\S+\.\S+/.test(form.email)) {
        newErrors.email = "Email address is invalid";
      }
      if (!form.street.trim()) newErrors.street = "Street address is required";
      if (!form.city.trim()) newErrors.city = "City is required";
      if (!form.district.trim()) newErrors.district = "District is required";
      if (!form.province) newErrors.province = "Province is required";
    } else if (currentStep === 3) {
      if (form.categories.length === 0) {
        newErrors.categories = "Please select at least one supply category";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addMockFiles(selectedFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addMockFiles(droppedFiles);
  };

  const addMockFiles = (newFiles) => {
    const updatedFiles = newFiles.map((file) => {
      const fileId = Date.now() + Math.random();
      let progress = 0;

      const interval = setInterval(() => {
        progress += 20;
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
              if (progress >= 100) {
                clearInterval(interval);
                return { ...f, progress: 100, status: "completed" };
              }
              return { ...f, progress, status: "uploading" };
            }
            return f;
          }),
        );
      }, 100);

      return {
        id: fileId,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        progress: 0,
        status: "uploading",
      };
    });
    setFiles((prev) => [...prev, ...updatedFiles]);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate entire form contents
    const isStep1Valid = validateStep(1);
    const isStep2Valid = validateStep(2);
    const isStep3Valid = validateStep(3);

    if (!isStep1Valid) {
      setStep(1);
      return;
    }
    if (!isStep2Valid) {
      setStep(2);
      return;
    }
    if (!isStep3Valid) {
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      companyName: form.companyName,
      registrationNumber: form.registrationNumber,
      vatNumber: form.vatNumber,
      cidaGrade: form.cidaGrade,
      businessType: form.businessType,
      contactPerson: form.contactPerson,
      email: form.email,
      phone: form.phone,
      website: form.website,
      address: {
        street: form.street,
        city: form.city,
        district: form.district,
        province: form.province,
      },
      supplierCategories: form.categories,
      cidaCertificate: files.find(f => f.name.toLowerCase().includes('cida'))?.name || '',
      kycDocuments: files.map(f => ({
        docType: f.name.toLowerCase().includes('cida') ? 'cida' : 'other',
        name: f.name,
        url: 'pending-upload/' + f.name,
        verified: false
      })),
      userId: user?._id
    };

    vendorService.register(payload)
      .then((res) => {
        setIsSubmitting(false);
        setSubmitSuccess(true);
        const vendorData = res.data?.data || res.data || {};
        setReferenceNo(vendorData.registrationNumber || vendorData._id || `VU-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      })
      .catch((err) => {
        console.error(err);
        setIsSubmitting(false);
        setErrors(prev => ({ ...prev, submit: err.message || 'Registration failed' }));
      });
  };

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleCategory = (cat) => {
    if (form.categories.includes(cat)) {
      update(
        "categories",
        form.categories.filter((c) => c !== cat),
      );
    } else {
      update("categories", [...form.categories, cat]);
    }
    if (errors.categories) {
      setErrors((prev) => ({ ...prev, categories: "" }));
    }
  };

  const stepsInfo = [
    { num: 1, label: "Company Info", desc: "Legal and registration details" },
    {
      num: 2,
      label: "Contact & Address",
      desc: "Headquarters and reps details",
    },
    {
      num: 3,
      label: "Categories & Docs",
      desc: "Select categories and KYC uploads",
    },
    { num: 4, label: "Review & Submit", desc: "Final review and verification" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 py-4 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
          >
            <div className="bg-slate-100 p-1 rounded-full shadow-md">
              <img
                src={uwuLogo}
                alt="UWU Logo"
                className="w-10 h-10 object-contain rounded-full"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-900">
                Uva Wellassa University
              </h1>
              <p className="text-[10px] font-bold tracking-wider uppercase text-emerald-600">
                Smart Procurement System
              </p>
            </div>
          </Link>
          <Link
            to="/"
            className="flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl transition-all border border-slate-200"
          >
            <FaArrowLeft size={10} />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-center">
        {submitSuccess ? (
          /* SUCCESS STATE */
          <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-center relative overflow-hidden animate-fade-in print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">

            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-250/20 shadow-lg shadow-emerald-500/10 print:border-slate-300 print:text-emerald-600">
              <FaCheckCircle size={40} className="animate-scale-up" />
            </div>

            <span className="text-xs uppercase tracking-widest font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 print:border-slate-300 print:text-emerald-700">
              Registration Received
            </span>

            <h2 className="text-3xl font-extrabold text-slate-900 mt-5 mb-2 print:text-slate-900">
              Application Submitted!
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto print:text-slate-600">
              Thank you for registering with Uva Wellassa University. Your
              vendor application has been submitted to the <strong className="text-slate-800 font-semibold">Supplies Division</strong> for review and approval.
            </p>

            {/* Reference Number Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 my-8 max-w-sm mx-auto shadow-inner print:bg-slate-100 print:border-slate-300">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Temporary Reference ID
              </p>
              <p className="text-2xl font-mono font-bold text-emerald-600 mt-1 select-all print:text-emerald-700">
                {referenceNo}
              </p>
              <p className="text-xs text-slate-500 mt-2 print:text-slate-500">
                Once approved by Supplies Division, an account setup email link will be sent to{" "}
                <span className="text-slate-800 font-medium print:text-slate-800">
                  {form.email}
                </span>{" "}
                allowing you to create your login password.
              </p>
            </div>

            {/* Print Friendly Summary (Hidden except on print) */}
            <div className="hidden print:block text-left border-t border-b border-slate-200 py-6 my-6 text-sm">
              <h3 className="font-bold text-base mb-4 text-slate-900">
                Supplier Profile Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-slate-500">
                    Company Name:
                  </span>{" "}
                  {form.companyName}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">
                    Reg Number:
                  </span>{" "}
                  {form.registrationNumber}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">
                    Business Type:
                  </span>{" "}
                  {form.businessType}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">
                    CIDA Grade:
                  </span>{" "}
                  {form.cidaGrade || "N/A"}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">
                    Contact Person:
                  </span>{" "}
                  {form.contactPerson}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">
                    Email Address:
                  </span>{" "}
                  {form.email}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">
                    Phone Number:
                  </span>{" "}
                  {form.phone || "N/A"}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">
                    Location:
                  </span>{" "}
                  {form.city}, {form.district} ({form.province} Province)
                </div>
              </div>
              <div className="mt-4">
                <span className="font-semibold text-slate-500">
                  Supply Categories:
                </span>{" "}
                {form.categories.join(", ")}
              </div>
            </div>

            {/* Onboarding Timeline / Roadmap */}
            <div className="max-w-md mx-auto text-left mb-8 print:hidden">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-200 pb-2">
                Verification Pipeline
              </h3>
              <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Step 1: Received */}
                <div className="flex items-start space-x-4 relative">
                  <div className="w-5.5 h-5.5 bg-emerald-600 rounded-full border-3 border-white flex items-center justify-center z-10 shadow shadow-emerald-600/30"></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      1. Requisition Saved
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Your data and KYC attachments are securely recorded in our
                      repository.
                    </p>
                  </div>
                </div>

                {/* Step 2: Document Verification */}
                <div className="flex items-start space-x-4 relative">
                  <div className="w-5.5 h-5.5 bg-emerald-50 text-emerald-600 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-600 flex items-center">
                      <span>2. KYC & Document Audit</span>
                      <span className="ml-2 text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-250/20 px-1.5 py-0.5 rounded uppercase font-extrabold">
                        In Progress
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Our Procurement Division verifies company registration and
                      credentials (estimated: 2-3 business days).
                    </p>
                  </div>
                </div>

                {/* Step 3: Approval */}
                <div className="flex items-start space-x-4 relative">
                  <div className="w-5.5 h-5.5 bg-slate-200 rounded-full border-4 border-white flex items-center justify-center z-10"></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400">
                      3. Portal Activation
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Approved suppliers receive credential activation codes via
                      email to login and place bids.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4 border-t border-slate-100 print:hidden">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-650 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <FaPrint />
                <span>Print Confirmation</span>
              </button>
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Back to Homepage</span>
                <FaArrowRight size={10} />
              </Link>
            </div>
          </div>
        ) : (
          /* MULTISTEP REGISTRATION FORM */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* LEFT SIDEBAR: Instructions & Step Progress */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 print:hidden">
              {/* branding card */}
              <div className="bg-linear-to-br from-emerald-50/60 to-slate-50/80 backdrop-blur-md border border-emerald-100/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Supplier Registration
                </h2>
                <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                  Join the official procurement pool of Uva Wellassa University.
                  Registering grants eligibility to participate in national
                  competitive bidding, works contracts, and goods procurement.
                </p>
              </div>

              {/* Steps Progress Checklist */}
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 shadow-lg">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-150 pb-2">
                  Registration Progress
                </h3>
                <div className="space-y-4">
                  {stepsInfo.map((s) => {
                    const isCompleted = step > s.num;
                    const isActive = step === s.num;

                    return (
                      <button
                        key={s.num}
                        onClick={() => {
                          // Allow jumping back to previously completed steps or next step if validated
                          if (
                            s.num < step ||
                            (s.num === step + 1 && validateStep(step))
                          ) {
                            setStep(s.num);
                          }
                        }}
                        disabled={s.num > step + 1}
                        className={`w-full text-left flex items-start space-x-3.5 p-2 rounded-xl transition-all cursor-pointer ${
                          isActive
                            ? "bg-white border border-slate-200 shadow-sm"
                            : "hover:bg-white/60 border border-transparent"
                        } ${s.num > step + 1 ? "opacity-45 cursor-not-allowed" : ""}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-all ${
                            isCompleted
                              ? "bg-emerald-600 text-white shadow shadow-emerald-600/30"
                              : isActive
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm shadow-emerald-600/10"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          {isCompleted ? (
                            <span className="text-[10px]">✓</span>
                          ) : (
                            s.num
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold leading-none ${isActive ? "text-emerald-600" : isCompleted ? "text-slate-800" : "text-slate-400"}`}
                          >
                            {s.label}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate mt-1 leading-none">
                            {s.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Requirement Checkpoints */}
              <div className="bg-slate-50/50 border border-slate-100/80 rounded-2xl p-5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Prerequisites
                </h4>
                <ul className="text-slate-600 text-xs space-y-2">
                  <li className="flex items-start">
                    <span className="text-emerald-600 mr-2">•</span>
                    <span>Company registration certification</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-600 mr-2">•</span>
                    <span>VAT certificates (if applicable)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-600 mr-2">•</span>
                    <span>CIDA Grade documents (for works contractors)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-600 mr-2">•</span>
                    <span>Director details and contact addresses</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* RIGHT COLUMN: The Interactive Form Card */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-8 bg-white rounded-3xl shadow-2xl p-6 sm:p-10 relative overflow-hidden"
            >

              {/* Form Title Header */}
              <div className="mb-8">
                <span className="text-[10px] text-slate-550 uppercase tracking-widest font-extrabold bg-slate-50 px-2.5 py-1 rounded-md border border-slate-150">
                  Step {step} of 4
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-3">
                  {stepsInfo[step - 1].label}
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Please provide accurate information. Marked fields (*) are
                  mandatory.
                </p>
              </div>

              {/* STEP 1: COMPANY GENERAL INFO */}
              {step === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Company Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Company Registered Name *
                      </label>
                      <div className="relative">
                        <FaBuilding className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                          type="text"
                          value={form.companyName}
                          onChange={(e) =>
                            update("companyName", e.target.value)
                          }
                          placeholder="e.g., MedTech Solutions (Pvt) Ltd"
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                            errors.companyName
                              ? "border-red-500/60 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          }`}
                        />
                      </div>
                      {errors.companyName && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.companyName}
                        </p>
                      )}
                    </div>

                    {/* Registration Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Business Registration No. *
                      </label>
                      <div className="relative">
                        <FaRegAddressCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                          type="text"
                          value={form.registrationNumber}
                          onChange={(e) =>
                            update("registrationNumber", e.target.value)
                          }
                          placeholder="e.g., PV-12345-2020"
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                            errors.registrationNumber
                              ? "border-red-500/60 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          }`}
                        />
                      </div>
                      {errors.registrationNumber && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.registrationNumber}
                        </p>
                      )}
                    </div>

                    {/* Business Type Select */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Business Type *
                      </label>
                      <select
                        value={form.businessType}
                        onChange={(e) => update("businessType", e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                          errors.businessType
                            ? "border-red-500/60 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        }`}
                      >
                        <option value="" className="text-slate-450">
                          Select business type...
                        </option>
                        {businessTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {errors.businessType && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.businessType}
                        </p>
                      )}
                    </div>

                    {/* VAT Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        VAT Registration Number
                      </label>
                      <input
                        type="text"
                        value={form.vatNumber}
                        onChange={(e) => update("vatNumber", e.target.value)}
                        placeholder="e.g., VAT-789456123"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-emerald-500/60 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>

                    {/* CIDA Grade (for construction works) */}
                    <div>
                      <label className="flex text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 items-center justify-between">
                        <span>CIDA Registration Grade</span>
                        <span className="text-[9px] text-slate-400 font-semibold tracking-normal normal-case">
                          (If applicable)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.cidaGrade}
                        onChange={(e) => update("cidaGrade", e.target.value)}
                        placeholder="e.g., Grade C1 / C4"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-emerald-500/60 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CONTACT & ADDRESS DETAILS */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Grid 1: Basic Contacts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Primary Contact Person *
                      </label>
                      <input
                        type="text"
                        value={form.contactPerson}
                        onChange={(e) =>
                          update("contactPerson", e.target.value)
                        }
                        placeholder="e.g., Mr. R. Fernando"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                          errors.contactPerson
                            ? "border-red-500/60 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        }`}
                      />
                      {errors.contactPerson && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.contactPerson}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                          placeholder="e.g., contact@company.lk"
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                            errors.email
                              ? "border-red-500/60 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                          type="text"
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          placeholder="e.g., +94 55 223 4567"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Corporate Website
                      </label>
                      <div className="relative">
                        <FaGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                          type="text"
                          value={form.website}
                          onChange={(e) => update("website", e.target.value)}
                          placeholder="e.g., www.company.lk"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Title Address */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150 pb-2 pt-2">
                    Headquarters Address
                  </h3>

                  {/* Address Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Street Address *
                      </label>
                      <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                          type="text"
                          value={form.street}
                          onChange={(e) => update("street", e.target.value)}
                          placeholder="e.g., 45 Hospital Road, Passara Road"
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                            errors.street
                              ? "border-red-500/60 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          }`}
                        />
                      </div>
                      {errors.street && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.street}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        placeholder="e.g., Badulla"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                          errors.city
                            ? "border-red-500/60 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        }`}
                      />
                      {errors.city && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        District *
                      </label>
                      <input
                        type="text"
                        value={form.district}
                        onChange={(e) => update("district", e.target.value)}
                        placeholder="e.g., Badulla"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                          errors.district
                            ? "border-red-500/60 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        }`}
                      />
                      {errors.district && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.district}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Province *
                      </label>
                      <select
                        value={form.province}
                        onChange={(e) => update("province", e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                          errors.province
                            ? "border-red-500/60 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                        }`}
                      >
                        <option value="">Select province...</option>
                        {provinces.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      {errors.province && (
                        <p className="text-[11px] text-red-500 mt-1.5">
                          {errors.province}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: SUPPLY CATEGORIES & DOCUMENTATION */}
              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Category Selection Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Supply Categories *
                    </label>

                    {/* Search bar */}
                    <div className="relative mb-4">
                      <FaSearch
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        size={12}
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search categories (e.g., Equipment, Construction)..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700"
                        >
                          <FaTimes size={10} />
                        </button>
                      )}
                    </div>

                    {/* Dismissible selected tags */}
                    {form.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4 p-3 bg-slate-50 border border-slate-150 rounded-xl">
                        {form.categories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-[10px] font-bold"
                          >
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat)}
                              className="hover:text-emerald-700 focus:outline-none hover:bg-emerald-100 rounded p-0.5"
                            >
                              <FaTimes size={8} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Category list panel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 border border-slate-150 bg-slate-50/50 rounded-xl p-3.5">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((cat) => {
                          const isSelected = form.categories.includes(cat);
                          return (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => toggleCategory(cat)}
                              className={`flex items-center justify-between text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-750 shadow-sm"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-350 hover:text-slate-800"
                              }`}
                            >
                              <span>{cat}</span>
                              {isSelected && (
                                <span className="text-[10px] text-emerald-650 font-bold">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-6 text-center text-xs text-slate-400 font-medium">
                          No categories match "{searchQuery}"
                        </div>
                      )}
                    </div>
                    {errors.categories && (
                      <p className="text-[11px] text-red-500 mt-1.5">
                        {errors.categories}
                      </p>
                    )}
                  </div>

                  {/* KYC Document Upload Section */}
                  <div className="border-t border-slate-150 pt-5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Corporate KYC Documents
                    </label>

                    {/* Drag-and-drop zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                        isDragOver
                          ? "border-emerald-500 bg-emerald-50/30 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
                      }`}
                    >
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="kyc-files"
                      />
                      <FaFileUpload
                        className="mx-auto text-slate-400 mb-3 animate-pulse"
                        size={26}
                      />
                      <p className="text-xs font-bold text-slate-800">
                        Drag & drop PDF, DOC, or JPEG files here
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                        or click to browse local files (Max 25MB each)
                      </p>
                    </div>

                    {/* Upload progress list */}
                    {files.length > 0 && (
                      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto bg-slate-50/30 border border-slate-150 p-2.5 rounded-xl">
                        {files.map((f) => {
                          const isDone = f.status === "completed";
                          return (
                            <div
                              key={f.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-150 text-xs"
                            >
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <FaFileAlt
                                  className="text-slate-400 shrink-0"
                                  size={14}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-700 truncate leading-none">
                                    {f.name}
                                  </p>
                                  <span className="text-[9px] text-slate-400 font-semibold mt-1 inline-block leading-none">
                                    {f.size}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-3 shrink-0 ml-3">
                                {isDone ? (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-650 border border-emerald-200/50 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                    Verified
                                  </span>
                                ) : (
                                  <div className="flex items-center space-x-1.5">
                                    <FaSpinner
                                      size={10}
                                      className="animate-spin text-emerald-600"
                                    />
                                    <span className="text-[9px] font-bold text-slate-500">
                                      {f.progress}%
                                    </span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeFile(f.id)}
                                  className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                >
                                  <FaTrash size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & CONFIRM */}
              {step === 4 && (
                <div className="space-y-6 animate-fade-in text-xs">
                  {/* Summary Block 1: Company Profile */}
                  <div className="bg-slate-50/60 border border-slate-150 rounded-2xl p-5 relative">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="absolute right-4 top-4 text-[10px] font-bold text-emerald-600 hover:text-emerald-550 flex items-center space-x-1 cursor-pointer"
                    >
                      <FaEdit /> <span>Edit</span>
                    </button>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-3 leading-none">
                      Company Profile Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-slate-700">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          Registered Company Name
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">
                          {form.companyName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          Business Registration No.
                        </p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">
                          {form.registrationNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          Business Type
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {form.businessType}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          VAT Registration No.
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {form.vatNumber || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          CIDA Registration Grade
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {form.cidaGrade || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Block 2: Contacts & Address */}
                  <div className="bg-slate-50/60 border border-slate-150 rounded-2xl p-5 relative">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="absolute right-4 top-4 text-[10px] font-bold text-emerald-600 hover:text-emerald-550 flex items-center space-x-1 cursor-pointer"
                    >
                      <FaEdit /> <span>Edit</span>
                    </button>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-3 leading-none">
                      Contacts & Location
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-slate-700">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          Contact Person
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {form.contactPerson}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          Email Address
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {form.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          Phone Number
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {form.phone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          Website
                        </p>
                        <p className="font-semibold text-emerald-650 mt-0.5">
                          {form.website || "N/A"}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          Street & Location
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {form.street}, {form.city}, {form.district},{" "}
                          {form.province} Province
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Block 3: Supply Categories & Attachments */}
                  <div className="bg-slate-50/60 border border-slate-150 rounded-2xl p-5 relative">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="absolute right-4 top-4 text-[10px] font-bold text-emerald-600 hover:text-emerald-550 flex items-center space-x-1 cursor-pointer"
                    >
                      <FaEdit /> <span>Edit</span>
                    </button>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider mb-3 leading-none">
                      Categories & KYC uploads
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                          Supply Categories Selected
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {form.categories.map((c) => (
                            <span
                              key={c}
                              className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-605 border border-emerald-200/50 text-[9px] font-bold"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                          KYC Documents Attached
                        </p>
                        {files.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {files.map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center space-x-2 p-2 bg-white border border-slate-150 rounded-xl"
                              >
                                <FaFileAlt
                                  className="text-slate-400"
                                  size={12}
                                />
                                <span className="font-medium text-slate-700 truncate flex-1">
                                  {f.name}
                                </span>
                                <span className="text-[9px] text-slate-400 shrink-0 font-bold">
                                  {f.size}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-450 italic mt-0.5">
                            No KYC documents attached
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Declaration Checklist */}
                  <div className="flex items-start space-x-3.5 p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                    <input
                      type="checkbox"
                      required
                      className="accent-emerald-600 border-slate-300 rounded mt-0.5 cursor-pointer"
                      id="declare-chk"
                    />
                    <label
                      htmlFor="declare-chk"
                      className="text-[10px] text-slate-650 leading-relaxed cursor-pointer select-none"
                    >
                      I hereby declare and confirm that the information provided
                      in this registration form is accurate, complete, and
                      truthful, and that the attached documents are authentic
                      corporate certifications.
                    </label>
                  </div>
                </div>
              )}

              {errors.submit && (
                <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100 font-medium">
                  {errors.submit}
                </div>
              )}

              {/* ACTION FOOTER BUTTONS */}
              <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-150">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={step === 1 || isSubmitting}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  Previous
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md hover:shadow-emerald-600/10 transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <span>Next Stage</span>
                    <FaArrowRight size={10} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md hover:shadow-emerald-600/20 transition-all flex items-center space-x-2.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner
                          size={12}
                          className="animate-spin text-white"
                        />
                        <span>Submitting Profile...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Registration</span>
                        <FaCheckCircle size={12} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer variant="public" theme="light" />
    </div>
  );
}
