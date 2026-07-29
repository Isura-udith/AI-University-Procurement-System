import {
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaLandmark,
  FaUserCheck,
} from "react-icons/fa";

export default function VendorProfile({ vendor }) {
  if (!vendor) return null;

  return (
    <div className="space-y-6">
      {/* Primary Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{vendor.companyName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registration No: <span className="font-semibold text-slate-700">{vendor.registrationNumber}</span>
            </p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
            {vendor.businessType || "Supplier"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FaUserCheck className="text-emerald-600 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Contact Person</p>
              <p className="font-semibold text-slate-800">{vendor.contactPerson || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FaEnvelope className="text-emerald-600 mt-0.5 shrink-0" size={16} />
            <div className="overflow-hidden">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Email Address</p>
              <p className="font-semibold text-slate-800 truncate">{vendor.email}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FaPhone className="text-emerald-600 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Phone</p>
              <p className="font-semibold text-slate-800">{vendor.phone || "N/A"}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FaGlobe className="text-emerald-600 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Website</p>
              <p className="font-semibold text-emerald-600">
                {vendor.website ? (
                  <a href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noreferrer" className="hover:underline">
                    {vendor.website}
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FaShieldAlt className="text-emerald-600 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">CIDA Grade</p>
              <p className="font-semibold text-slate-800">{vendor.cidaGrade || "Ungraded"}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FaMapMarkerAlt className="text-emerald-600 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Address</p>
              <p className="font-semibold text-slate-800">
                {vendor.address?.street ? `${vendor.address.street}, ${vendor.address.city || ''}` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="pt-2">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Registered Supply Categories</p>
          <div className="flex flex-wrap gap-2">
            {vendor.supplierCategories?.length > 0 ? (
              vendor.supplierCategories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium"
                >
                  {cat}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No categories assigned</span>
            )}
          </div>
        </div>
      </div>

      {/* Financial & Banking Information Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
          <FaLandmark className="text-emerald-600" />
          <span>Banking & Tax Details</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block">Bank Name</span>
            <span className="font-bold text-slate-800 text-sm">{vendor.bankName || "N/A"}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block">Account Number</span>
            <span className="font-bold text-slate-800 text-sm font-mono">{vendor.bankAccountNumber || "N/A"}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block">Account Holder Name</span>
            <span className="font-bold text-slate-800 text-sm">{vendor.bankAccountName || vendor.companyName}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block">VAT / Tax Identification No</span>
            <span className="font-bold text-slate-800 text-sm font-mono">{vendor.vatNumber || vendor.taxId || "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
