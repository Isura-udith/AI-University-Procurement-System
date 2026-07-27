import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FaTable, FaPlus, FaTrash, FaCopy, FaFileDownload, FaFileUpload,
  FaSave, FaPaperPlane, FaSearch, FaRedo, FaUndo,
  FaCalculator, FaCheckCircle, FaBuilding, FaMoneyBillWave,
  FaExclamationTriangle, FaTimes, FaSpinner, FaCloudDownloadAlt,
  FaUserCheck, FaThumbsUp, FaThumbsDown, FaUserTie, FaLandmark,
  FaGavel, FaCheckDouble, FaLayerGroup, FaUniversity
} from 'react-icons/fa';
import planningService from '../../../services/planning.service';
import { DEPARTMENTS_AND_FACULTIES, DEPARTMENTS_BY_FACULTY, ALL_DEPARTMENTS } from '../../../constants/departments';

const CATEGORIES = ['Goods', 'Services', 'Works', 'Consulting'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const FUNDING_SOURCES = [
  'GOSL Treasury Funds',
  'Foreign Funded - AHEAD Project',
  'Foreign Funded - Other',
  'University Internal Revenue'
];
const STATUSES = ['Draft', 'Submitted to HOD', 'Submitted to Dean', 'Submitted to Bursar', 'Submitted to FC', 'Submitted to VC', 'Submitted to Council', 'Approved', 'Rejected'];

export default function DraftMasterPlanSheet() {
  const { user } = useSelector(s => s.auth);
  const fileInputRef = useRef(null);

  const userRole = user?.role || 'department_user';
  const isSuperOrAdmin = ['super_admin', 'admin'].includes(userRole);

  // Role Access Flags for Stage Queues
  const canAccessHod = isSuperOrAdmin || ['department_head', 'academic_staff', 'hod'].includes(userRole);
  const canAccessDean = isSuperOrAdmin || ['dean'].includes(userRole);
  const canAccessBursar = isSuperOrAdmin || ['bursar'].includes(userRole);
  const canAccessFc = isSuperOrAdmin || ['finance_committee', 'finance_officer'].includes(userRole);
  const canAccessVc = isSuperOrAdmin || ['vc', 'vice_chancellor'].includes(userRole);
  const canAccessCouncil = isSuperOrAdmin || ['council'].includes(userRole);
  const canAccessCompilation = isSuperOrAdmin || ['bursar', 'procurement_officer', 'council'].includes(userRole);

  // Department default setting based on user role/faculty
  const defaultFaculty = user?.faculty || DEPARTMENTS_AND_FACULTIES[0];
  const defaultDept = user?.department || DEPARTMENTS_BY_FACULTY[defaultFaculty]?.[0] || ALL_DEPARTMENTS[0];

  // Default active tab based on user's role
  const defaultTab = useMemo(() => {
    if (['department_head', 'academic_staff', 'hod', 'department_user'].includes(userRole)) return 'sheet';
    if (userRole === 'dean') return 'dean_verification';
    if (userRole === 'bursar') return 'bursar_verification';
    if (['finance_committee', 'finance_officer'].includes(userRole)) return 'fc_verification';
    if (['vc', 'vice_chancellor'].includes(userRole)) return 'vc_verification';
    if (userRole === 'council') return 'council_verification';
    return 'sheet';
  }, [userRole]);

  // Active View Tab
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compiling, setCompiling] = useState(false);

  // Main Rows State
  const [rows, setRows] = useState([]);

  // Multi-stage pending queues
  const [hodPendingItems, setHodPendingItems] = useState([]);
  const [deanPendingItems, setDeanPendingItems] = useState([]);
  const [bursarPendingItems, setBursarPendingItems] = useState([]);
  const [fcPendingItems, setFcPendingItems] = useState([]);
  const [vcPendingItems, setVcPendingItems] = useState([]);
  const [councilPendingItems, setCouncilPendingItems] = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);

  // 3-Year Master Plan Cycle State (default 2028-2030)
  const [masterPlanStartYear, setMasterPlanStartYear] = useState(2028);
  const masterPlanYears = useMemo(() => [
    masterPlanStartYear,
    masterPlanStartYear + 1,
    masterPlanStartYear + 2
  ], [masterPlanStartYear]);

  // Verification & Compilation selection states
  const [verifyingId, setVerifyingId] = useState(null);
  const [selectedApprovedIds, setSelectedApprovedIds] = useState([]);
  const [compilationTitle, setCompilationTitle] = useState(`Master Procurement Plan 2028-2030`);
  const [compilationYear, setCompilationYear] = useState(2028);

  // Cell Selection & Focus State
  const [selectedCell, setSelectedCell] = useState({ rowIndex: 0, colKey: 'description' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [lastSaved, setLastSaved] = useState(new Date().toLocaleTimeString());
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // History state for Undo / Redo
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Parse items fetched from DraftProcurementItem database table
  const parseDraftItems = useCallback((itemsList) => {
    let listToParse = itemsList;
    if (!Array.isArray(listToParse) || listToParse.length === 0) {
      try {
        const stored = localStorage.getItem('uwu_draft_master_plan_sheet_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            listToParse = parsed;
          }
        }
      } catch (e) {
        console.error('LocalStorage parse error:', e);
      }
    }

    if (!Array.isArray(listToParse) || listToParse.length === 0) {
      listToParse = [{
        id: `ROW-${Date.now().toString().slice(-4)}`,
        itemCode: `ITEM-${Math.floor(100 + Math.random() * 900)}`,
        description: 'New Procurement Item Requirement',
        department: user?.department || defaultDept,
        faculty: user?.faculty || defaultFaculty,
        category: 'Goods',
        year: masterPlanStartYear,
        plannedYear: 1,
        priority: 'Medium',
        quantity: 1,
        unit: 'Units',
        unitCost: 100000,
        q1Amount: 100,
        q2Amount: 0,
        q3Amount: 0,
        q4Amount: 0,
        fundingSource: 'GOSL Treasury Funds',
        status: 'Draft',
        notes: ''
      }];
    }

    const mappedRows = listToParse.map((item, idx) => {
      const parsedYr = Number(item.year) || (Number(item.plannedYear) >= 2000 ? Number(item.plannedYear) : (masterPlanStartYear + (Number(item.plannedYear || 1) - 1)));
      return {
        id: item.id || item._id || `ROW-DB-${idx + 1}`,
        dbId: item._id || item.dbId,
        itemCode: item.itemCode || `ITEM-${Math.floor(100 + Math.random() * 900)}`,
        description: item.description || '',
        department: item.department || user?.department || defaultDept,
        faculty: item.faculty || user?.faculty || defaultFaculty,
        category: item.category || 'Goods',
        year: parsedYr || masterPlanStartYear,
        plannedYear: item.plannedYear || 1,
        priority: item.priority ? (item.priority.charAt(0).toUpperCase() + item.priority.slice(1)) : 'Medium',
        quantity: item.estimatedQuantity || item.quantity || 1,
        unit: item.unit || 'Units',
        unitCost: item.estimatedUnitCost || item.unitCost || 0,
        q1Amount: item.q1Amount ?? 100,
        q2Amount: item.q2Amount ?? 0,
        q3Amount: item.q3Amount ?? 0,
        q4Amount: item.q4Amount ?? 0,
        fundingSource: item.fundingSource || 'GOSL Treasury Funds',
        status: item.status === 'submitted_to_hod' ? 'Submitted to HOD' :
                item.status === 'submitted_to_dean' ? 'Submitted to Dean' :
                item.status === 'submitted_to_bursar' ? 'Submitted to Bursar' :
                item.status === 'submitted_to_fc' ? 'Submitted to FC' :
                item.status === 'submitted_to_vc' ? 'Submitted to VC' :
                item.status === 'submitted_to_council' ? 'Submitted to Council' :
                item.status === 'approved' || item.status === 'council_approved' ? 'Approved' :
                item.status === 'rejected' ? 'Rejected' : 'Draft',
        notes: item.justification || item.notes || ''
      };
    });
    setRows(mappedRows);
    setHistory([mappedRows]);
    setHistoryIndex(0);
  }, [defaultDept, defaultFaculty, user, masterPlanStartYear]);

  // Load draft items & authorized pending approvals from backend
  const loadBackendData = useCallback(async () => {
    try {
      // 1. Fetch user/department draft procurement items
      const res = await planningService.getDraftItems();
      const items = res.data?.data || res.data || [];
      parseDraftItems(items);

      // 2. Fetch HOD pending items (if authorized)
      if (canAccessHod) {
        try {
          const hodRes = await planningService.getPendingHodItems();
          const hodData = hodRes?.data?.data || hodRes?.data || [];
          setHodPendingItems(Array.isArray(hodData) ? hodData : []);
        } catch { /* Non-blocking */ }
      }

      // 3. Fetch Dean pending items (if authorized)
      if (canAccessDean) {
        try {
          const deanRes = await planningService.getPendingDraftItems('dean');
          const deanData = deanRes?.data?.data || deanRes?.data || [];
          setDeanPendingItems(Array.isArray(deanData) ? deanData : []);
        } catch { /* Non-blocking */ }
      }

      // 4. Fetch Bursar pending items (ALL items university-wide, if authorized)
      if (canAccessBursar) {
        try {
          const bursarRes = await planningService.getPendingDraftItems('bursar');
          const bursarData = bursarRes?.data?.data || bursarRes?.data || [];
          setBursarPendingItems(Array.isArray(bursarData) ? bursarData : []);
        } catch { /* Non-blocking */ }
      }

      // 5. Fetch Finance Committee pending items (if authorized)
      if (canAccessFc) {
        try {
          const fcRes = await planningService.getPendingDraftItems('fc');
          const fcData = fcRes?.data?.data || fcRes?.data || [];
          setFcPendingItems(Array.isArray(fcData) ? fcData : []);
        } catch { /* Non-blocking */ }
      }

      // 6. Fetch VC pending items (if authorized)
      if (canAccessVc) {
        try {
          const vcRes = await planningService.getPendingDraftItems('vc');
          const vcData = vcRes?.data?.data || vcRes?.data || [];
          setVcPendingItems(Array.isArray(vcData) ? vcData : []);
        } catch { /* Non-blocking */ }
      }

      // 7. Fetch Council pending items (if authorized)
      if (canAccessCouncil) {
        try {
          const councilRes = await planningService.getPendingDraftItems('council');
          const councilData = councilRes?.data?.data || councilRes?.data || [];
          setCouncilPendingItems(Array.isArray(councilData) ? councilData : []);
        } catch { /* Non-blocking */ }
      }

      // 8. Fetch Fully Approved draft items (if authorized)
      if (canAccessCompilation) {
        try {
          const approvedRes = await planningService.getApprovedDraftItems();
          const approvedData = approvedRes?.data?.data || approvedRes?.data || [];
          setApprovedItems(Array.isArray(approvedData) ? approvedData : []);
        } catch { /* Non-blocking */ }
      }
    } catch (err) {
      console.error('Error fetching draft procurement data:', err);
      toast.error('Failed to load draft procurement items from database.');
    } finally {
      setLoading(false);
    }
  }, [canAccessHod, canAccessDean, canAccessBursar, canAccessFc, canAccessVc, canAccessCouncil, canAccessCompilation, parseDraftItems]);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      if (!ignore) {
        await loadBackendData();
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [loadBackendData]);

  // Filtered rows memo
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter(r => {
      const matchesSearch = !query ||
        (r.description?.toLowerCase() || '').includes(query) ||
        (r.itemCode?.toLowerCase() || '').includes(query) ||
        (r.department?.toLowerCase() || '').includes(query);

      const matchesDept = selectedDeptFilter === 'ALL' || r.department === selectedDeptFilter;
      const matchesCategory = selectedCategoryFilter === 'ALL' || r.category === selectedCategoryFilter;
      const matchesYear = selectedYearFilter === 'ALL' || String(r.year || '') === String(selectedYearFilter);
      const matchesPriority = selectedPriorityFilter === 'ALL' || r.priority === selectedPriorityFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || r.status === selectedStatusFilter;

      return matchesSearch && matchesDept && matchesCategory && matchesYear && matchesPriority && matchesStatus;
    });
  }, [rows, searchQuery, selectedDeptFilter, selectedCategoryFilter, selectedYearFilter, selectedPriorityFilter, selectedStatusFilter]);

  // Key KPI calculations
  const stats = useMemo(() => {
    let totalBudget = 0;
    let goodsTotal = 0;
    let worksTotal = 0;
    let servicesTotal = 0;
    let consultingTotal = 0;
    let year1Total = 0, year2Total = 0, year3Total = 0;
    let year1Count = 0, year2Count = 0, year3Count = 0;
    let invalidQuarterAllocations = 0;
    const deptsSet = new Set();

    filteredRows.forEach(r => {
      const cost = (Number(r.quantity) || 0) * (Number(r.unitCost) || 0);
      totalBudget += cost;
      if (r.department) deptsSet.add(r.department);

      if (r.category === 'Goods') goodsTotal += cost;
      else if (r.category === 'Works') worksTotal += cost;
      else if (r.category === 'Services') servicesTotal += cost;
      else if (r.category === 'Consulting') consultingTotal += cost;

      const itemYr = Number(r.year || masterPlanYears[0]);
      if (itemYr === masterPlanYears[0]) { year1Total += cost; year1Count++; }
      else if (itemYr === masterPlanYears[1]) { year2Total += cost; year2Count++; }
      else if (itemYr === masterPlanYears[2]) { year3Total += cost; year3Count++; }

      const qSum = (Number(r.q1Amount) || 0) + (Number(r.q2Amount) || 0) + (Number(r.q3Amount) || 0) + (Number(r.q4Amount) || 0);
      if (qSum !== 100) invalidQuarterAllocations += 1;
    });

    const count = filteredRows.length;
    const avgCost = count > 0 ? totalBudget / count : 0;
    const universityBudgetLimit = 50000000;
    const utilPercentage = Math.min(100, (totalBudget / universityBudgetLimit) * 100);

    return {
      totalBudget,
      goodsTotal,
      worksTotal,
      servicesTotal,
      consultingTotal,
      year1Total, year2Total, year3Total,
      year1Count, year2Count, year3Count,
      deptsCount: deptsSet.size,
      count,
      avgCost,
      utilPercentage,
      invalidQuarterAllocations
    };
  }, [filteredRows, masterPlanYears]);

  // Focused active cell info
  const activeCellObj = useMemo(() => {
    if (!filteredRows[selectedCell.rowIndex]) return null;
    const targetRow = filteredRows[selectedCell.rowIndex];
    const val = targetRow[selectedCell.colKey];
    return {
      cellRef: `R${selectedCell.rowIndex + 1}:${selectedCell.colKey?.toUpperCase() || ''}`,
      value: val,
      row: targetRow
    };
  }, [filteredRows, selectedCell]);

  // Auto-Save effect
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      setIsAutoSaving(true);
      try {
        localStorage.setItem('uwu_draft_master_plan_sheet_v1', JSON.stringify(rows));
        setLastSaved(new Date().toLocaleTimeString());
      } catch (e) {
        console.error('Auto-save error', e);
      } finally {
        setTimeout(() => setIsAutoSaving(false), 400);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [rows, loading]);

  // Update rows helper with undo/redo track
  const updateRowsState = (newRows) => {
    setRows(newRows);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRows);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setRows(history[prevIndex]);
      setHistoryIndex(prevIndex);
      toast.info('Undo operation executed');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setRows(history[nextIndex]);
      setHistoryIndex(nextIndex);
      toast.info('Redo operation executed');
    }
  };

  // Cell Value Modification
  const handleCellChange = (id, fieldOrObject, value) => {
    const updated = rows.map(r => {
      if (r.id === id) {
        let item;
        if (typeof fieldOrObject === 'object' && fieldOrObject !== null) {
          item = { ...r, ...fieldOrObject };
        } else {
          item = { ...r, [fieldOrObject]: value };
        }
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        item.calculatedTotal = qty * cost;
        return item;
      }
      return r;
    });
    updateRowsState(updated);
  };

  // Row Manipulation
  const handleAddRow = () => {
    const newId = `ROW-${Date.now().toString().slice(-4)}`;
    const newRow = {
      id: newId,
      itemCode: `ITEM-${Math.floor(100 + Math.random() * 900)}`,
      description: 'New Procurement Item Requirement',
      department: user?.department || defaultDept,
      faculty: user?.faculty || defaultFaculty,
      category: 'Goods',
      year: masterPlanYears[0],
      plannedYear: 1,
      priority: 'Medium',
      quantity: 1,
      unit: 'Units',
      unitCost: 100000,
      q1Amount: 100,
      q2Amount: 0,
      q3Amount: 0,
      q4Amount: 0,
      fundingSource: 'GOSL Treasury Funds',
      status: 'Draft',
      notes: ''
    };
    updateRowsState([...rows, newRow]);
    toast.success(`New procurement item added for Year ${masterPlanYears[0]}!`);
  };

  const handleDuplicateSelected = () => {
    if (selectedRows.length === 0) {
      toast.warning('Please select at least one row checkbox to duplicate.');
      return;
    }
    const duplicated = selectedRows.map(id => {
      const target = rows.find(r => r.id === id);
      return {
        ...target,
        id: `ROW-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5)}`,
        itemCode: `${target.itemCode}-COPY`,
        description: `${target.description} (Copy)`,
        status: 'Draft'
      };
    });
    updateRowsState([...rows, ...duplicated]);
    setSelectedRows([]);
    toast.success(`Duplicated ${duplicated.length} row(s)`);
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      toast.warning('Please select rows using checkboxes to delete.');
      return;
    }

    const remaining = rows.filter(r => !selectedRows.includes(r.id));
    for (const id of selectedRows) {
      const target = rows.find(r => r.id === id);
      if (target?.dbId) {
        try { await planningService.deleteDraftItem(target.dbId); } catch { /* silent */ }
      }
    }
    updateRowsState(remaining);
    setSelectedRows([]);
    toast.info(`Deleted ${rows.length - remaining.length} row(s)`);
  };

  const handleClearSheet = () => {
    if (window.confirm('Clear all items from the current spreadsheet grid?')) {
      updateRowsState([]);
      setSelectedRows([]);
      toast.info('Spreadsheet grid cleared.');
    }
  };

  // CSV Import / Export
  const handleExportCSV = () => {
    const headers = [
      'ID', 'Item Code', 'Description', 'Department', 'Category', 'Year Category', 'Priority',
      'Quantity', 'Unit', 'Unit Cost (LKR)', 'Total Cost (LKR)',
      'Q1 %', 'Q2 %', 'Q3 %', 'Q4 %', 'Funding Source', 'Status', 'Notes'
    ];
    const csvLines = [headers.join(',')];

    filteredRows.forEach(r => {
      const totalCost = Number(r.quantity || 0) * Number(r.unitCost || 0);
      const line = [
        `"${r.id}"`,
        `"${r.itemCode || ''}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${r.department || ''}"`,
        `"${r.category || ''}"`,
        r.year || masterPlanYears[0],
        `"${r.priority || ''}"`,
        r.quantity || 0,
        `"${r.unit || ''}"`,
        r.unitCost || 0,
        totalCost,
        r.q1Amount || 0,
        r.q2Amount || 0,
        r.q3Amount || 0,
        r.q4Amount || 0,
        `"${r.fundingSource || ''}"`,
        `"${r.status || ''}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(line.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Draft_Procurement_Items_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported CSV spreadsheet file!');
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length <= 1) {
          toast.error('Invalid CSV file or empty data.');
          return;
        }
        const imported = lines.slice(1).map((line, idx) => {
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const yr = Number(cols[5]) || masterPlanYears[0];
          const yrIdx = masterPlanYears.indexOf(yr);
          return {
            id: `ROW-IMP-${idx + 1}`,
            itemCode: cols[1] || `IMP-${idx + 1}`,
            description: cols[2] || 'Imported item',
            department: cols[3] || defaultDept,
            category: CATEGORIES.includes(cols[4]) ? cols[4] : 'Goods',
            year: yr,
            plannedYear: yrIdx !== -1 ? yrIdx + 1 : 1,
            priority: PRIORITIES.includes(cols[6]) ? cols[6] : 'Medium',
            quantity: Number(cols[7]) || 1,
            unit: cols[8] || 'Units',
            unitCost: Number(cols[9]) || 100000,
            q1Amount: Number(cols[11]) || 100,
            q2Amount: Number(cols[12]) || 0,
            q3Amount: Number(cols[13]) || 0,
            q4Amount: Number(cols[14]) || 0,
            fundingSource: cols[15] || 'GOSL Treasury Funds',
            status: 'Draft',
            notes: cols[17] || 'Imported via CSV'
          };
        });

        updateRowsState([...rows, ...imported]);
        toast.success(`Imported ${imported.length} row(s) from CSV!`);
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // Save / Submit Draft Procurement Items
  const handleSavePlan = async (isSubmit = false) => {
    if (rows.length === 0) {
      toast.warning('Spreadsheet is empty! Please add at least one row before saving.');
      return;
    }

    setSaving(true);
    try {
      const res = await planningService.saveDraftItems(rows);
      const savedItems = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      toast.success(`Saved ${savedItems.length} draft procurement item(s) to database!`);

      if (isSubmit) {
        const itemIds = savedItems.map(i => i._id || i.id).filter(id => id && String(id).length === 24);
        const isHodRole = ['department_head', 'academic_staff', 'hod'].includes(userRole);
        const submitTarget = isHodRole ? 'dean' : 'hod';
        await planningService.submitDraftItems(itemIds.length > 0 ? itemIds : undefined, submitTarget);
        toast.success(isHodRole ? 'Draft procurement items submitted to Dean for review!' : 'Draft procurement items submitted to Faculty HOD for verification!');
      }

      await loadBackendData();
    } catch (err) {
      console.error('Save/Submit plan error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save draft procurement items to database.');
    } finally {
      setSaving(false);
    }
  };

  // Multi-Stage Verification Action Handler with strict authorization check
  const handleStageApproveReject = async (itemId, action, stage, stageLabel) => {
    setVerifyingId(itemId);
    try {
      const comments = action === 'approve' ? `Approved by ${stageLabel}` : `Rejected during ${stageLabel} verification`;
      if (stage === 'hod') {
        await planningService.hodApproveDraftItem(itemId, { action, comments });
      } else {
        await planningService.approveDraftItem(itemId, { action, comments, stage });
      }
      toast.success(action === 'approve' ? `Item approved by ${stageLabel}!` : `Item rejected by ${stageLabel}.`);
      await loadBackendData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || `${stageLabel} verification action failed.`);
    } finally {
      setVerifyingId(null);
    }
  };

  // Final Master Plan Compilation Handler
  const handleCompileFinalPlan = async () => {
    if (selectedApprovedIds.length === 0) {
      toast.warning('Please select at least one approved draft item to compile.');
      return;
    }
    setCompiling(true);
    try {
      const res = await planningService.compileFinalMasterPlan({
        title: compilationTitle,
        planYear: Number(compilationYear),
        draftItemIds: selectedApprovedIds,
      });
      const planData = res.data?.data || res.data;
      toast.success(`Successfully compiled ${selectedApprovedIds.length} item(s) into Final Master Plan (${planData.referenceNumber || 'FMP'})!`);
      setSelectedApprovedIds([]);
      await loadBackendData();
    } catch (err) {
      console.error('Compilation error:', err);
      toast.error(err?.response?.data?.message || 'Failed to compile Final Master Plan.');
    } finally {
      setCompiling(false);
    }
  };

  // Toggle row selection for spreadsheet
  const toggleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(i => i !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredRows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredRows.map(r => r.id));
    }
  };

  // Toggle approved item selection for compilation
  const toggleSelectApprovedItem = (id) => {
    if (selectedApprovedIds.includes(id)) {
      setSelectedApprovedIds(selectedApprovedIds.filter(i => i !== id));
    } else {
      setSelectedApprovedIds([...selectedApprovedIds, id]);
    }
  };

  const toggleSelectAllApprovedItems = () => {
    if (selectedApprovedIds.length === approvedItems.length) {
      setSelectedApprovedIds([]);
    } else {
      setSelectedApprovedIds(approvedItems.map(item => item._id));
    }
  };

  // Active filter count
  const activeFiltersCount = (selectedDeptFilter !== 'ALL' ? 1 : 0) +
    (selectedCategoryFilter !== 'ALL' ? 1 : 0) +
    (selectedYearFilter !== 'ALL' ? 1 : 0) +
    (selectedPriorityFilter !== 'ALL' ? 1 : 0) +
    (selectedStatusFilter !== 'ALL' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedDeptFilter('ALL');
    setSelectedCategoryFilter('ALL');
    setSelectedYearFilter('ALL');
    setSelectedPriorityFilter('ALL');
    setSelectedStatusFilter('ALL');
  };

  // Render a verification queue for any stage
  const renderVerificationQueue = (items, roleLabel, stageKey, noteText) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-16 text-slate-400">
          <FaCheckCircle className="text-5xl text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Pending Items for {roleLabel} Verification</h3>
          <p className="text-xs text-slate-500 mt-1">{noteText}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item._id} className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all bg-slate-50/50">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-mono font-bold text-xs rounded-md">
                    {item.itemCode || 'DRAFT-ITEM'}
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 font-semibold text-xs rounded-md">
                    {item.category}
                  </span>
                  <span className="px-2.5 py-0.5 bg-indigo-900 text-indigo-100 font-bold text-xs rounded-md border border-indigo-700 shadow-2xs">
                    Year {item.year || (masterPlanStartYear + ((item.plannedYear || 1) - 1))}
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-semibold text-xs rounded-md uppercase">
                    {item.priority} Priority
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{item.description}</h3>
                <p className="text-xs text-slate-500">
                  Department: <strong className="text-slate-700">{item.department}</strong> | Faculty: <strong className="text-slate-700">{item.faculty}</strong>
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-500">Estimated Total Cost</p>
                <p className="text-lg font-black text-emerald-700 font-mono">
                  LKR {(item.estimatedTotalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Qty: {item.estimatedQuantity} {item.unit} @ LKR {(item.estimatedUnitCost || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {item.justification && (
              <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                <strong>Justification / Notes:</strong> {item.justification}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60 text-xs">
              <span className="text-slate-400">
                Submitted by: <strong className="text-slate-700">{item.createdBy?.name || item.createdBy?.email || 'University Staff'}</strong> ({new Date(item.submittedAt || item.createdAt).toLocaleDateString()})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStageApproveReject(item._id, 'reject', stageKey, roleLabel)}
                  disabled={verifyingId === item._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  <FaThumbsDown /> <span>Reject</span>
                </button>
                <button
                  onClick={() => handleStageApproveReject(item._id, 'approve', stageKey, roleLabel)}
                  disabled={verifyingId === item._id}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <FaThumbsUp /> <span>Approve</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 font-sans">
        <FaSpinner className="text-4xl text-emerald-600 animate-spin" />
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800">Loading Draft Procurement Items...</h3>
          <p className="text-xs text-slate-500 mt-1">Connecting to backend database & aggregating multi-stage approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* Top Glassmorphic Hero Banner & Navigation Tabs */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-slate-900 text-white shadow-xl"> 
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-extrabold text-[11px] uppercase tracking-wider rounded-full">
                University Procurement Draft Portal
              </span>
              <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[11px] uppercase rounded-full">
                Role: {userRole.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Draft Master Procurement Plan Sheet
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Any university staff member can create and save Draft Master Plan items (DAPP items). Items can be assigned to any year within the 3-year Master Procurement Plan.
            </p>

            {/* 3-Year Master Procurement Plan Cycle Config */}
            <div className="mt-3 flex flex-wrap items-center gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5">
              <div className="flex items-center gap-2">
                <FaLayerGroup className="text-amber-400 text-sm" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Master Plan 3-Year Cycle:</span>
              </div>
              <select
                value={masterPlanStartYear}
                onChange={(e) => {
                  const startYr = Number(e.target.value);
                  setMasterPlanStartYear(startYr);
                  setCompilationYear(startYr);
                }}
                className="bg-slate-900 border border-amber-500/60 rounded-xl px-3 py-1 text-white font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value={2026}>2026 – 2028 Cycle (3 Years)</option>
                <option value={2027}>2027 – 2029 Cycle (3 Years)</option>
                <option value={2028}>2028 – 2030 Cycle (3 Years)</option>
                <option value={2029}>2029 – 2031 Cycle (3 Years)</option>
                <option value={2030}>2030 – 2032 Cycle (3 Years)</option>
              </select>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {masterPlanYears.map((yr, idx) => (
                  <span key={yr} className={`px-2.5 py-0.5 rounded-lg font-bold border ${idx === 0 ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : idx === 1 ? 'bg-sky-950 text-sky-300 border-sky-700' : 'bg-purple-950 text-purple-300 border-purple-700'}`}>
                    Year {idx + 1}: {yr}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={loadBackendData}
              title="Refresh from Database"
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <FaCloudDownloadAlt className="text-teal-400 text-sm" />
              <span>Reload DB</span>
            </button>
            <button
              onClick={() => handleSavePlan(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FaSave className="text-emerald-400 text-sm" />
              <span>{saving ? 'Saving...' : 'Save Drafts'}</span>
            </button>
            <button
              onClick={() => handleSavePlan(true)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/40 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FaPaperPlane className="text-sm" />
              <span>{saving ? 'Submitting...' : (['department_head', 'academic_staff', 'hod'].includes(userRole) ? 'Submit to Dean' : 'Submit to HOD')}</span>
            </button>
          </div>
        </div>

        {/* Role-Restricted Multi-stage Approval & Navigation Tabs */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 mt-6 pt-4 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'sheet'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FaTable /> <span>Draft Grid ({rows.length})</span>
          </button>

          {canAccessHod && (
            <button
              onClick={() => setActiveTab('hod_verification')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer relative ${
                activeTab === 'hod_verification'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FaUserTie /> <span>1. HOD ({hodPendingItems.length})</span>
            </button>
          )}

          {canAccessDean && (
            <button
              onClick={() => setActiveTab('dean_verification')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer relative ${
                activeTab === 'dean_verification'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FaUserCheck /> <span>2. Dean ({deanPendingItems.length})</span>
            </button>
          )}

          {canAccessBursar && (
            <button
              onClick={() => setActiveTab('bursar_verification')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer relative ${
                activeTab === 'bursar_verification'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Displays ALL pending approval items across the entire university"
            >
              <FaLandmark /> <span>3. Bursar (ALL) ({bursarPendingItems.length})</span>
            </button>
          )}

          {canAccessFc && (
            <button
              onClick={() => setActiveTab('fc_verification')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer relative ${
                activeTab === 'fc_verification'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FaLayerGroup /> <span>4. FC ({fcPendingItems.length})</span>
            </button>
          )}

          {canAccessVc && (
            <button
              onClick={() => setActiveTab('vc_verification')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer relative ${
                activeTab === 'vc_verification'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FaUniversity /> <span>5. VC ({vcPendingItems.length})</span>
            </button>
          )}

          {canAccessCouncil && (
            <button
              onClick={() => setActiveTab('council_verification')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer relative ${
                activeTab === 'council_verification'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FaGavel /> <span>6. Council ({councilPendingItems.length})</span>
            </button>
          )}

          {canAccessCompilation && (
            <button
              onClick={() => setActiveTab('compilation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer relative ${
                activeTab === 'compilation'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
              }`}
            >
              <FaCheckDouble /> <span>Compile Final Plan ({approvedItems.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Role-Protected Tab Views */}
      {activeTab === 'hod_verification' && canAccessHod ? (
        /* HOD Verification Queue View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaUserTie className="text-amber-600" />
                <span>Stage 1: Department HOD Verification Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays faculty and department related items only. Approved items are forwarded to the Faculty Dean.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
              {hodPendingItems.length} Pending
            </span>
          </div>
          {renderVerificationQueue(hodPendingItems, 'HOD', 'hod', 'All submitted items for your department have been verified.')}
        </div>
      ) : activeTab === 'dean_verification' && canAccessDean ? (
        /* Dean Verification Queue View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaUserCheck className="text-purple-600" />
                <span>Stage 2: Faculty Dean Verification Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays faculty related items only. Approved items are forwarded to the University Bursar.
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-lg">
              {deanPendingItems.length} Pending
            </span>
          </div>
          {renderVerificationQueue(deanPendingItems, 'Dean', 'dean', 'All HOD-approved items for your faculty have been verified.')}
        </div>
      ) : activeTab === 'bursar_verification' && canAccessBursar ? (
        /* Bursar Verification Queue View (ALL items) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaLandmark className="text-blue-600" />
                <span>Stage 3: Bursar Verification Queue (ALL University Items)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays <strong>ALL approval items across all faculties and departments</strong>. Approved items advance to the Finance Committee.
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">
              {bursarPendingItems.length} Pending University-Wide
            </span>
          </div>
          {renderVerificationQueue(bursarPendingItems, 'Bursar', 'bursar', 'All Dean-approved items university-wide have been verified.')}
        </div>
      ) : activeTab === 'fc_verification' && canAccessFc ? (
        /* Finance Committee Verification Queue View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaLayerGroup className="text-indigo-600" />
                <span>Stage 4: Finance Committee (FC) Verification Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review Bursar-approved procurement items. Approved items are forwarded to the Vice Chancellor (VC).
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg">
              {fcPendingItems.length} Pending
            </span>
          </div>
          {renderVerificationQueue(fcPendingItems, 'Finance Committee', 'fc', 'All Bursar-approved items have been verified by the Finance Committee.')}
        </div>
      ) : activeTab === 'vc_verification' && canAccessVc ? (
        /* VC Verification Queue View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaUniversity className="text-teal-600" />
                <span>Stage 5: Vice Chancellor (VC) Approval Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review Finance Committee-approved items. Approved items advance to University Council for final approval.
              </p>
            </div>
            <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-lg">
              {vcPendingItems.length} Pending
            </span>
          </div>
          {renderVerificationQueue(vcPendingItems, 'Vice Chancellor', 'vc', 'All FC-approved items have been verified by the Vice Chancellor.')}
        </div>
      ) : activeTab === 'council_verification' && canAccessCouncil ? (
        /* Council Verification Queue View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaGavel className="text-rose-600" />
                <span>Stage 6: University Council Final Approval Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review VC-approved items. Council approval confers final fully-approved status for Master Procurement Plan compilation.
              </p>
            </div>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-lg">
              {councilPendingItems.length} Pending Final Approval
            </span>
          </div>
          {renderVerificationQueue(councilPendingItems, 'Council', 'council', 'All VC-approved items have received Council approval.')}
        </div>
      ) : activeTab === 'compilation' && canAccessCompilation ? (
        /* Final Master Plan Compilation View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaCheckDouble className="text-emerald-600" />
                <span>Final Master Plan Compilation</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select fully approved draft procurement items (DAPP items) and compile them into an official Final Master Plan document.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">
                Selected: <strong className="text-emerald-700 font-mono text-sm">{selectedApprovedIds.length}</strong> / {approvedItems.length} items
              </span>
              <button
                onClick={handleCompileFinalPlan}
                disabled={compiling || selectedApprovedIds.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {compiling ? <FaSpinner className="animate-spin" /> : <FaCheckDouble />}
                <span>{compiling ? 'Compiling...' : 'Compile Selected Items into Final Plan'}</span>
              </button>
            </div>
          </div>

          {/* Plan Settings Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-4 text-xs">
            <div className="flex-1 min-w-60">
              <label className="block text-slate-700 font-bold mb-1">Final Master Plan Title</label>
              <input
                type="text"
                value={compilationTitle}
                onChange={(e) => setCompilationTitle(e.target.value)}
                placeholder="e.g. UWU Master Procurement Plan 2026"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div className="w-40">
              <label className="block text-slate-700 font-bold mb-1">Planning Year</label>
              <input
                type="number"
                value={compilationYear}
                onChange={(e) => setCompilationYear(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
              />
            </div>
          </div>

          {/* Approved Items Table */}
          {approvedItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FaCheckCircle className="text-5xl text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Approved Draft Items Available for Compilation</h3>
              <p className="text-xs text-slate-500 mt-1">Submit draft items and complete Council approval to populate this compilation queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedApprovedIds.length > 0 && selectedApprovedIds.length === approvedItems.length}
                        onChange={toggleSelectAllApprovedItems}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3">DAPP Item Code</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Faculty</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3 font-bold text-indigo-900 bg-indigo-50">Year Category</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Unit Cost (LKR)</th>
                    <th className="px-3 py-3 text-right font-black text-emerald-900">Total Cost (LKR)</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-mono text-[12px]">
                  {approvedItems.map((item) => {
                    const isSelected = selectedApprovedIds.includes(item._id);
                    return (
                      <tr key={item._id} className={`hover:bg-emerald-50/40 ${isSelected ? 'bg-emerald-50/70' : ''}`}>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectApprovedItem(item._id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">{item.itemCode}</td>
                        <td className="px-3 py-2 font-sans font-semibold text-slate-800">{item.description}</td>
                        <td className="px-3 py-2 font-sans text-slate-600">{item.department}</td>
                        <td className="px-3 py-2 font-sans text-slate-600">{item.faculty}</td>
                        <td className="px-3 py-2 font-sans font-bold text-slate-700">{item.category}</td>
                        <td className="px-3 py-2 font-sans font-bold text-indigo-700">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-bold">
                            {item.year || (masterPlanStartYear + ((item.plannedYear || 1) - 1))}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{item.estimatedQuantity}</td>
                        <td className="px-3 py-2 text-right">{(item.estimatedUnitCost || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-black text-emerald-800">
                          {(item.estimatedTotalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                            Approved
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Primary Spreadsheet Grid Sheet */
        <>
          {/* KPI Cards Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Draft Budget */}
            <div className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Draft Budget</p>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-inner">
                  <FaMoneyBillWave />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                LKR {stats.totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-emerald-700 font-semibold mt-2 flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-500" />
                <span>Summed from {stats.count} draft rows</span>
              </p>
            </div>

            {/* Card 2: Total Line Items */}
            <div className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Line Items</p>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-inner">
                  <FaTable />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{stats.count} Rows</h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] font-bold">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {masterPlanYears[0]}: {stats.year1Count}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300">
                  {masterPlanYears[1]}: {stats.year2Count}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">
                  {masterPlanYears[2]}: {stats.year3Count}
                </span>
              </div>
            </div>

            {/* Card 3: Participating Depts */}
            <div className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Participating Depts</p>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shadow-inner">
                  <FaBuilding />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{stats.deptsCount} Units</h3>
              <p className="text-xs text-slate-500 font-medium mt-2">Active academic & admin divisions</p>
            </div>

            {/* Card 4: Avg Item Cost & Quarterly Warnings */}
            <div className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Cost / Item</p>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg shadow-inner">
                  <FaCalculator />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
                LKR {stats.avgCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </h3>
              <div className="mt-2.5">
                {stats.invalidQuarterAllocations > 0 ? (
                  <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5 animate-pulse">
                    <FaExclamationTriangle />
                    <span>{stats.invalidQuarterAllocations} item(s) Q1-Q4 ≠ 100%</span>
                  </p>
                ) : (
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${stats.utilPercentage}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Spreadsheet Control Toolbar & Formula Bar Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Primary Action Row */}
            <div className="bg-slate-100/90 border-b border-slate-200/90 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Row actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <FaPlus /> <span>Add Row</span>
                </button>

                <button
                  onClick={handleDuplicateSelected}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300/90 text-slate-700 font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <FaCopy className="text-slate-500" /> <span>Duplicate</span>
                </button>

                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-red-50 border border-slate-300/90 text-red-600 font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <FaTrash /> <span>Delete ({selectedRows.length})</span>
                </button>

                <div className="h-5 w-px bg-slate-300 mx-1"></div>

                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo last change"
                  className="p-2 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-300/90 text-slate-700 rounded-xl shadow-2xs cursor-pointer"
                >
                  <FaUndo />
                </button>

                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo change"
                  className="p-2 bg-white hover:bg-slate-50 disabled:opacity-40 border border-slate-300/90 text-slate-700 rounded-xl shadow-2xs cursor-pointer"
                >
                  <FaRedo />
                </button>

                <button
                  onClick={handleClearSheet}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300/90 text-slate-600 font-medium rounded-xl cursor-pointer"
                >
                  Clear Grid
                </button>
              </div>

              {/* Import / Export / Auto-save status */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                  accept=".csv"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300/90 text-slate-700 font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <FaFileUpload className="text-indigo-500" /> <span>Import CSV</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300/90 text-slate-700 font-semibold rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <FaFileDownload className="text-emerald-600" /> <span>Export XLX/CSV</span>
                </button>

                <div className="flex items-center gap-2 text-slate-600 bg-slate-200/80 px-3 py-1.5 rounded-xl text-[11px] font-mono">
                  <div className={`w-2 h-2 rounded-full ${isAutoSaving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></div>
                  {isAutoSaving ? (
                    <span className="text-amber-700 font-bold">Saving...</span>
                  ) : (
                    <span className="text-slate-700 font-medium">Auto-Saved: {lastSaved}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Formula / Cell Bar */}
            <div className="bg-slate-50 border-b border-slate-200/90 px-4 py-2 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 font-mono bg-white border border-slate-300/90 rounded-lg px-2.5 py-1 text-slate-800 font-bold shadow-2xs">
                <FaCalculator className="text-indigo-600" />
                <span>{activeCellObj ? activeCellObj.cellRef : 'R1:DESCRIPTION'}</span>
              </div>
              <div className="flex-1 font-mono text-slate-800 bg-white border border-slate-300/90 rounded-lg px-3 py-1 truncate shadow-2xs">
                {activeCellObj ? (
                  <span>
                    <strong className="text-indigo-900">{activeCellObj.row.itemCode}</strong> [{selectedCell.colKey}]:{' '}
                    <span className="text-slate-800">{String(activeCellObj.value ?? '')}</span>
                    {selectedCell.colKey === 'unitCost' || selectedCell.colKey === 'quantity' ? (
                      <span className="ml-3 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        Formula: = Qty ({activeCellObj.row.quantity}) × UnitCost (LKR {Number(activeCellObj.row.unitCost).toLocaleString()})
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Click any spreadsheet cell below to view & edit formulas</span>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 bg-white border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 flex-1">
                {/* Search box */}
                <div className="relative">
                  <FaSearch className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search code, description, dept..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                {/* Dept filter */}
                <div>
                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-slate-700 font-medium"
                  >
                    <option value="ALL">All Departments ({ALL_DEPARTMENTS.length})</option>
                    {ALL_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Category filter */}
                <div>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-slate-700 font-medium"
                  >
                    <option value="ALL">All Categories</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Year filter */}
                <div>
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => setSelectedYearFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-indigo-300/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/60 text-indigo-950 font-bold"
                  >
                    <option value="ALL">All Years ({masterPlanYears.join(', ')})</option>
                    {masterPlanYears.map((y, idx) => (
                      <option key={y} value={y}>{y} (Year {idx + 1})</option>
                    ))}
                  </select>
                </div>

                {/* Priority filter */}
                <div>
                  <select
                    value={selectedPriorityFilter}
                    onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-slate-700 font-medium"
                  >
                    <option value="ALL">All Priorities</option>
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-slate-700 font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reset Filters button */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <FaTimes className="text-slate-500" />
                  <span>Clear Filters ({activeFiltersCount})</span>
                </button>
              )}
            </div>

            {/* Main Excel Grid Table Container */}
            <div className="overflow-x-auto max-h-160 overflow-y-auto border-b border-slate-200 relative">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead className="bg-slate-200 sticky top-0 z-20 text-slate-700 shadow-xs border-b border-slate-300">
                  <tr className="bg-slate-300/90 text-[10px] text-slate-700 font-mono font-bold">
                    <th className="w-10 px-2 py-1 text-center border-r border-b border-slate-300"></th>
                    <th className="w-8 px-2 py-1 text-center border-r border-b border-slate-300"></th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">A</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">B</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">C</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">D</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 bg-indigo-200/80 text-indigo-950 font-black">E (Year)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">F</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">G</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">H</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-right">I (Total)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-center">J (Q1)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-center">K (Q2)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-center">L (Q3)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-center">M (Q4)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">N</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">O</th>
                    <th className="px-2 py-1 border-b border-slate-300 text-center">P</th>
                  </tr>

                  <tr className="font-extrabold text-slate-800 bg-slate-200">
                    <th className="w-10 px-2 py-2.5 text-center border-r border-slate-300 bg-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedRows.length > 0 && selectedRows.length === filteredRows.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="w-8 px-2 py-2.5 text-center border-r border-slate-300 bg-slate-200 font-mono text-[11px]">#</th>
                    <th className="min-w-28 px-3 py-2.5 border-r border-slate-300">Item Code</th>
                    <th className="min-w-64 px-3 py-2.5 border-r border-slate-300">Item Description</th>
                    <th className="min-w-48 px-3 py-2.5 border-r border-slate-300">Department / Division</th>
                    <th className="min-w-28 px-3 py-2.5 border-r border-slate-300">Category</th>
                    <th className="min-w-32 px-3 py-2.5 border-r border-slate-300 text-center bg-indigo-100/90 text-indigo-950 font-black">
                      Year Category
                    </th>
                    <th className="min-w-28 px-3 py-2.5 border-r border-slate-300">Priority</th>
                    <th className="min-w-20 px-3 py-2.5 border-r border-slate-300 text-right">Qty</th>
                    <th className="min-w-32 px-3 py-2.5 border-r border-slate-300 text-right">Unit Cost (LKR)</th>
                    <th className="min-w-36 px-3 py-2.5 border-r border-slate-300 text-right bg-emerald-100/90 text-emerald-950 font-black">
                      Total Cost (LKR)
                    </th>
                    <th className="min-w-16 px-2 py-2.5 border-r border-slate-300 text-center">Q1 %</th>
                    <th className="min-w-16 px-2 py-2.5 border-r border-slate-300 text-center">Q2 %</th>
                    <th className="min-w-16 px-2 py-2.5 border-r border-slate-300 text-center">Q3 %</th>
                    <th className="min-w-16 px-2 py-2.5 border-r border-slate-300 text-center">Q4 %</th>
                    <th className="min-w-36 px-3 py-2.5 border-r border-slate-300">Funding Source</th>
                    <th className="min-w-28 px-3 py-2.5 border-r border-slate-300">Status</th>
                    <th className="w-12 px-2 py-2.5 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white font-mono text-[12px]">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="18" className="text-center py-16 text-slate-400 font-sans">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <FaTable className="text-4xl text-slate-300" />
                          <div>
                            <p className="font-bold text-slate-700 text-sm">No procurement requirement items found.</p>
                            <p className="text-xs text-slate-500 mt-0.5">Click "+ Add Row" above to start entering your department's procurement requirements.</p>
                          </div>
                          <button
                            onClick={handleAddRow}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            <FaPlus /> <span>Add First Requirement Item</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const calculatedTotal = (Number(row.quantity) || 0) * (Number(row.unitCost) || 0);
                      const isSelected = selectedRows.includes(row.id);
                      const quarterSum = (Number(row.q1Amount) || 0) + (Number(row.q2Amount) || 0) + (Number(row.q3Amount) || 0) + (Number(row.q4Amount) || 0);
                      const isQuarterValid = quarterSum === 100;

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-indigo-50/50 transition-colors ${isSelected ? 'bg-indigo-50/80' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                        >
                          <td className="px-2 py-1.5 text-center border-r border-slate-200 bg-slate-100/60">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(row.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          <td className="px-2 py-1.5 text-center border-r border-slate-200 bg-slate-200/60 font-bold text-slate-600 text-[11px]">
                            {idx + 1}
                          </td>

                          <td
                            onClick={() => setSelectedCell({ rowIndex: idx, colKey: 'itemCode' })}
                            className={`px-1 py-1 border-r border-slate-200 ${selectedCell.rowIndex === idx && selectedCell.colKey === 'itemCode' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''}`}
                          >
                            <input
                              type="text"
                              value={row.itemCode}
                              onChange={(e) => handleCellChange(row.id, 'itemCode', e.target.value)}
                              className="w-full bg-transparent px-2 py-1 focus:outline-none font-bold text-slate-900"
                            />
                          </td>

                          <td
                            onClick={() => setSelectedCell({ rowIndex: idx, colKey: 'description' })}
                            className={`px-1 py-1 border-r border-slate-200 ${selectedCell.rowIndex === idx && selectedCell.colKey === 'description' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''}`}
                          >
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => handleCellChange(row.id, 'description', e.target.value)}
                              className="w-full bg-transparent px-2 py-1 focus:outline-none font-sans font-semibold text-slate-900"
                            />
                          </td>

                          <td
                            onClick={() => setSelectedCell({ rowIndex: idx, colKey: 'department' })}
                            className={`px-1 py-1 border-r border-slate-200 ${selectedCell.rowIndex === idx && selectedCell.colKey === 'department' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''}`}
                          >
                            <select
                              value={row.department}
                              onChange={(e) => handleCellChange(row.id, 'department', e.target.value)}
                              className="w-full bg-transparent px-1 py-1 focus:outline-none font-sans text-slate-700 font-medium text-[11px]"
                            >
                              {ALL_DEPARTMENTS.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </td>

                          <td
                            onClick={() => setSelectedCell({ rowIndex: idx, colKey: 'category' })}
                            className={`px-1 py-1 border-r border-slate-200 ${selectedCell.rowIndex === idx && selectedCell.colKey === 'category' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''}`}
                          >
                            <select
                              value={row.category}
                              onChange={(e) => handleCellChange(row.id, 'category', e.target.value)}
                              className={`w-full bg-transparent px-2 py-1 focus:outline-none font-sans font-bold text-xs rounded ${
                                row.category === 'Goods' ? 'text-emerald-700 font-extrabold' :
                                row.category === 'Services' ? 'text-sky-700 font-extrabold' :
                                row.category === 'Works' ? 'text-amber-700 font-extrabold' :
                                'text-purple-700 font-extrabold'
                              }`}
                            >
                              {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>

                          <td
                            onClick={() => setSelectedCell({ rowIndex: idx, colKey: 'year' })}
                            className={`px-1 py-1 border-r border-slate-200 ${selectedCell.rowIndex === idx && selectedCell.colKey === 'year' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''}`}
                          >
                            <select
                              value={row.year || masterPlanYears[0]}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const yrIdx = masterPlanYears.indexOf(val);
                                handleCellChange(row.id, {
                                  year: val,
                                  plannedYear: yrIdx !== -1 ? yrIdx + 1 : 1
                                });
                              }}
                              className="w-full bg-indigo-50/90 px-1.5 py-1 focus:outline-none font-sans font-bold text-xs text-indigo-900 border border-indigo-200 rounded cursor-pointer"
                            >
                              {masterPlanYears.map((y, yIdx) => (
                                <option key={y} value={y}>Year {yIdx + 1} ({y})</option>
                              ))}
                            </select>
                          </td>

                          <td
                            onClick={() => setSelectedCell({ rowIndex: idx, colKey: 'priority' })}
                            className={`px-1 py-1 border-r border-slate-200 ${selectedCell.rowIndex === idx && selectedCell.colKey === 'priority' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''}`}
                          >
                            <select
                              value={row.priority}
                              onChange={(e) => handleCellChange(row.id, 'priority', e.target.value)}
                              className={`w-full bg-transparent px-1 py-1 focus:outline-none font-sans font-bold text-xs ${
                                row.priority === 'Critical' ? 'text-rose-700 font-black' :
                                row.priority === 'High' ? 'text-amber-700 font-extrabold' :
                                row.priority === 'Medium' ? 'text-blue-700 font-bold' :
                                'text-slate-600 font-medium'
                              }`}
                            >
                              {PRIORITIES.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </td>

                          <td
                            onClick={() => setSelectedCell({ rowIndex: idx, colKey: 'quantity' })}
                            className={`px-1 py-1 border-r border-slate-200 ${selectedCell.rowIndex === idx && selectedCell.colKey === 'quantity' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''}`}
                          >
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => handleCellChange(row.id, 'quantity', e.target.value)}
                              className="w-full bg-transparent px-2 py-1 text-right focus:outline-none font-bold text-slate-900"
                            />
                          </td>

                          <td
                            onClick={() => setSelectedCell({ rowIndex: idx, colKey: 'unitCost' })}
                            className={`px-1 py-1 border-r border-slate-200 ${selectedCell.rowIndex === idx && selectedCell.colKey === 'unitCost' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''}`}
                          >
                            <input
                              type="number"
                              value={row.unitCost}
                              onChange={(e) => handleCellChange(row.id, 'unitCost', e.target.value)}
                              className="w-full bg-transparent px-2 py-1 text-right focus:outline-none text-slate-900 font-medium"
                            />
                          </td>

                          <td className="px-3 py-1.5 border-r border-slate-200 text-right bg-emerald-50/60 font-black text-emerald-900">
                            {calculatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-1 py-1 border-r border-slate-200">
                            <input
                              type="number"
                              value={row.q1Amount}
                              onChange={(e) => handleCellChange(row.id, 'q1Amount', e.target.value)}
                              className={`w-full bg-transparent px-1 py-1 text-center focus:outline-none font-semibold ${!isQuarterValid ? 'text-amber-700 bg-amber-50/40' : 'text-slate-800'}`}
                            />
                          </td>

                          <td className="px-1 py-1 border-r border-slate-200">
                            <input
                              type="number"
                              value={row.q2Amount}
                              onChange={(e) => handleCellChange(row.id, 'q2Amount', e.target.value)}
                              className={`w-full bg-transparent px-1 py-1 text-center focus:outline-none font-semibold ${!isQuarterValid ? 'text-amber-700 bg-amber-50/40' : 'text-slate-800'}`}
                            />
                          </td>

                          <td className="px-1 py-1 border-r border-slate-200">
                            <input
                              type="number"
                              value={row.q3Amount}
                              onChange={(e) => handleCellChange(row.id, 'q3Amount', e.target.value)}
                              className={`w-full bg-transparent px-1 py-1 text-center focus:outline-none font-semibold ${!isQuarterValid ? 'text-amber-700 bg-amber-50/40' : 'text-slate-800'}`}
                            />
                          </td>

                          <td className="px-1 py-1 border-r border-slate-200">
                            <input
                              type="number"
                              value={row.q4Amount}
                              onChange={(e) => handleCellChange(row.id, 'q4Amount', e.target.value)}
                              className={`w-full bg-transparent px-1 py-1 text-center focus:outline-none font-semibold ${!isQuarterValid ? 'text-amber-700 bg-amber-50/40' : 'text-slate-800'}`}
                            />
                          </td>

                          <td className="px-1 py-1 border-r border-slate-200">
                            <select
                              value={row.fundingSource}
                              onChange={(e) => handleCellChange(row.id, 'fundingSource', e.target.value)}
                              className="w-full bg-transparent px-1 py-1 focus:outline-none font-sans text-[11px] text-slate-700 font-medium"
                            >
                              {FUNDING_SOURCES.map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </td>

                          <td className="px-2 py-1.5 border-r border-slate-200 font-sans">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              row.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              row.status === 'Submitted to HOD' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              row.status === 'Submitted to Dean' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                              row.status === 'Submitted to Bursar' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              row.status === 'Submitted to FC' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                              row.status === 'Submitted to VC' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                              row.status === 'Submitted to Council' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              row.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              'bg-slate-100 text-slate-700 border-slate-300'
                            }`}>
                              {row.status}
                            </span>
                          </td>

                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => {
                                const updated = rows.filter(r => r.id !== row.id);
                                updateRowsState(updated);
                              }}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1.5 cursor-pointer"
                              title="Delete row"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Excel Status & Summary Bar */}
            <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-3 font-mono">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> READY
                </span>
                <span>ROWS: <strong className="text-slate-900">{filteredRows.length}</strong></span>
                <span>SELECTED: <strong className="text-indigo-700">{selectedRows.length}</strong></span>
              </div>

              <div className="flex flex-wrap items-center gap-6 font-bold">
                <span>
                  SUM: <strong className="text-emerald-800 text-sm">LKR {stats.totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </span>
                <span>
                  AVG: <strong className="text-indigo-800">LKR {stats.avgCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
