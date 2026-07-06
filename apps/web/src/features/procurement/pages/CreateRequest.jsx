import { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaExclamationTriangle, FaUpload, FaRobot, FaCalendarAlt, FaSpinner, FaCheckCircle, FaInfoCircle, FaCheck, FaTimesCircle, FaShieldAlt } from 'react-icons/fa';
import aiService from '../../../services/ai.service';
import procurementService from '../../../services/procurement.service';
import planningService from '../../../services/planning.service';
import FormSection from '../components/FormSection';
import FormField, { TextInput, SelectInput, TextArea } from '../components/FormField';
import BOQTable from '../components/BOQTable';

const FACULTY_MAP = {
  fom: 'Faculty of Medicine',
  fots: 'Faculty of Technological Studies',
  foas: 'Faculty of Applied Sciences',
  foahs: 'Faculty of Animal Science & Export Agriculture',
  'fom-mgt': 'Faculty of Management',
  supplies: 'Supplies Division',
  works: 'Works Division',
  'vc-office': "Vice Chancellor's Office"
};

const FACULTIES = [
  { value: 'fom', label: 'Faculty of Medicine' },
  { value: 'fots', label: 'Faculty of Technological Studies' },
  { value: 'foas', label: 'Faculty of Applied Sciences' },
  { value: 'foahs', label: 'Faculty of Animal Science & Export Agriculture' },
  { value: 'fom-mgt', label: 'Faculty of Management' },
  { value: 'supplies', label: 'Supplies Division' },
  { value: 'works', label: 'Works Division' },
  { value: 'vc-office', label: "Vice Chancellor's Office" },
];
const FUNDING = [
  { value: 'gosl', label: 'GOSL Treasury Funds' },
  { value: 'ahead', label: 'Foreign Funded - AHEAD Project' },
  { value: 'foreign-other', label: 'Foreign Funded - Other' },
  { value: 'internal', label: 'University Internal Revenue' },
];
const CATEGORIES = [
  { value: 'goods', label: 'Goods' },
  { value: 'works', label: 'Works' },
  { value: 'non-consulting', label: 'Non-Consulting Services' },
];
const METHODS = [
  { value: 'ncb', label: 'NCB - National Competitive Bidding' },
  { value: 'icb', label: 'ICB - International Competitive Bidding' },
  { value: 'shopping', label: 'Shopping (Limited Bidding)' },
  { value: 'direct', label: 'Direct Contracting (Single Source)' },
];
const SLICING_OPTIONS = [
  { value: 'no', label: 'No - Single Contract Package' },
  { value: 'yes-lots', label: 'Yes - Slice into Multiple Lots (SME participation)' },
];
const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'emergency', label: 'Emergency' },
];

const currentYear = new Date().getFullYear();
const genRef = `UWU/G/NCB/${currentYear}/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

export default function CreateRequest() {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // AI Assist States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiPriceRecommendation, setAiPriceRecommendation] = useState(null);
  const [aiError, setAiError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    refNo: genRef,
    faculty: '',
    officerName: user ? `${user.firstName} ${user.lastName}` : 'Dr. A. Perera',
    officerDesignation: user?.jobTitle || 'Senior Lecturer',
    officerEmpId: user?.employeeId || 'UWU/EMP/2024/045',
    contractTitle: '',
    dappItem: '', mppRef: `MPP/${currentYear}-${currentYear + 2}/REF-001`,
    fundingSource: '', programCode: '', projectCode: '', objectItem: '',
    baseAmount: '', provisionalSums: '', contingencies: '', vatAmount: '',
    category: '', techDescription: '', method: '', methodJustification: '',
    slicing: 'no',
    invitationDate: '', bidClosingDate: '', deliveryDate: '',
    deliveryLocation: 'UWU Supplies Division, Passara Road, Badulla', priority: 'normal',
    conflictDeclared: false, ethicsDeclared: false,
  });
  const [boqItems, setBoqItems] = useState([{ description: '', unit: '', qty: '', unitPrice: '' }]);
  const [files, setFiles] = useState([]);
  const [aiWarning, setAiWarning] = useState('');
  const [errors, setErrors] = useState({});

  // ── Annual Plan / Budget State (Phase 5 workflow) ─────────────
  const [annualPlans, setAnnualPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [myBudget, setMyBudget] = useState(null);
  // Budget compliance check state
  const [budgetCheck, setBudgetCheck] = useState(null);       // null | compliance result object
  const [budgetCheckLoading, setBudgetCheckLoading] = useState(false);
  const [savedDocId, setSavedDocId] = useState(null);         // ID of auto-saved draft for pre-check

  const baseNum = parseFloat(form.baseAmount) || 0;
  const provNum = parseFloat(form.provisionalSums) || 0;
  const contNum = parseFloat(form.contingencies) || 0;
  const vatNum = useMemo(() => {
    if (form.vatAmount !== '') return parseFloat(form.vatAmount) || 0;
    return (baseNum + provNum + contNum) * 0.18;
  }, [baseNum, provNum, contNum, form.vatAmount]);
  const tce = baseNum + provNum + contNum + vatNum;

  // Track previous selectedItemId and tce to reset compliance check during render (avoiding useEffect cascading renders)
  const [prevSelectedItemId, setPrevSelectedItemId] = useState(selectedItemId);
  const [prevTce, setPrevTce] = useState(tce);

  if (selectedItemId !== prevSelectedItemId || tce !== prevTce) {
    setPrevSelectedItemId(selectedItemId);
    setPrevTce(tce);
    if (selectedItemId) {
      setBudgetCheck(null);
    }
  }

  // Load approved annual plans and department budget on mount
  useEffect(() => {
    if (!isEditMode) {
      Promise.allSettled([
        planningService.getAnnualPlans({ status: 'distribution_complete' }),
        planningService.getMyBudget(),
      ]).then(([planRes, budgetRes]) => {
        if (planRes.status === 'fulfilled') {
          const plans = planRes.value.data?.data || planRes.value.data || [];
          setAnnualPlans(Array.isArray(plans) ? plans : []);
        }
        if (budgetRes.status === 'fulfilled') {
          setMyBudget(budgetRes.value.data?.data || budgetRes.value.data || null);
        }
      });
    }
  }, [isEditMode]);

  // Auto-populate form when an annual plan item is selected
  const handleAnnualItemSelect = (planId, itemId) => {
    setSelectedPlanId(planId);
    setSelectedItemId(itemId);
    setBudgetCheck(null); // Reset compliance check when item changes
    if (!planId || !itemId) return;
    const plan = annualPlans.find(p => p._id === planId);
    if (!plan) return;
    const item = plan.items?.find(i => (i._id || i.id) === itemId);
    if (!item) return;
    // Auto-populate key fields from the DAPP item
    setForm(f => ({
      ...f,
      contractTitle: item.description || f.contractTitle,
      dappItem: item._id || itemId,
      mppRef: plan.masterPlanRef || f.mppRef,
      category: item.category === 'Works' ? 'works' : item.category === 'Services' ? 'non-consulting' : 'goods',
      faculty: Object.keys(FACULTY_MAP).find(k => FACULTY_MAP[k] === item.faculty) || f.faculty,
      baseAmount: item.estimatedTotalCost ? String(item.estimatedTotalCost) : f.baseAmount,
    }));
    // Pre-fill BOQ with a single line from the annual plan item
    if (item.description && item.estimatedTotalCost) {
      setBoqItems([{
        description: item.description,
        unit: item.unit || 'Lot',
        qty: String(item.estimatedQuantity || 1),
        unitPrice: String(item.estimatedUnitCost || item.estimatedTotalCost || ''),
      }]);
    }
  };


  useEffect(() => {
    if (isEditMode) {
      const loadData = async () => {
        setLoading(true);
        try {
          const res = await procurementService.getById(id);
          const reqData = res.data;
          
          // Reverse-map faculty label back to code
          const mappedFaculty = Object.keys(FACULTY_MAP).find(key => FACULTY_MAP[key] === reqData.faculty) || '';
          
          // Map category to frontend value (lower case matching category value)
          let mappedCategory = 'goods';
          if (reqData.category === 'Works') mappedCategory = 'works';
          else if (reqData.category === 'Services' || reqData.category === 'Consulting') mappedCategory = 'non-consulting';

          // Map method to frontend value
          let mappedMethod = 'ncb';
          const methodUpper = (reqData.procurementMethod || '').toUpperCase();
          if (methodUpper === 'ICB') mappedMethod = 'icb';
          else if (methodUpper === 'SHOPPING') mappedMethod = 'shopping';
          else if (methodUpper === 'DIRECT') mappedMethod = 'direct';

          setForm({
            refNo: reqData.referenceNumber,
            faculty: mappedFaculty,
            officerName: reqData.requestedBy ? `${reqData.requestedBy.firstName} ${reqData.requestedBy.lastName}` : (reqData.officer || ''),
            officerDesignation: reqData.requestedBy?.jobTitle || reqData.designation || '',
            officerEmpId: reqData.requestedBy?.employeeId || reqData.empId || '',
            contractTitle: reqData.title,
            dappItem: reqData.dappReference || '',
            mppRef: reqData.mppReference || '',
            fundingSource: reqData.fundingSource || '',
            programCode: reqData.programCode || '',
            projectCode: reqData.projectCode || '',
            objectItem: reqData.objectItem || '',
            baseAmount: reqData.items ? String(reqData.items.reduce((sum, item) => sum + (item.estimatedTotalPrice || (item.quantity * item.estimatedUnitPrice)), 0)) : '',
            provisionalSums: reqData.provisionalSums ? String(reqData.provisionalSums) : '',
            contingencies: reqData.contingencies ? String(reqData.contingencies) : '',
            vatAmount: reqData.vatAmount ? String(reqData.vatAmount) : '',
            category: mappedCategory,
            techDescription: reqData.description || '',
            method: mappedMethod,
            methodJustification: reqData.justification || '',
            slicing: reqData.slicing || 'no',
            invitationDate: reqData.invitationDate ? reqData.invitationDate.split('T')[0] : '',
            bidClosingDate: reqData.bidClosingDate ? reqData.bidClosingDate.substring(0, 16) : '',
            deliveryDate: reqData.deliveryDate ? reqData.deliveryDate.split('T')[0] : '',
            deliveryLocation: reqData.deliveryLocation || 'UWU Supplies Division, Passara Road, Badulla',
            priority: reqData.priority || 'normal',
            conflictDeclared: true,
            ethicsDeclared: true,
          });

          if (reqData.items && reqData.items.length > 0) {
            setBoqItems(reqData.items.map(it => ({
              description: it.description,
              unit: it.unit,
              qty: String(it.quantity),
              unitPrice: String(it.estimatedUnitPrice)
            })));
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load requisition data for editing');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [id, isEditMode]);

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Please enter some description text first.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    setAiPriceRecommendation(null);
    try {
      const response = await aiService.getMarketPrice({ rawText: aiPrompt });
      if (response.data) {
        setAiResult(response.data.nlpResult);
        setAiPriceRecommendation(response.data.priceRecommendation);
      } else {
        setAiError('AI engine returned empty response. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setAiError('Failed to parse with Gemini. Please check your API key or network.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiAssist = () => {
    if (!aiResult) return;

    // Map Category to matched select values
    let categoryVal = 'goods';
    const nlpCat = (aiResult.overallCategory || '').toLowerCase();
    if (nlpCat.includes('service')) categoryVal = 'non-consulting';
    else if (nlpCat.includes('work')) categoryVal = 'works';

    // Map Method
    let methodVal = 'ncb';
    const nlpMethod = (aiResult.recommendedMethod || '').toLowerCase();
    if (nlpMethod.includes('direct') || nlpMethod.includes('single')) methodVal = 'direct';
    else if (nlpMethod.includes('shop') || nlpMethod.includes('limited')) methodVal = 'shopping';
    else if (nlpMethod.includes('icb') || nlpMethod.includes('international')) methodVal = 'icb';

    // Generate list of items
    const parsedItems = (aiResult.items || []).map(item => ({
      description: item.description || '',
      unit: ['nos', 'kg', 'liters', 'meters', 'sqm', 'lot'].includes((item.unit || '').toLowerCase()) ? (item.unit || '').toLowerCase() : 'nos',
      qty: item.quantity ? String(item.quantity) : '1',
      unitPrice: item.estimatedUnitPrice ? String(item.estimatedUnitPrice) : ''
    }));

    setForm(prev => ({
      ...prev,
      contractTitle: aiResult.suggestedTitle || prev.contractTitle,
      category: categoryVal,
      method: methodVal,
      methodJustification: aiResult.suggestedJustification || prev.methodJustification,
      techDescription: aiResult.identifiedSpecs ? aiResult.identifiedSpecs.map(s => `• ${s}`).join('\n') : prev.techDescription,
      baseAmount: aiPriceRecommendation?.overallTCE?.midEstimate ? String(aiPriceRecommendation.overallTCE.midEstimate) : prev.baseAmount
    }));

    if (parsedItems.length > 0) {
      setBoqItems(parsedItems);
    }

    setIsAiModalOpen(false);
  };




  const set = (field) => (e) => {
    const val = e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const committee = useMemo(() => {
    if (tce <= 0) return '-';
    if (tce <= 50000000) return 'RPC (Regional Procurement Committee) - Up to LKR 50M';
    if (tce <= 400000000) return 'DPC (Departmental Procurement Committee) - Up to LKR 400M';
    if (tce <= 750000000) return 'Ministry Procurement Committee (MPC) - Up to LKR 750M';
    return 'Cabinet Appointed Procurement Committee (CAPC) - Above LKR 750M';
  }, [tce]);

  const contCap = baseNum * 0.10;
  const contExceeded = contNum > contCap && baseNum > 0;

  const needsJustification = form.method === 'direct' || form.method === 'shopping';

  const handleTechDescChange = (e) => {
    const val = e.target.value;
    set('techDescription')({ target: { value: val } });
    const brands = ['Samsung', 'Apple', 'HP', 'Dell', 'Lenovo', 'Sony', 'LG', 'Canon', 'Epson', 'Huawei'];
    const found = brands.filter(b => val.toLowerCase().includes(b.toLowerCase()));
    if (found.length > 0) {
      setAiWarning(`AI Alert: Brand name(s) detected - "${found.join('", "')}". Specifications appear to be brand-specific. Please use generic descriptions to ensure fair competition.`);
    } else {
      setAiWarning('');
    }
  };

  const handleFileUpload = (e) => {
    const allowed = ['.pdf', '.docx', '.xlsx'];
    const allFiles = Array.from(e.target.files);
    const zips = allFiles.filter(f => f.name.toLowerCase().endsWith('.zip') || f.name.toLowerCase().endsWith('.rar'));
    const newFiles = allFiles.filter(f => allowed.some(ext => f.name.toLowerCase().endsWith(ext)));
    const rejected = allFiles.length - newFiles.length;
    if (zips.length > 0) alert('Compressed files (.zip, .rar) are prohibited for security reasons.');
    else if (rejected > 0) alert(`${rejected} file(s) rejected. Only PDF, DOCX, XLSX allowed.`);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleSubmit = async (submitToWorkflow = false) => {
    const errs = {};
    if (!form.faculty) errs.faculty = 'Required';
    if (!form.contractTitle) errs.contractTitle = 'Required';
    if (!form.dappItem) errs.dappItem = 'Link to a DAPP item is required';
    if (!form.fundingSource) errs.fundingSource = 'Required';
    if (!form.category) errs.category = 'Required';
    if (!form.method) errs.method = 'Required';
    if (needsJustification && !form.methodJustification) errs.methodJustification = 'Justification is mandatory for this method';
    if (!form.conflictDeclared) errs.conflictDeclared = 'You must declare';
    if (!form.ethicsDeclared) errs.ethicsDeclared = 'You must affirm';
    if (baseNum <= 0) errs.baseAmount = 'Enter a valid amount';
    setErrors(errs);
    
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the validation errors before proceeding.');
      return;
    }

    // Block submission if compliance check has been run and failed (hard fail, not special approval)
    if (submitToWorkflow && budgetCheck && !budgetCheck.passed && !budgetCheck.requiresSpecialApproval) {
      toast.error('Budget compliance check failed. Please resolve the issues before submitting.');
      return;
    }

    setLoading(true);
    try {
      let dbCategory = 'Goods';
      if (form.category === 'works') dbCategory = 'Works';
      else if (form.category === 'non-consulting') dbCategory = 'Services';

      let dbMethod = 'NCB';
      if (form.method === 'icb') dbMethod = 'ICB';
      else if (form.method === 'shopping') dbMethod = 'Shopping';
      else if (form.method === 'direct') dbMethod = 'Direct';

      const dbItems = boqItems.map(item => ({
        description: item.description,
        category: dbCategory,
        quantity: parseFloat(item.qty) || 0,
        unit: item.unit || 'nos',
        estimatedUnitPrice: parseFloat(item.unitPrice) || 0
      }));

      const payload = {
        title: form.contractTitle,
        description: form.techDescription || form.contractTitle,
        justification: form.methodJustification,
        category: dbCategory,
        priority: form.priority === 'urgent' ? 'urgent' : form.priority === 'emergency' ? 'urgent' : 'medium',
        items: dbItems,
        totalEstimatedCost: tce,
        vatAmount: vatNum,
        vatInclusive: true,
        dappReference: form.dappItem,
        mppReference: form.mppRef,
        procurementMethod: dbMethod,
        assignedCommittee: tce <= 50000000 ? 'DPC' : tce <= 400000000 ? 'MPC' : 'RPC',
        faculty: FACULTY_MAP[form.faculty] || form.faculty,
        department: FACULTY_MAP[form.faculty] || form.faculty,
        invitationDate: form.invitationDate || undefined,
        bidClosingDate: form.bidClosingDate || undefined,
        deliveryDate: form.deliveryDate || undefined,
        deliveryLocation: form.deliveryLocation,
        slicing: form.slicing,
        fundingSource: form.fundingSource,
        programCode: form.programCode,
        projectCode: form.projectCode,
        objectItem: form.objectItem,
        // ── Workflow linkage (Phase 5 → 45-step lifecycle) ──
        annualPlanId: selectedPlanId || undefined,
        annualPlanItemId: selectedItemId || undefined,
      };

      let savedDoc;
      if (isEditMode) {
        const res = await procurementService.update(id, payload);
        savedDoc = res.data?.data || res.data;
        toast.success('Requisition updated successfully');
      } else {
        const res = await procurementService.create(payload);
        savedDoc = res.data?.data || res.data;
        toast.success('Requisition created successfully');
      }

      const docId = savedDoc._id || savedDoc.id;

      if (submitToWorkflow) {
        await procurementService.submit(docId);
        toast.success('Requisition submitted for multi-level approval!');
        navigate('/procurements');
      } else {
        // Stay on page so user can run the budget compliance check before submitting
        setSavedDocId(docId);
        toast.info('Draft saved. Run the budget compliance check, then click "Submit Requisition".');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Operation failed. Please try again.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 bg-white p-3 md:p-4 rounded-3xl border border-slate-200/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-emerald-700 tracking-tight">
            {isEditMode ? 'Edit Requisition' : 'New Requisition'}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsAiModalOpen(true)} className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center space-x-2 border border-slate-700">
            <FaRobot className="text-emerald-400 animate-pulse" />
            <span>AI Assist</span>
          </button>
          <button 
            onClick={() => handleSubmit(false)} 
            disabled={loading} 
            className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin" /> : 'Save Draft'}
          </button>
          <button 
            onClick={() => handleSubmit(true)} 
            disabled={loading} 
            className="px-6 py-2.5 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5 flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin" /> : (
              <>
                <span>Submit Requisition</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── DAPP Linkage & Budget Compliance Panel (Phase 5 — Step 27) ──── */}
        {!isEditMode && (
          <div className="bg-linear-to-br from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                  <FaShieldAlt className="text-emerald-600" size={14} />
                  Step 27: Link to Approved Annual Plan (DAPP) — Budget Compliance Required
                </h2>
                <p className="text-xs text-emerald-600 mt-0.5">Procurement requests must be linked to an approved DAPP item and remain within allocated budget.</p>
              </div>
              {myBudget && (
                <div className="bg-white rounded-xl border border-emerald-200 px-4 py-2 text-right shrink-0">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Dept. Budget Remaining</p>
                  <p className={`text-lg font-bold ${(myBudget.remainingAmount || myBudget.allocatedAmount - myBudget.consumedAmount) > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    LKR {((myBudget.remainingAmount || (myBudget.allocatedAmount - (myBudget.consumedAmount || 0))) || 0).toLocaleString()}
                  </p>
                  <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${myBudget.allocatedAmount > 0 ? Math.min(100, 100 - ((myBudget.consumedAmount || 0) / myBudget.allocatedAmount * 100)) : 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Plan + Item Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Annual Plan (DAPP)</label>
                <select
                  value={selectedPlanId}
                  onChange={e => { setSelectedPlanId(e.target.value); setSelectedItemId(''); setBudgetCheck(null); }}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Select Annual Plan —</option>
                  {annualPlans.map(p => (
                    <option key={p._id} value={p._id}>{p.referenceNumber} · {p.planYear}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">DAPP Item</label>
                <select
                  value={selectedItemId}
                  onChange={e => handleAnnualItemSelect(selectedPlanId, e.target.value)}
                  disabled={!selectedPlanId}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  <option value="">— Select Item —</option>
                  {annualPlans.find(p => p._id === selectedPlanId)?.items?.map(item => (
                    <option key={item._id || item.id} value={item._id || item.id}>
                      {item.description} — LKR {(item.estimatedTotalCost || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto-populated confirmation */}
            {selectedItemId && !budgetCheck && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100 rounded-lg px-3 py-2">
                <FaCheck size={10} /> Form fields auto-populated from DAPP item. Review amounts below, then run the compliance check.
              </div>
            )}

            {/* No approved plans warning */}
            {annualPlans.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                <FaExclamationTriangle size={10} /> No approved annual plans found. Budget must be distributed before raising requisitions (Steps 21–26).
              </div>
            )}

            {/* ── Live Budget Compliance Check Panel ── */}
            {selectedItemId && savedDocId && (
              <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Budget Compliance Check</span>
                  <button
                    type="button"
                    onClick={async () => {
                      setBudgetCheckLoading(true);
                      try {
                        const res = await procurementService.checkBudget(savedDocId);
                        setBudgetCheck(res.data?.data || res.data);
                      } catch {
                        toast.error('Could not run compliance check. Please save draft first.');
                      } finally {
                        setBudgetCheckLoading(false);
                      }
                    }}
                    disabled={budgetCheckLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    {budgetCheckLoading ? <FaSpinner className="animate-spin" size={10} /> : <FaShieldAlt size={10} />}
                    {budgetCheckLoading ? 'Checking…' : 'Run Check'}
                  </button>
                </div>

                {budgetCheck && (
                  <div className="space-y-2">
                    {/* Annual Plan Status row */}
                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                      budgetCheck.annualPlanPassed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        {budgetCheck.annualPlanPassed
                          ? <FaCheckCircle className="text-emerald-500" size={11} />
                          : <FaTimesCircle className="text-red-500" size={11} />}
                        Annual Procurement Plan (DAPP)
                      </span>
                      <span className="font-semibold">
                        {budgetCheck.annualPlanPassed
                          ? `✓ ${budgetCheck.annualPlanRef || 'Approved'}`
                          : budgetCheck.failureReason === 'no_annual_plan_linked' ? 'Not Linked'
                          : budgetCheck.failureReason === 'plan_not_approved' ? `Not Approved (${budgetCheck.annualPlanStatus})`
                          : budgetCheck.failureReason === 'item_not_found' ? 'Item Not Found'
                          : 'Failed'}
                      </span>
                    </div>

                    {/* Budget Sufficiency row */}
                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                      budgetCheck.budgetPassed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : budgetCheck.requiresSpecialApproval ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        {budgetCheck.budgetPassed
                          ? <FaCheckCircle className="text-emerald-500" size={11} />
                          : budgetCheck.requiresSpecialApproval
                            ? <FaExclamationTriangle className="text-amber-500" size={11} />
                            : <FaTimesCircle className="text-red-500" size={11} />}
                        Department Budget
                      </span>
                      <span className="font-semibold">
                        {budgetCheck.budgetPassed
                          ? `✓ LKR ${(budgetCheck.remainingBudget || 0).toLocaleString()} remaining`
                          : budgetCheck.failureReason === 'no_budget_allocated' ? 'No Allocation Found'
                          : `LKR ${(budgetCheck.remainingBudget || 0).toLocaleString()} / Need LKR ${(budgetCheck.requiredBudget || 0).toLocaleString()}`}
                      </span>
                    </div>

                    {/* Special Approval Banner */}
                    {budgetCheck.requiresSpecialApproval && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5">
                        <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" size={12} />
                        <div>
                          <p className="text-xs font-bold text-amber-800">Special Approval Required</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            This request exceeds budget by {budgetCheck.overBudgetPercent}% (within the 10% grace threshold). It will be flagged for special HOD approval.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Hard Fail Banner */}
                    {!budgetCheck.passed && !budgetCheck.requiresSpecialApproval && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2.5">
                        <FaTimesCircle className="text-red-500 mt-0.5 shrink-0" size={12} />
                        <div>
                          <p className="text-xs font-bold text-red-800">Compliance Failed — Cannot Submit</p>
                          <p className="text-[11px] text-red-700 mt-0.5">
                            {budgetCheck.failureReason === 'no_annual_plan_linked' && 'This requisition must be linked to an approved DAPP item.'}
                            {budgetCheck.failureReason === 'plan_not_approved' && `The annual plan is not fully approved (status: ${budgetCheck.annualPlanStatus}). Budget must be distributed before procurement.`}
                            {budgetCheck.failureReason === 'item_not_found' && 'The selected DAPP item does not exist in the linked plan. Re-select a valid item.'}
                            {budgetCheck.failureReason === 'insufficient_budget' && `Requested LKR ${(budgetCheck.requiredBudget || 0).toLocaleString()} exceeds the 10% grace limit over remaining budget of LKR ${(budgetCheck.remainingBudget || 0).toLocaleString()}.`}
                            {budgetCheck.failureReason === 'no_budget_allocated' && 'No budget has been allocated to your department. Contact the Finance Division.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* All Pass Banner */}
                    {budgetCheck.passed && (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2">
                        <FaCheckCircle className="text-emerald-500" size={12} />
                        <p className="text-xs font-bold text-emerald-800">All compliance checks passed — ready to submit</p>
                      </div>
                    )}
                  </div>
                )}

                {!budgetCheck && !budgetCheckLoading && (
                  <p className="text-[11px] text-slate-400">Click "Run Check" to validate DAPP linkage and budget availability before submitting.</p>
                )}
              </div>
            )}

            {/* Prompt user to save draft first to enable check */}
            {selectedItemId && !savedDocId && (
              <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                <FaInfoCircle size={10} /> Save as draft first to enable the budget compliance pre-check.
              </div>
            )}
          </div>
        )}

        {/* Section 1: Identity */}

        <FormSection title="Identification &amp; Multi-Tenant Context" step="1" subtitle="Procurement reference, requesting unit, and officer identification">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Procurement Reference Number" hint="Auto-generated. Format: UWU/[Category]/[Method]/YYYY/NNN">
              <TextInput value={form.refNo} readOnly />
            </FormField>
            <FormField label="Originating Faculty / Department" required error={errors.faculty}>
              <SelectInput value={form.faculty} onChange={set('faculty')} options={FACULTIES} placeholder="Select faculty or unit (Tenant)..." />
            </FormField>
            <FormField label="Contract Title" required error={errors.contractTitle}>
              <TextInput value={form.contractTitle} onChange={set('contractTitle')} placeholder='e.g. "Supply of Laboratory Spectrophotometers for Faculty of Applied Sciences"' />
            </FormField>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Requisitioning Officer (Auto-populated from session)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Full Name">
                <TextInput value={form.officerName} readOnly />
              </FormField>
              <FormField label="Designation">
                <TextInput value={form.officerDesignation} readOnly />
              </FormField>
              <FormField label="Employee ID">
                <TextInput value={form.officerEmpId} readOnly />
              </FormField>
            </div>
          </div>
        </FormSection>

        {/* Section 2: Financial */}
        <FormSection title="Strategic Planning &amp; Budget Linkage" step="2" subtitle="DAPP/MPP linkage, funding source, and cost estimates (Section 4.1.3)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="DAPP Line Item Linkage" required error={errors.dappItem} hint="Per Section 4.1.3: No procurement without an approved DAPP linkage">
              <TextInput value={form.dappItem} onChange={set('dappItem')} placeholder="Search DAPP approved items..." />
            </FormField>
            <FormField label="Master Procurement Plan (MPP) Ref" hint="Read-only reference to the 3-year Master Plan item">
              <TextInput value={form.mppRef} readOnly />
            </FormField>
            <FormField label="Source of Funding" required error={errors.fundingSource} hint="Determines authority limits per Section 2.9">
              <SelectInput value={form.fundingSource} onChange={set('fundingSource')} options={FUNDING} placeholder="Select funding source..." />
            </FormField>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Vote Particulars (Budget Codes)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Program Code">
                <TextInput value={form.programCode} onChange={set('programCode')} placeholder="e.g. 200" />
              </FormField>
              <FormField label="Project Code">
                <TextInput value={form.projectCode} onChange={set('projectCode')} placeholder="e.g. 2001" />
              </FormField>
              <FormField label="Object Item">
                <TextInput value={form.objectItem} onChange={set('objectItem')} placeholder="e.g. 2103" />
              </FormField>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Total Cost Estimate</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Base Amount (LKR)" required error={errors.baseAmount}>
                <TextInput type="number" value={form.baseAmount} onChange={set('baseAmount')} placeholder="0.00" />
              </FormField>
              <FormField label="Provisional Sums (LKR)" hint="For unforeseen works">
                <TextInput type="number" value={form.provisionalSums} onChange={set('provisionalSums')} placeholder="0.00" />
              </FormField>
              <FormField label="Contingencies (LKR)" hint="Max 10% of base" error={contExceeded ? 'Exceeds 10% cap' : ''}>
                <TextInput type="number" value={form.contingencies} onChange={set('contingencies')} placeholder="0.00" />
              </FormField>
              <FormField label="VAT Amount (LKR)" hint="Auto-calculated (18%), editable">
                <TextInput type="number" value={form.vatAmount === '' ? vatNum.toFixed(2) : form.vatAmount} onChange={set('vatAmount')} placeholder="0.00" />
              </FormField>
            </div>
            <div className="mt-6 flex items-center justify-between bg-linear-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-100/50 rounded-2xl px-6 py-5 shadow-sm">
              <span className="text-sm font-extrabold text-slate-700 tracking-wide uppercase">Total Cost Estimate</span>
              <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">LKR {tce.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </FormSection>

        {/* Section 3: Technical Specs */}
        <FormSection title="Technical Specifications" step="3" subtitle="Procurement category, descriptions, and AI-assisted specification review">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Procurement Category" required error={errors.category}>
              <SelectInput value={form.category} onChange={set('category')} options={CATEGORIES} placeholder="Select category..." />
            </FormField>
          </div>
          <FormField label="Detailed Technical Description" required>
            <TextArea value={form.techDescription} onChange={handleTechDescChange} rows={5} placeholder="Enter full technical specifications. The AI will scan for brand names..." />
          </FormField>
          {aiWarning && (
            <div className="flex items-start space-x-4 bg-linear-to-r from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl px-5 py-4 shadow-sm">
              <div className="bg-amber-100/80 p-2 rounded-xl shrink-0">
                <FaRobot className="text-amber-600" size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">AI Specification Review</p>
                <p className="text-[13px] font-medium text-amber-700/90 mt-1 leading-relaxed">{aiWarning}</p>
              </div>
            </div>
          )}
          <FormField label="Drawings, Plans &amp; Supporting Documents" hint="Accepted: PDF, DOCX, XLSX only. Files are malware-scanned on upload.">
            <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-8 text-center hover:bg-slate-50 hover:border-emerald-300 transition-all cursor-pointer relative group">
              <input type="file" multiple accept=".pdf,.docx,.xlsx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="w-12 h-12 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FaUpload className="text-emerald-500" size={20} />
              </div>
              <p className="text-sm font-medium text-slate-600">Drag & drop files here, or <span className="text-emerald-600 font-bold">browse</span></p>
              <p className="text-[11px] text-slate-400 mt-1.5">Maximum file size: 50MB</p>
            </div>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px] uppercase">
                        {f.name.split('.').pop()}
                      </div>
                      <span className="font-semibold text-slate-700 truncate max-w-xs">{f.name}</span>
                    </div>
                    <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors font-medium">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </FormField>
          <FormField label="Bill of Quantities (BOQ) / Activity Schedule">
            <BOQTable items={boqItems} setItems={setBoqItems} />
          </FormField>
          {aiPriceRecommendation && (
            <div className="mt-5 border border-emerald-500/20 bg-slate-900 rounded-3xl p-6 relative overflow-hidden text-slate-100 shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center space-x-2.5 mb-4 border-b border-slate-800 pb-3">
                <FaRobot className="text-emerald-400 text-lg animate-pulse" />
                <h4 className="text-[15px] font-bold text-slate-100 uppercase tracking-wider">Gemini Price Intelligence</h4>
                <span className="ml-auto bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                  Active Intelligence
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recommended Price Band</span>
                  <div className="mt-1 flex items-baseline space-x-1">
                    <span className="text-lg font-extrabold text-emerald-450">
                      LKR {aiPriceRecommendation.overallTCE?.lowEstimate?.toLocaleString('en-LK') || '0'}
                    </span>
                    <span className="text-slate-500 text-xs px-1">-</span>
                    <span className="text-lg font-extrabold text-emerald-455">
                      LKR {aiPriceRecommendation.overallTCE?.highEstimate?.toLocaleString('en-LK') || '0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                    Target Fair Value: LKR {aiPriceRecommendation.overallTCE?.midEstimate?.toLocaleString('en-LK') || '0'} (Mid Estimate)
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Historical Comparison</span>
                  <div className="mt-1 flex items-baseline space-x-1.5">
                    <span className="text-base font-extrabold text-slate-200">
                      {aiPriceRecommendation.historicalComparison?.avgHistoricalPrice 
                        ? `LKR ${aiPriceRecommendation.historicalComparison.avgHistoricalPrice.toLocaleString('en-LK')}`
                        : 'No historical match'}
                    </span>
                    {aiPriceRecommendation.historicalComparison?.priceChangePercent && (
                      <span className={`text-xs font-bold ${aiPriceRecommendation.historicalComparison.priceChangePercent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        ({aiPriceRecommendation.historicalComparison.priceChangePercent > 0 ? '+' : ''}{aiPriceRecommendation.historicalComparison.priceChangePercent}%)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                    Trend: <span className="capitalize text-slate-200">{aiPriceRecommendation.historicalComparison?.trend?.replace('_', ' ') || 'Stable'}</span>
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Model Confidence</span>
                  <div className="mt-1.5 flex items-center space-x-2">
                    <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          aiPriceRecommendation.priceBands?.[0]?.confidence === 'high' ? 'bg-emerald-400 w-full' :
                          aiPriceRecommendation.priceBands?.[0]?.confidence === 'medium' ? 'bg-amber-400 w-2/3' :
                          'bg-red-400 w-1/3'
                        }`}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-300 capitalize shrink-0">
                      {aiPriceRecommendation.priceBands?.[0]?.confidence || 'Medium'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-semibold truncate">
                    Market status: {aiPriceRecommendation.marketConditions || 'Normal'}
                  </p>
                </div>
              </div>

              {aiPriceRecommendation.recommendations && aiPriceRecommendation.recommendations.length > 0 && (
                <div className="mt-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Pricing Intelligence Guidance</span>
                  <ul className="space-y-1.5">
                    {aiPriceRecommendation.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2 leading-relaxed">
                        <span className="text-emerald-400 mt-0.5 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Explainability Log */}
              {aiPriceRecommendation.explainabilityLog && (
                <div className="mt-4 border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-550">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-400">Model Version:</span>
                    <span>{aiPriceRecommendation.explainabilityLog.model}</span>
                    <span className="text-slate-700">|</span>
                    <span className="font-bold text-slate-400">Processing Time:</span>
                    <span>{aiPriceRecommendation.explainabilityLog.processingTimeMs}ms</span>
                  </div>
                  <div className="mt-1 sm:mt-0 flex items-center space-x-1.5">
                    <span className="font-bold text-slate-400">Weights Applied:</span>
                    <span>Market {aiPriceRecommendation.explainabilityLog.weightsApplied?.marketData * 100}%, Hist {aiPriceRecommendation.explainabilityLog.weightsApplied?.historicalData * 100}%</span>
                  </div>
                </div>
              )}

              {/* Human in the loop warning */}
              <div className="mt-4 border-t border-slate-800/60 pt-3 flex items-center space-x-2 text-[11px] text-amber-400 bg-amber-500/5 rounded-xl px-3.5 py-2.5">
                <FaInfoCircle className="shrink-0 text-amber-500" />
                <span className="font-semibold leading-normal">
                  Human-in-the-Loop Governance Notice: Pricing recommendations are generated by Gemini. Final decisions require Departmental/Ministry Procurement Committee approval.
                </span>
              </div>
            </div>
          )}
        </FormSection>

        {/* Section 4: Method & Authority */}
        <FormSection title="Procurement Method &amp; Timeline" step="4" subtitle="Method selection, slicing, committee routing, and time schedule (Section 3.1)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Intended Procurement Method" required error={errors.method}>
              <SelectInput value={form.method} onChange={set('method')} options={METHODS} placeholder="Select method..." />
            </FormField>
            <FormField label="Slicing &amp; Packaging" hint="Slice into lots to encourage local SME participation in Uva Province">
              <SelectInput value={form.slicing} onChange={set('slicing')} options={SLICING_OPTIONS} />
            </FormField>
          </div>
          {needsJustification && (
            <FormField label="Justification for Selection of Method" required error={errors.methodJustification} hint="Mandatory when not using Open Competitive bidding (Section 3.1)">
              <TextArea value={form.methodJustification} onChange={set('methodJustification')} rows={3} placeholder="Provide detailed justification for choosing this method..." />
            </FormField>
          )}
          <FormField label="Threshold Routing (Committee)" hint="Auto-calculated: RPC ≤50M | DPC ≤400M | MPC ≤750M | CAPC >750M">
            <div className="px-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[13px] text-slate-700 font-bold shadow-sm inline-flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{committee}</span>
            </div>
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FormField label="Expected Date of Invitation">
              <div className="relative">
                <TextInput type="date" value={form.invitationDate} onChange={set('invitationDate')} />
                <FaCalendarAlt className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={13} />
              </div>
            </FormField>
            <FormField label="Bid Closing Deadline">
              <TextInput type="datetime-local" value={form.bidClosingDate} onChange={set('bidClosingDate')} />
            </FormField>
            <FormField label="Intended Completion / Delivery Date">
              <div className="relative">
                <TextInput type="date" value={form.deliveryDate} onChange={set('deliveryDate')} />
                <FaCalendarAlt className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={13} />
              </div>
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Final Destination" hint="Specific delivery point within UWU">
              <TextInput value={form.deliveryLocation} onChange={set('deliveryLocation')} />
            </FormField>
            <FormField label="Priority Status">
              <SelectInput value={form.priority} onChange={set('priority')} options={PRIORITIES} />
            </FormField>
          </div>
        </FormSection>

        {/* Section 5 (Timeline) is now merged into Section 4 above */}

        {/* Section 5: Ethics, Compliance & Security */}
        <FormSection title="Ethics, Compliance &amp; Security" step="5" subtitle="Mandatory declarations per Section 1.5.4, Anti-Corruption Act, and Electronic Transactions Act">
          <div className="space-y-4">
            <div className={`flex items-start space-x-3 p-5 rounded-xl border transition-colors ${errors.conflictDeclared ? 'border-red-300 bg-red-50/50' : 'border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-sm'}`}>
              <div className="pt-0.5">
                <input type="checkbox" checked={form.conflictDeclared} onChange={set('conflictDeclared')} className="w-5 h-5 accent-emerald-600 rounded text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer" id="conflict" />
              </div>
              <label htmlFor="conflict" className="text-[13px] text-slate-600 cursor-pointer leading-relaxed select-none">
                <span className="font-bold text-slate-800">Conflict of Interest Declaration:</span> I hereby declare that I have no personal, financial, or family interest in any potential bidder for this procurement.
                {errors.conflictDeclared && <span className="block text-xs font-bold text-red-500 mt-1.5">{errors.conflictDeclared}</span>}
              </label>
            </div>
            <div className={`flex items-start space-x-3 p-5 rounded-xl border transition-colors ${errors.ethicsDeclared ? 'border-red-300 bg-red-50/50' : 'border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-sm'}`}>
              <div className="pt-0.5">
                <input type="checkbox" checked={form.ethicsDeclared} onChange={set('ethicsDeclared')} className="w-5 h-5 accent-emerald-600 rounded text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer" id="ethics" />
              </div>
              <label htmlFor="ethics" className="text-[13px] text-slate-600 cursor-pointer leading-relaxed select-none">
                <span className="font-bold text-slate-800">Ethics &amp; Integrity Affirmation:</span> I agree to abide by the Anti-Corruption Act No. 09 of 2023 and the National Procurement Guidelines.
                {errors.ethicsDeclared && <span className="block text-xs font-bold text-red-500 mt-1.5">{errors.ethicsDeclared}</span>}
              </label>
            </div>
          </div>

        </FormSection>

        {/* Budget Guard Warning */}
        {tce > 0 && (
          <div className="flex items-start space-x-4 bg-linear-to-r from-blue-50 to-indigo-50/50 border border-blue-200/60 rounded-2xl px-6 py-5 shadow-sm">
            <div className="bg-blue-100/80 p-2.5 rounded-xl shrink-0 mt-0.5">
              <FaExclamationTriangle className="text-blue-600" size={18} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-blue-900 tracking-tight">System Validation Logic (Budget Guard)</p>
              <p className="text-[13px] font-medium text-blue-800/80 mt-1.5 leading-relaxed">On submission, the system will verify: (1) TCE ≤ DAPP Remaining Balance — otherwise error: "Insufficient Budget in Annual Plan", (2) Threshold routing matches your role's financial delegation, (3) No duplicate requisition with the same Title and Vote Code exists in FY {new Date().getFullYear()}.</p>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-6 pb-12 border-t border-slate-200/80">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => handleSubmit(false)} 
              disabled={loading} 
              className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin" /> : 'Save as Draft'}
            </button>
            <button 
              onClick={() => handleSubmit(true)} 
              disabled={loading} 
              className="px-8 py-3 bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[14px] font-bold hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <span>Submit Requisition</span>}
            </button>
          </div>
        </div>
      </div>
      {/* AI Requisition Assistant Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-emerald-500/20 p-2 rounded-xl">
                  <FaRobot className="text-emerald-400 animate-bounce" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-100 tracking-wide uppercase">AI Requisition Assistant</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Powered by Google Gemini price intelligence</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsAiModalOpen(false);
                  setAiResult(null);
                  setAiPriceRecommendation(null);
                  setAiError('');
                }} 
                className="text-slate-450 hover:text-slate-200 hover:bg-slate-800/60 p-2 rounded-xl transition-all"
              >
                <span className="text-lg font-bold">×</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!aiResult ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wide">Describe your procurement requirement</label>
                    <textarea 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={5}
                      placeholder='e.g., "I need 20 laptops, HP or Dell brand, with 16GB RAM and 512GB SSD, estimated price 250,000 LKR each, for the computer science lab. We also need 5 heavy-duty laser printers for the Dean office. Funding is GOSL treasury."'
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 placeholder-slate-500 leading-relaxed"
                    />
                  </div>
                  {aiError && (
                    <p className="text-xs font-semibold text-red-400 flex items-center space-x-1.5">
                      <span>⚠️</span>
                      <span>{aiError}</span>
                    </p>
                  )}
                  <button 
                    onClick={handleAiAssist}
                    disabled={aiLoading}
                    className="w-full py-3.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-2xl text-[14px] font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2.5"
                  >
                    {aiLoading ? (
                      <>
                        <FaSpinner className="animate-spin text-white" size={16} />
                        <span>AI is parsing specs and running pricing models...</span>
                      </>
                    ) : (
                      <>
                        <FaRobot size={16} />
                        <span>Run Gemini AI Specifications & Pricing Analysis</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start space-x-3">
                    <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl shrink-0">
                      <FaCheckCircle size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-400">Gemini Parsing Complete!</p>
                      <p className="text-xs text-slate-300 mt-1 leading-normal">
                        Gemini has successfully extracted specifications, identified cost thresholds, and performed market analysis.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-950 border border-slate-800/80 rounded-2xl p-4.5 text-xs text-slate-300">
                    <div>
                      <span className="font-bold text-slate-500 uppercase block mb-1">Suggested Requisition Title</span>
                      <p className="font-bold text-slate-200 text-sm">{aiResult.suggestedTitle || 'Requisition Title'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-bold text-slate-500 uppercase block mb-1">Category</span>
                        <p className="font-semibold text-slate-200">{aiResult.overallCategory || 'Goods'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 uppercase block mb-1">Recommended Method</span>
                        <p className="font-semibold text-emerald-400">{aiResult.recommendedMethod || 'NCB'}</p>
                      </div>
                    </div>

                    {aiResult.identifiedSpecs && aiResult.identifiedSpecs.length > 0 && (
                      <div>
                        <span className="font-bold text-slate-500 uppercase block mb-1">Identified Specifications</span>
                        <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-300">
                          {aiResult.identifiedSpecs.map((spec, i) => (
                            <li key={i}>{spec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiResult.items && aiResult.items.length > 0 && (
                      <div>
                        <span className="font-bold text-slate-500 uppercase block mb-1">Extracted Line Items ({aiResult.items.length})</span>
                        <div className="mt-2 border border-slate-800 rounded-xl overflow-hidden">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-850">
                                <th className="px-3 py-1.5">Item</th>
                                <th className="px-3 py-1.5 w-12 text-right">Qty</th>
                                <th className="px-3 py-1.5 w-24 text-right">Est. Unit Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiResult.items.map((item, i) => (
                                <tr key={i} className="border-t border-slate-850">
                                  <td className="px-3 py-1.5 truncate max-w-xs">{item.description}</td>
                                  <td className="px-3 py-1.5 text-right font-semibold text-slate-200">{item.quantity || 1}</td>
                                  <td className="px-3 py-1.5 text-right font-semibold text-emerald-400">
                                    {item.estimatedUnitPrice ? `LKR ${item.estimatedUnitPrice.toLocaleString()}` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button 
                      onClick={() => {
                        setAiResult(null);
                        setAiPriceRecommendation(null);
                      }} 
                      className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-750 transition-all"
                    >
                      Analyze Another Text
                    </button>
                    <button 
                      onClick={applyAiAssist} 
                      className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold hover:shadow-md transition-all flex items-center justify-center space-x-1.5"
                    >
                      <FaCheck size={12} />
                      <span>Apply & Populate Form</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
