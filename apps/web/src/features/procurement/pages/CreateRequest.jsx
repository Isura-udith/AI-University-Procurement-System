import { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaExclamationTriangle, FaUpload, FaRobot, FaCalendarAlt, FaSpinner, FaCheckCircle, FaInfoCircle, FaCheck, FaTimesCircle, FaShieldAlt, FaSearch, FaPlus, FaTrash, FaClipboardList, FaStar, FaLightbulb, FaArrowUp, FaArrowDown, FaMagic, FaSyncAlt, FaCompressAlt, FaExpandAlt } from 'react-icons/fa';
import aiService from '../../../services/ai.service';
import procurementService from '../../../services/procurement.service';
import planningService from '../../../services/planning.service';
import FormSection from '../components/FormSection';
import FormField, { TextInput, SelectInput, TextArea } from '../components/FormField';
import BOQTable from '../components/BOQTable';



const BRAND_KEYWORDS = [
  'apple', 'macbook', 'ipad', 'iphone',
  'dell', 'latitude', 'optiplex', 'alienware',
  'hp', 'hewlett', 'packard', 'probook', 'elitebook', 'laserjet',
  'lenovo', 'thinkpad', 'thinkcentre', 'ideapad',
  'asus', 'acer', 'msi', 'toshiba',
  'cisco', 'catalyst', 'aruba', 'fortinet',
  'samsung', 'sony', 'lg', 'panasonic',
  'canon', 'epson', 'brother', 'xerox',
  'microsoft', 'surface',
  'intel', 'core i3', 'core i5', 'core i7', 'core i9', 'amd', 'ryzen',
  'toyota', 'nissan', 'mitsubishi', 'honda',
  'bosch', 'philips', 'zebra', 'dahua', 'hikvision'
];


const FACULTY_MAP = {
  fom: 'Faculty of Medicine',
  fots: 'Faculty of Technological Studies',
  foas: 'Faculty of Applied Sciences',
  foahs: 'Faculty of Animal Science & Export Agriculture',
  'fom-mgt': 'Faculty of Management',
  supplies: 'Supplies Division',
  works: 'Works Division',
  'vc-office': "Vice Chancellor's Office",
  'admin-building': 'Administration Building',
  'exam-division': 'Examination Division',
  'student-affairs': 'Student Affairs Division',
  library: 'Library',
  'main-canteen': 'Main Canteen (Samajaya)',
  'gallery-canteen': 'Gallery Canteen',
  'g-canteen': 'G Canteen',
  'sports-unit': 'Sports & Physical Education Unit',
  hostels: 'Hostels',
  'security-unit': 'Security Unit',
};

// Map from faculty dropdown code → DAPP item department/faculty field names
// Some DAPP data uses shorter names (e.g. "Medicine" not "Faculty of Medicine")
const FACULTY_TO_DAPP_NAMES = {
  fom: ['Medicine', 'Faculty of Medicine'],
  fots: ['Technological Studies', 'Faculty of Technological Studies'],
  foas: ['Applied Sciences', 'Faculty of Applied Sciences'],
  foahs: ['Animal Science', 'Animal Science & Export Agriculture', 'Faculty of Animal Science & Export Agriculture'],
  'fom-mgt': ['Management', 'Faculty of Management'],
  supplies: ['Supplies Division'],
  works: ['Works Division'],
  'vc-office': ['Vice Chancellor Office', "Vice Chancellor's Office"],
  'admin-building': ['Admin Building', 'Administration Building'],
  'exam-division': ['Exam Division', 'Examination Division'],
  'student-affairs': ['Student Affairs', 'Student Affairs Division'],
  library: ['Library'],
  'main-canteen': ['Main Canteen', 'Main Canteen (Samajaya)'],
  'gallery-canteen': ['Gallery Canteen'],
  'g-canteen': ['G Canteen'],
  'sports-unit': ['Sports Unit', 'Sports & Physical Education Unit'],
  hostels: ['Hostels'],
  'security-unit': ['Security Unit'],
};

/** Resolve logged-in user's department/faculty to FACULTIES dropdown option key */
const getUserFacultyKey = (user) => {
  if (!user) return '';
  const dept = user.faculty || user.department || '';
  if (!dept) return '';

  const cleanDept = dept.toLowerCase().trim();

  for (const [key, names] of Object.entries(FACULTY_TO_DAPP_NAMES)) {
    if (names.some(n => n.toLowerCase() === cleanDept)) return key;
  }
  for (const [key, label] of Object.entries(FACULTY_MAP)) {
    if (label.toLowerCase() === cleanDept) return key;
  }
  for (const [key, label] of Object.entries(FACULTY_MAP)) {
    const cleanLabel = label.toLowerCase();
    if (cleanLabel.includes(cleanDept) || cleanDept.includes(cleanLabel)) {
      return key;
    }
  }
  return '';
};

// Roles that can select and add procurement for any originating faculty/department (System, Executive, Bursar, Procurement Officer)
const TOP_OFFICER_ROLES = new Set([
  'super_admin', 'admin',
  'vc', 'dean',
  'bursar', 'finance_officer', 'finance_committee',
  'procurement_officer', 'procurement_committee',
]);

const FACULTIES = [
  // Faculties
  { value: 'fom', label: 'Faculty of Medicine' },
  { value: 'fots', label: 'Faculty of Technological Studies' },
  { value: 'foas', label: 'Faculty of Applied Sciences' },
  { value: 'foahs', label: 'Faculty of Animal Science & Export Agriculture' },
  { value: 'fom-mgt', label: 'Faculty of Management' },
  // Administrative & Central Divisions
  { value: 'vc-office', label: "Vice Chancellor's Office" },
  { value: 'admin-building', label: 'Administration Building' },
  { value: 'supplies', label: 'Supplies Division' },
  { value: 'works', label: 'Works Division' },
  { value: 'exam-division', label: 'Examination Division' },
  { value: 'student-affairs', label: 'Student Affairs Division' },
  // University Common Sections
  { value: 'library', label: 'Library' },
  { value: 'main-canteen', label: 'Main Canteen (Samajaya)' },
  { value: 'gallery-canteen', label: 'Gallery Canteen' },
  { value: 'g-canteen', label: 'G Canteen' },
  { value: 'sports-unit', label: 'Sports & Physical Education Unit' },
  { value: 'hostels', label: 'Hostels' },
  { value: 'security-unit', label: 'Security Unit' },
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

const getItemBudgetYear = (item) => {
  if (!item) return '';
  if (item.year && Number(item.year) >= 2000) return item.year;
  if (item.plannedYear) {
    if (Number(item.plannedYear) >= 2000) return item.plannedYear;
    const startYr = Number(item.planYear) || new Date().getFullYear();
    return startYr + (Number(item.plannedYear) - 1);
  }
  if (item.planYear) return item.planYear;
  return new Date().getFullYear();
};

const currentYear = new Date().getFullYear();
const genRef = `UWU/G/NCB/${currentYear}/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

export default function CreateRequest() {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const userFacultyKey = useMemo(() => getUserFacultyKey(user), [user]);

  // AI Assist States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiPriceRecommendation, setAiPriceRecommendation] = useState(null);
  const [aiError, setAiError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(() => ({
    refNo: genRef,
    faculty: !isEditMode ? userFacultyKey : '',
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
  }));
  const [boqItems, setBoqItems] = useState([{ description: '', specifications: '', unit: '', qty: '', unitPrice: '' }]);
  const [techSpecs, setTechSpecs] = useState([]);
  const [specFilter, setSpecFilter] = useState('all');
  const [isSpecsCollapsed, setIsSpecsCollapsed] = useState(false);
  const [files, setFiles] = useState([]);
  const [aiWarning, setAiWarning] = useState('');
  const [errors, setErrors] = useState({});

  // ── Annual Plan / Budget State (Phase 5 workflow) ─────────────
  // ── Final Master Plan / Annual Plan / Budget State ─────────────
  const [approvedFinalPlanItems, setApprovedFinalPlanItems] = useState([]);
  const [annualPlans, setAnnualPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [dappSearch, setDappSearch] = useState('');
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

  // Pre-fill user's department/faculty if loaded after initial mount and not set yet (avoiding useEffect cascading renders)
  const [prevUserFacultyKey, setPrevUserFacultyKey] = useState(userFacultyKey);
  if (!isEditMode && userFacultyKey !== prevUserFacultyKey) {
    setPrevUserFacultyKey(userFacultyKey);
    if (!form.faculty && userFacultyKey) {
      setForm((prev) => ({ ...prev, faculty: userFacultyKey }));
    }
  }

  // Load approved Final Master Plan items, annual plans, and department budget on mount
  useEffect(() => {
    if (!isEditMode) {
      Promise.allSettled([
        planningService.getApprovedFinalPlanItems(),
        planningService.getAnnualPlans({ status: 'distribution_complete' }),
        planningService.getMyBudget(),
      ]).then(([fmpRes, planRes, budgetRes]) => {
        if (fmpRes.status === 'fulfilled') {
          const items = fmpRes.value.data?.data || fmpRes.value.data || [];
          setApprovedFinalPlanItems(Array.isArray(items) ? items : []);
        }
        if (planRes.status === 'fulfilled') {
          const plans = planRes.value.data?.data || planRes.value.data || [];
          const planList = Array.isArray(plans) ? plans : [];
          setAnnualPlans(planList);
          if (planList.length > 0) {
            setSelectedPlanId(planList[0]._id || planList[0].id);
          }
        }
        if (budgetRes.status === 'fulfilled') {
          setMyBudget(budgetRes.value.data?.data || budgetRes.value.data || null);
        }
      });
    }
  }, [isEditMode]);

  // Re-fetch budget whenever originating faculty changes
  useEffect(() => {
    if (!isEditMode && form.faculty) {
      planningService.getMyBudget({ faculty: form.faculty, department: form.faculty })
        .then(res => {
          const bData = res.data?.data || res.data || null;
          if (bData) setMyBudget(bData);
        })
        .catch(() => {});
    }
  }, [isEditMode, form.faculty]);

  // Auto-populate form when an approved Final Master Plan item is selected
  const handleFinalPlanItemSelect = (itemId) => {
    setSelectedItemId(itemId);
    setBudgetCheck(null);
    if (!itemId) {
      setSelectedPlanId('');
      setForm(f => ({ ...f, dappItem: '' }));
      return;
    }
    const item = approvedFinalPlanItems.find(i => (i._id || i.id) === itemId);
    if (!item) return;

    if (item.planId) {
      setSelectedPlanId(item.planId);
    }

    // Auto-populate key fields from approved Final Master Plan item
    setForm(f => ({
      ...f,
      contractTitle: item.description || f.contractTitle,
      dappItem: item._id || itemId,
      fmpItemId: item._id || itemId,
      mppRef: item.planRef || f.mppRef,
      category: item.category === 'Works' ? 'works' : item.category === 'Services' ? 'non-consulting' : 'goods',
      faculty: Object.keys(FACULTY_MAP).find(k => FACULTY_MAP[k] === item.faculty) || f.faculty,
      baseAmount: item.estimatedTotalCost ? String(item.estimatedTotalCost) : f.baseAmount,
    }));

    if (item.description && item.estimatedTotalCost) {
      setBoqItems([{
        description: item.description,
        unit: item.unit || 'Units',
        qty: String(item.estimatedQuantity || 1),
        unitPrice: String(item.estimatedUnitCost || item.estimatedTotalCost || ''),
      }]);
    }
  };

  // Fallback for Annual Plan item selection
  const handleAnnualItemSelect = (planId, itemId) => {
    setSelectedPlanId(planId);
    setSelectedItemId(itemId);
    setBudgetCheck(null); // Reset compliance check when item changes
    if (!planId || !itemId) {
      setForm(f => ({
        ...f,
        dappItem: '',
      }));
      return;
    }
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
          // API response shape: { success, message, data: <procurement> }
          const reqData = res.data?.data || res.data;

          // Reverse-map faculty label back to code
          const mappedFaculty = Object.keys(FACULTY_MAP).find(key => FACULTY_MAP[key] === reqData.faculty) || '';

          // Map category to frontend value
          let mappedCategory = 'goods';
          if (reqData.category === 'Works') mappedCategory = 'works';
          else if (reqData.category === 'Services' || reqData.category === 'Consulting') mappedCategory = 'non-consulting';

          // Map method to frontend value
          let mappedMethod = 'ncb';
          const methodUpper = (reqData.procurementMethod || '').toUpperCase();
          if (methodUpper === 'ICB') mappedMethod = 'icb';
          else if (methodUpper === 'SHOPPING') mappedMethod = 'shopping';
          else if (methodUpper === 'DIRECT') mappedMethod = 'direct';

          // Map priority to frontend value
          let mappedPriority = 'normal';
          if (reqData.priority === 'urgent' || reqData.priority === 'high') mappedPriority = 'urgent';
          else if (reqData.priority === 'low') mappedPriority = 'normal';
          else if (reqData.priority === 'medium') mappedPriority = 'normal';

          // Compute base amount from items
          const computedBaseAmount = reqData.items && reqData.items.length > 0
            ? String(reqData.items.reduce((sum, item) => sum + (item.estimatedTotalPrice || (item.quantity * item.estimatedUnitPrice) || 0), 0))
            : String(reqData.totalEstimatedCost || '');

          setForm({
            refNo: reqData.referenceNumber || '',
            faculty: mappedFaculty,
            officerName: reqData.requestedBy
              ? `${reqData.requestedBy.firstName} ${reqData.requestedBy.lastName}`
              : (reqData.officer || (user ? `${user.firstName} ${user.lastName}` : '')),
            officerDesignation: reqData.requestedBy?.jobTitle || reqData.designation || user?.jobTitle || '',
            officerEmpId: reqData.requestedBy?.employeeId || reqData.empId || user?.employeeId || '',
            contractTitle: reqData.title || '',
            dappItem: reqData.dappReference || '',
            mppRef: reqData.mppReference || `MPP/${currentYear}-${currentYear + 2}/REF-001`,
            fundingSource: reqData.fundingSource || '',
            programCode: reqData.programCode || '',
            projectCode: reqData.projectCode || '',
            objectItem: reqData.objectItem || '',
            baseAmount: computedBaseAmount,
            provisionalSums: reqData.provisionalSums != null ? String(reqData.provisionalSums) : '',
            contingencies: reqData.contingencies != null ? String(reqData.contingencies) : '',
            vatAmount: reqData.vatAmount != null ? String(reqData.vatAmount) : '',
            category: mappedCategory,
            techDescription: reqData.description || '',
            method: mappedMethod,
            methodJustification: reqData.justification || '',
            slicing: reqData.slicing || 'no',
            invitationDate: reqData.invitationDate ? reqData.invitationDate.split('T')[0] : '',
            bidClosingDate: reqData.bidClosingDate ? reqData.bidClosingDate.substring(0, 16) : '',
            deliveryDate: reqData.deliveryDate ? reqData.deliveryDate.split('T')[0] : '',
            deliveryLocation: reqData.deliveryLocation || 'UWU Supplies Division, Passara Road, Badulla',
            priority: mappedPriority,
            conflictDeclared: true,
            ethicsDeclared: true,
          });

          if (reqData.items && reqData.items.length > 0) {
            setBoqItems(reqData.items.map(it => ({
              description: it.description || '',
              specifications: it.specifications || '',
              unit: it.unit || 'nos',
              qty: String(it.quantity || 1),
              unitPrice: String(it.estimatedUnitPrice || 0)
            })));
          }
          // Load technical specifications for editing
          if (reqData.technicalSpecifications && reqData.technicalSpecifications.length > 0) {
            setTechSpecs(reqData.technicalSpecifications.map(s => ({
              title: s.title || '',
              description: s.description || '',
              isMandatory: s.isMandatory !== false,
              priority: s.priority || 'required',
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
  }, [id, isEditMode, user]);

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

    if (aiResult.identifiedSpecs && aiResult.identifiedSpecs.length > 0) {
      const generatedTechSpecs = aiResult.identifiedSpecs.map((specStr) => {
        const parts = specStr.split(':');
        const title = parts.length > 1 ? parts[0].trim() : specStr.trim();
        const description = parts.length > 1 ? parts.slice(1).join(':').trim() : specStr.trim();
        return {
          title,
          description: description || title,
          isMandatory: true,
          priority: 'required',
        };
      });
      setTechSpecs(generatedTechSpecs);
      scanTechSpecsBrands(generatedTechSpecs);
    }

    setIsAiModalOpen(false);
  };

  // Expanded NPA brand-neutrality scanner
  const scanTechSpecsBrands = (specs) => {
    const allText = specs.map(s => `${s.title} ${s.description}`).join(' ').toLowerCase();
    const found = BRAND_KEYWORDS.filter(b => allText.includes(b.toLowerCase()));
    if (found.length > 0) {
      const uniqueFound = Array.from(new Set(found));
      setAiWarning(`NPA Compliance Alert: Proprietary brand phrase(s) detected — "${uniqueFound.slice(0, 5).join('", "')}". Government procurement guidelines require brand-neutral technical specifications (e.g. use "15.6-inch IPS Laptop" instead of "Dell Latitude").`);
      return false;
    } else {
      setAiWarning('');
      return true;
    }
  };

  // Section 3 Action: Extract specifications from BOQ table
  const handleSyncFromBOQ = () => {
    const validBoq = boqItems.filter(item => item.description?.trim());
    if (validBoq.length === 0) {
      toast.warn('Please enter at least one BOQ item description first.');
      return;
    }
    const syncedSpecs = validBoq.map(item => ({
      title: item.description.trim(),
      description: item.specifications?.trim() || `Technical compliance requirement for supply of ${item.description.trim()} (${item.qty || '1'} ${item.unit || 'nos'})`,
      isMandatory: true,
      priority: 'required',
    }));
    setTechSpecs(prev => {
      const merged = [...prev, ...syncedSpecs];
      scanTechSpecsBrands(merged);
      return merged;
    });
    toast.success(`Extracted ${syncedSpecs.length} requirement(s) from BOQ schedule.`);
  };

  // Section 3 Action: Re-order items (move up/down)
  const handleMoveSpec = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= techSpecs.length) return;
    const updated = [...techSpecs];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);
    setTechSpecs(updated);
  };

  // Section 3 Action: Clear all specs
  const handleClearAllSpecs = () => {
    if (techSpecs.length === 0) return;
    if (window.confirm('Are you sure you want to clear all technical specification requirements?')) {
      setTechSpecs([]);
      setAiWarning('');
      toast.info('Technical specifications cleared.');
    }
  };

  // Section 3 Action: Direct AI Generator for Specs
  const handleAiGenerateSpecsInline = async () => {
    const titleText = form.contractTitle || boqItems.map(i => i.description).filter(Boolean).join(', ');
    if (!titleText.trim()) {
      toast.warn('Please enter a Contract Title or BOQ item description first.');
      return;
    }
    setAiLoading(true);
    try {
      const prompt = `Generate 5 detailed brand-neutral technical specifications for procurement of: ${titleText}. Category: ${form.category || 'Goods'}. Format as clear technical specs without brand names.`;
      const response = await aiService.getMarketPrice({ rawText: prompt });
      if (response.data?.nlpResult?.identifiedSpecs?.length > 0) {
        const generated = response.data.nlpResult.identifiedSpecs.map(specStr => {
          const parts = specStr.split(':');
          return {
            title: parts.length > 1 ? parts[0].trim() : specStr.trim(),
            description: parts.length > 1 ? parts.slice(1).join(':').trim() : specStr.trim(),
            isMandatory: true,
            priority: 'required',
          };
        });
        setTechSpecs(generated);
        scanTechSpecsBrands(generated);
        toast.success(`AI generated ${generated.length} brand-neutral technical specifications.`);
      } else {
        toast.info('AI generated response parsed. Review requirements below.');
      }
    } catch (err) {
      console.error(err);
      toast.error('AI spec generation failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Update a tech spec field and run brand scan
  const updateTechSpec = (index, field, value) => {
    const updated = [...techSpecs];
    updated[index] = { ...updated[index], [field]: value };
    setTechSpecs(updated);
    scanTechSpecsBrands(updated);
  };

  const set = (field) => (e) => {
    const val = e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    // Reset DAPP item selection when faculty changes (items depend on faculty)
    if (field === 'faculty') {
      setSelectedItemId('');
      setBudgetCheck(null);
      setDappSearch('');
      setForm(prev => ({ ...prev, dappItem: '' }));
    }
  };

  const isTopOfficer = useMemo(() => {
    if (!user || !user.role) return false;
    return TOP_OFFICER_ROLES.has(user.role.toLowerCase());
  }, [user]);

  const getFilteredDappItems = (plan) => {
    if (!plan?.items) return [];
    if (!form.faculty && !isTopOfficer) return [];
    if (!form.faculty) return plan.items;

    const facultyLabel = FACULTY_MAP[form.faculty] || '';
    const dappNames = FACULTY_TO_DAPP_NAMES[form.faculty] || [];
    const searchTargets = [
      form.faculty,
      facultyLabel,
      ...dappNames,
    ].filter(Boolean).map(s => s.toLowerCase().trim());

    return plan.items.filter(item => {
      const itemDept = (item.department || '').toLowerCase().trim();
      const itemFaculty = (item.faculty || '').toLowerCase().trim();

      const matchesFaculty = searchTargets.some(target =>
        (itemDept && (itemDept === target || itemDept.includes(target) || target.includes(itemDept))) ||
        (itemFaculty && (itemFaculty === target || itemFaculty.includes(target) || target.includes(itemFaculty)))
      );

      if (matchesFaculty) return true;

      // For top officers, allow selecting items across all departments/faculties in the plan
      if (isTopOfficer) return true;

      return false;
    });
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
    // Ensure BOQ items have specifications (default to description if missing)
    const processedBoqItems = boqItems.map(item => ({
      ...item,
      specifications: item.specifications?.trim() || item.description?.trim() || ''
    }));

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

      const dbItems = processedBoqItems.map(item => ({
        description: item.description,
        specifications: item.specifications || '',
        category: dbCategory,
        quantity: parseFloat(item.qty) || 0,
        unit: item.unit || 'nos',
        estimatedUnitPrice: parseFloat(item.unitPrice) || 0
      }));

      const payload = {
        title: form.contractTitle,
        description: techSpecs.filter(s => s.title.trim()).map(s => `${s.title}: ${s.description}`).join('; ') || form.contractTitle,
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
        // ── Technical Specifications for vendor voting ──
        technicalSpecifications: techSpecs.filter(s => s.title.trim()).map((s, i) => ({
          specNumber: i + 1,
          title: s.title.trim(),
          description: s.description.trim(),
          isMandatory: s.isMandatory,
          priority: s.priority || 'required',
        })),
      };

      let savedDoc;
      if (isEditMode) {
        const res = await procurementService.update(id, payload);
        savedDoc = res.data?.data || res.data;
        toast.success('Requisition updated successfully');
        // Navigate to details page so user can see the updated record with "last edited by"
        const docId = savedDoc._id || savedDoc.id;
        navigate(`/procurements/${docId}`);
        return;
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



        {/* Section 1: Identity */}

        <FormSection title="Identification &amp; Multi-Tenant Context" step="1" subtitle="Procurement reference, requesting unit, and officer identification">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Procurement Reference Number" hint="Auto-generated. Format: UWU/[Category]/[Method]/YYYY/NNN">
              <TextInput value={form.refNo} readOnly />
            </FormField>
            <FormField 
              label="Originating Faculty / Department" 
              required 
              error={errors.faculty}
              hint={isTopOfficer ? "Authorized (System / Executive / Bursar / Procurement Officer): You can select any originating faculty or department." : userFacultyKey ? "Auto-selected based on your logged-in department." : undefined}
            >
              <SelectInput 
                value={form.faculty} 
                onChange={set('faculty')} 
                options={FACULTIES} 
                placeholder="Select faculty or unit (Tenant)..." 
                disabled={!isTopOfficer && !!userFacultyKey}
              />
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

        {/* ── Final Master Plan Linkage & Budget Compliance Panel ──── */}
        {!isEditMode && (
          <div className="bg-linear-to-br from-emerald-50 via-teal-50 to-blue-50 rounded-2xl border border-emerald-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <FaShieldAlt className="text-emerald-600" size={15} />
                  Link to Approved Final Master Plan (Mandatory Requirement)
                </h2>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Only items from an <strong>Approved (Active) Final Master Plan</strong> can be used to create Procurement Requests.
                </p>
              </div>
              {(() => {
                const b = myBudget || { allocatedAmount: 0, consumedAmount: 0, remainingAmount: 0 };
                const allocated = Number(b.allocatedAmount) || 0;
                const consumed = Number(b.consumedAmount) || 0;
                const remaining = b.remainingAmount !== undefined && b.remainingAmount !== null
                  ? Number(b.remainingAmount)
                  : (allocated - consumed);
                const pct = allocated > 0 ? Math.max(0, Math.min(100, (remaining / allocated) * 100)) : (remaining > 0 ? 100 : 0);

                return (
                  <div className="bg-white rounded-xl border border-emerald-200 px-4 py-2 text-right shrink-0 shadow-2xs">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Dept. Budget Remaining</p>
                    <p className={`text-lg font-bold ${remaining > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      LKR {remaining.toLocaleString()}
                    </p>
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Approved Final Master Plan Items Selector */}
            {approvedFinalPlanItems.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Select Approved Final Master Plan Item *
                  </label>
                  {selectedItemId && (
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                      <FaCalendarAlt size={10} className="text-emerald-600" />
                      Item Budget Plan Year: {getItemBudgetYear(approvedFinalPlanItems.find(i => (i._id || i.id) === selectedItemId))}
                    </span>
                  )}
                </div>
                <div className="relative mb-2">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="text"
                    placeholder="Search Approved Final Master Plan Items by description or budget year..."
                    value={dappSearch}
                    onChange={e => setDappSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <select
                  value={selectedItemId}
                  onChange={e => handleFinalPlanItemSelect(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                >
                  <option value="">— Select Approved Final Master Plan Item —</option>
                  {(() => {
                    let items = approvedFinalPlanItems;
                    if (form.faculty && !isTopOfficer) {
                      const facultyLabel = FACULTY_MAP[form.faculty] || '';
                      items = items.filter(i => 
                        !i.faculty || 
                        i.faculty.toLowerCase().includes(facultyLabel.toLowerCase()) || 
                        facultyLabel.toLowerCase().includes(i.faculty.toLowerCase())
                      );
                    }
                    if (dappSearch) {
                      const s = dappSearch.toLowerCase();
                      items = items.filter(i => 
                        i.description?.toLowerCase().includes(s) ||
                        String(getItemBudgetYear(i)).includes(s) ||
                        i.planRef?.toLowerCase().includes(s)
                      );
                    }
                    if (items.length === 0) {
                      return <option value="" disabled>No matching approved items found</option>;
                    }
                    return items.map(item => {
                      const itemYr = getItemBudgetYear(item);
                      return (
                        <option key={item._id || item.id} value={item._id || item.id}>
                          [{item.planRef || 'FMP'}] [Budget Year: {itemYr}] [{item.department || item.faculty}] {item.description} — LKR {(item.estimatedTotalCost || 0).toLocaleString()}
                        </option>
                      );
                    });
                  })()}
                </select>
                {selectedItemId && (
                  <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <FaCheckCircle className="text-emerald-600" /> Linked to Active Final Master Plan Item
                    </span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const selItem = approvedFinalPlanItems.find(i => (i._id || i.id) === selectedItemId);
                        const selYear = getItemBudgetYear(selItem);
                        return selYear ? (
                          <span className="bg-emerald-200/90 text-emerald-950 px-2.5 py-0.5 rounded-md font-bold text-[11px] border border-emerald-300 flex items-center gap-1">
                            <FaCalendarAlt size={10} className="text-emerald-700" />
                            Budget Plan Year: {selYear}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-emerald-700 font-bold">{form.mppRef}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback to Annual Plan selector if no active Final Master Plan items currently fetched */
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Annual Plan (DAPP)</label>
                    <select
                      value={selectedPlanId}
                      onChange={e => { setSelectedPlanId(e.target.value); setSelectedItemId(''); setBudgetCheck(null); setDappSearch(''); }}
                      disabled={!form.faculty}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <option value="">{!form.faculty ? '— Select Faculty First —' : '— Select Annual Plan —'}</option>
                      {annualPlans.map(p => (
                        <option key={p._id} value={p._id}>{p.referenceNumber} · {p.planYear}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">DAPP / Plan Item</label>
                    <select
                      value={selectedItemId}
                      onChange={e => handleAnnualItemSelect(selectedPlanId, e.target.value)}
                      disabled={!selectedPlanId || !form.faculty}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <option value="">{!form.faculty ? '— Select Faculty First —' : '— Select Item —'}</option>
                      {(() => {
                        const plan = annualPlans.find(p => p._id === selectedPlanId);
                        let filtered = plan ? getFilteredDappItems(plan) : [];
                        if (dappSearch) {
                          filtered = filtered.filter(item =>
                            item.description?.toLowerCase().includes(dappSearch.toLowerCase())
                          );
                        }
                        return filtered.map(item => (
                          <option key={item._id || item.id} value={item._id || item.id}>
                            [{item.department || item.faculty}] {item.description} — LKR {(item.estimatedTotalCost || 0).toLocaleString()}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>
                {form.faculty && selectedPlanId && !isTopOfficer && (
                  <p className="text-[10px] text-slate-400 mt-1">Showing items belonging strictly to your department ({FACULTY_MAP[form.faculty] || form.faculty}).</p>
                )}
                {form.faculty && selectedPlanId && isTopOfficer && (
                  <p className="text-[10px] text-emerald-600 mt-1">As a senior officer, you can also see common university department items.</p>
                )}
              </div>
            )}

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

        {/* Section 2: Financial */}
        <FormSection title="Strategic Planning &amp; Budget Linkage" step="2" subtitle="DAPP/MPP linkage, funding source, and cost estimates (Section 4.1.3)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="DAPP Line Item Linkage" required error={errors.dappItem} hint="Auto-linked via DAPP selector panel above">
              <TextInput value={form.dappItem ? `Linked: ${form.dappItem}` : ''} readOnly placeholder="Select DAPP Item from the panel above..." />
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

          {/* ── Technical Specifications – Requirements Builder ── */}
          <div className="mt-6">
            {/* Section Header */}
            <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 mb-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                    <FaClipboardList className="text-white" size={18} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-[15px] font-bold text-white tracking-tight">Technical Specifications</h3>
                      {techSpecs.length > 0 && !aiWarning && (
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <FaCheckCircle size={9} /> NPA Compliant
                        </span>
                      )}
                      {aiWarning && (
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                          <FaExclamationTriangle size={9} /> Brand Warning
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Vendors respond Yes/No to each requirement during bid evaluation per NPA guidelines</p>
                  </div>
                </div>

                {/* Quick Actions Header Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncFromBOQ}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center space-x-1.5"
                    title="Extract item descriptions & specifications from the BOQ table"
                  >
                    <FaSyncAlt className="text-emerald-400" size={10} />
                    <span>Sync from BOQ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAiGenerateSpecsInline}
                    disabled={aiLoading}
                    className="px-3.5 py-1.5 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {aiLoading ? <FaSpinner className="animate-spin" size={10} /> : <FaMagic className="text-amber-300" size={10} />}
                    <span>AI Spec Generator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTechSpecs(prev => [...prev, { title: '', description: '', isMandatory: true, priority: 'required' }])}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FaPlus size={10} />
                    <span>Add Requirement</span>
                  </button>
                </div>
              </div>

              {/* Filter Toolbar Row */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                {/* Filter Pills & View Controls */}
                <div className="flex items-center space-x-2 shrink-0">
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSpecFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${specFilter === 'all' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      All ({techSpecs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecFilter('mandatory')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${specFilter === 'mandatory' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Mandatory ({techSpecs.filter(s => s.isMandatory).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecFilter('critical')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${specFilter === 'critical' ? 'bg-red-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Critical ({techSpecs.filter(s => (s.priority || 'required') === 'critical').length})
                    </button>
                  </div>

                  {techSpecs.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsSpecsCollapsed(!isSpecsCollapsed)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        title={isSpecsCollapsed ? 'Expand Descriptions' : 'Collapse Descriptions'}
                      >
                        {isSpecsCollapsed ? <FaExpandAlt size={11} /> : <FaCompressAlt size={11} />}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllSpecs}
                        className="p-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-lg transition-colors"
                        title="Clear All Requirements"
                      >
                        <FaTrash size={11} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* AI Brand Warning / NPA Compliance Alert */}
            {aiWarning && (
              <div className="flex items-start space-x-4 bg-linear-to-r from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl px-5 py-4 shadow-sm mb-4 animate-[fadeIn_0.3s_ease-out]">
                <div className="bg-amber-100/80 p-2.5 rounded-xl shrink-0">
                  <FaRobot className="text-amber-600" size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">AI Specification &amp; Brand Neutrality Review</p>
                  <p className="text-[13px] font-medium text-amber-700/90 mt-1 leading-relaxed">{aiWarning}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {techSpecs.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200/80 rounded-2xl p-10 text-center bg-linear-to-b from-slate-50/50 to-white relative overflow-hidden">
                <div className="absolute top-4 right-4 w-20 h-20 bg-emerald-100/40 rounded-full blur-2xl pointer-events-none"></div>
                <div className="w-16 h-16 mx-auto bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-emerald-100/60">
                  <FaClipboardList className="text-emerald-400" size={28} />
                </div>
                <h4 className="text-[15px] font-bold text-slate-700 mb-1">No Technical Requirements Defined</h4>
                <p className="text-[13px] text-slate-400 max-w-md mx-auto leading-relaxed">
                  Define the technical requirements that vendors must comply with. You can type requirements manually, sync from BOQ items, or generate specs using AI.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setTechSpecs([{ title: '', description: '', isMandatory: true, priority: 'required' }])}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-linear-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FaPlus size={10} />
                    <span>Add Manual Requirement</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncFromBOQ}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    <FaSyncAlt className="text-emerald-600" size={10} />
                    <span>Sync from BOQ Items</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAiGenerateSpecsInline}
                    disabled={aiLoading}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    <FaMagic className="text-amber-400" size={10} />
                    <span>Generate Specs with AI</span>
                  </button>
                </div>
                <div className="mt-6 flex items-center justify-center space-x-6 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <FaLightbulb className="text-amber-400" size={10} />
                    <span>Tip: Use functional brand-neutral criteria per NPA</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <FaCheckCircle className="text-emerald-400" size={10} />
                    <span>AI scans for proprietary brand names automatically</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {techSpecs
                  .map((spec, originalIndex) => ({ spec, originalIndex }))
                  .filter(({ spec }) => {
                    if (specFilter === 'mandatory') return spec.isMandatory;
                    if (specFilter === 'critical') return (spec.priority || 'required') === 'critical';
                    return true;
                  })
                  .map(({ spec, originalIndex }) => (
                  <div
                    key={originalIndex}
                    className={`group relative border rounded-2xl bg-white transition-all duration-200 hover:shadow-md ${
                      spec.isMandatory
                        ? 'border-emerald-200/80 hover:border-emerald-300'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                    style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
                  >
                    {/* Left accent bar */}
                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full transition-colors ${
                      spec.isMandatory ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}></div>

                    <div className="pl-5 pr-4 py-4">
                      {/* Top Row: Reorder buttons + Number + Title + Controls */}
                      <div className="flex items-start gap-3">
                        {/* Re-order & number stack */}
                        <div className="flex flex-col items-center space-y-1 pt-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveSpec(originalIndex, 'up')}
                            disabled={originalIndex === 0}
                            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
                            title="Move Up"
                          >
                            <FaArrowUp size={9} />
                          </button>
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold border ${
                            spec.isMandatory
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {originalIndex + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveSpec(originalIndex, 'down')}
                            disabled={originalIndex === techSpecs.length - 1}
                            className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
                            title="Move Down"
                          >
                            <FaArrowDown size={9} />
                          </button>
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Requirement Title *</label>
                          <input
                            value={spec.title}
                            onChange={e => updateTechSpec(originalIndex, 'title', e.target.value)}
                            placeholder="e.g. Print Speed, Memory Capacity, Optical Bandwidth..."
                            className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white hover:border-slate-300 transition-all placeholder:text-slate-300"
                          />
                        </div>

                        {/* Mandatory toggle */}
                        <div className="flex flex-col items-center shrink-0 pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mandatory</span>
                          <button
                            type="button"
                            onClick={() => updateTechSpec(originalIndex, 'isMandatory', !spec.isMandatory)}
                            className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                              spec.isMandatory
                                ? 'bg-emerald-500 focus:ring-emerald-500/40 shadow-inner shadow-emerald-600/30'
                                : 'bg-slate-300 focus:ring-slate-400/40'
                            }`}
                            title={spec.isMandatory ? 'Mandatory — vendors must comply' : 'Optional — nice to have'}
                          >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                              spec.isMandatory ? 'left-5.5' : 'left-0.5'
                            }`}></span>
                          </button>
                        </div>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = techSpecs.filter((_, idx) => idx !== originalIndex);
                            setTechSpecs(updated);
                            scanTechSpecsBrands(updated);
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 shrink-0 mt-5"
                          title="Remove requirement"
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>

                      {/* Description textarea (with toggle collapse) */}
                      {!isSpecsCollapsed && (
                        <div className="mt-3 ml-9">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Detailed Description &amp; Acceptance Criteria</label>
                          <textarea
                            value={spec.description}
                            onChange={e => updateTechSpec(originalIndex, 'description', e.target.value)}
                            placeholder="Describe the full requirement in detail. E.g.: Minimum 16GB DDR5 memory; 3 Years On-Site warranty; Energy-Star certified..."
                            rows={2}
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all resize-y min-h-16 placeholder:text-slate-300 leading-relaxed"
                          />
                        </div>
                      )}

                      {/* Footer: Priority selector + status */}
                      <div className="mt-3 ml-9 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Priority:</span>
                          {[
                            { value: 'critical', label: 'Critical', color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100', activeColor: 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200', icon: FaExclamationTriangle },
                            { value: 'required', label: 'Required', color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100', activeColor: 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-200', icon: FaStar },
                            { value: 'nice-to-have', label: 'Nice to Have', color: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100', activeColor: 'bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-200', icon: FaLightbulb },
                          ].map(p => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => updateTechSpec(originalIndex, 'priority', p.value)}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200 ${
                                (spec.priority || 'required') === p.value ? p.activeColor : p.color
                              }`}
                            >
                              <p.icon size={9} />
                              <span>{p.label}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          {spec.isMandatory && <span className="flex items-center space-x-1 text-emerald-500 font-bold"><FaCheckCircle size={9} /><span>Compliance required</span></span>}
                          {!spec.isMandatory && <span className="flex items-center space-x-1 text-slate-400 font-medium"><FaInfoCircle size={9} /><span>Optional</span></span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add More + Summary Footer */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setTechSpecs(prev => [...prev, { title: '', description: '', isMandatory: true, priority: 'required' }])}
                    className="inline-flex items-center space-x-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors group/add"
                  >
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 group-hover/add:bg-emerald-100 flex items-center justify-center transition-colors">
                      <FaPlus size={10} />
                    </span>
                    <span>Add Another Requirement</span>
                  </button>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="text-slate-400 font-medium">
                      Showing {techSpecs.length} requirement{techSpecs.length !== 1 ? 's' : ''}
                    </span>
                    {techSpecs.filter(s => (s.priority || 'required') === 'critical').length > 0 && (
                      <span className="text-red-500 font-bold flex items-center space-x-1">
                        <FaExclamationTriangle size={9} />
                        <span>{techSpecs.filter(s => (s.priority || 'required') === 'critical').length} critical</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
                <div className="space-y-4 max-h-350px overflow-y-auto pr-1">
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
