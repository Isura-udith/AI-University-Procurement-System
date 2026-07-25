import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FaTable, FaPlus, FaTrash, FaCopy, FaFileDownload, FaFileUpload,
  FaSave, FaPaperPlane, FaSearch, FaRedo, FaUndo,
  FaCalculator, FaCheckCircle, FaBuilding, FaMoneyBillWave,
  FaExclamationTriangle, FaTimes, FaSpinner, FaCloudDownloadAlt,
  FaUserCheck, FaThumbsUp, FaThumbsDown
} from 'react-icons/fa';
import planningService from '../../../services/planning.service';
import { DEPARTMENTS_AND_FACULTIES, DEPARTMENTS_BY_FACULTY, ALL_DEPARTMENTS } from '../../../constants/departments';

const CATEGORIES = ['Goods', 'Services', 'Works', 'Consulting'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const FUNDING_SOURCES = ['Recurrent Budget', 'Capital Budget', 'Research Grant', 'Trust Fund', 'Self-Generated Fund'];
const STATUSES = ['Draft', 'Submitted to Dean', 'Approved', 'Rejected'];

export default function DraftMasterPlanSheet() {
  const { user } = useSelector(s => s.auth);
  const fileInputRef = useRef(null);

  // Department default setting based on user role/faculty
  const defaultFaculty = user?.faculty || DEPARTMENTS_AND_FACULTIES[0];
  const defaultDept = user?.department || DEPARTMENTS_BY_FACULTY[defaultFaculty]?.[0] || ALL_DEPARTMENTS[0];

  // Active View Tab: 'sheet' (Grid Editor) vs 'verification' (Dean Approval Queue)
  const [activeTab, setActiveTab] = useState('sheet');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Main Rows State (Initialized empty until fetched from backend)
  const [rows, setRows] = useState([]);

  // Pending Items for Dean Verification
  const [pendingItems, setPendingItems] = useState([]);
  const [verifyingId, setVerifyingId] = useState(null);

  // Cell Selection & Focus State
  const [selectedCell, setSelectedCell] = useState({ rowIndex: 0, colKey: 'description' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [lastSaved, setLastSaved] = useState(new Date().toLocaleTimeString());
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // History state for Undo / Redo
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Parse items fetched from DraftProcurementItem database table
  const parseDraftItems = useCallback((itemsList) => {
    if (!Array.isArray(itemsList)) return;
    const mappedRows = itemsList.map((item, idx) => ({
      id: item._id || `ROW-DB-${idx + 1}`,
      dbId: item._id,
      itemCode: item.itemCode || `ITEM-${Math.floor(100 + Math.random() * 900)}`,
      description: item.description || '',
      department: item.department || user?.department || defaultDept,
      faculty: item.faculty || user?.faculty || defaultFaculty,
      category: item.category || 'Goods',
      priority: item.priority ? (item.priority.charAt(0).toUpperCase() + item.priority.slice(1)) : 'Medium',
      quantity: item.estimatedQuantity || 1,
      unit: item.unit || 'Units',
      unitCost: item.estimatedUnitCost || 0,
      q1Amount: item.q1Amount ?? 100,
      q2Amount: item.q2Amount ?? 0,
      q3Amount: item.q3Amount ?? 0,
      q4Amount: item.q4Amount ?? 0,
      fundingSource: item.fundingSource || 'Recurrent Budget',
      status: item.status === 'submitted_to_dean' ? 'Submitted to Dean' :
              item.status === 'approved' || item.status === 'dean_approved' ? 'Approved' :
              item.status === 'rejected' ? 'Rejected' : 'Draft',
      notes: item.justification || item.notes || ''
    }));
    setRows(mappedRows);
    setHistory([mappedRows]);
    setHistoryIndex(0);
  }, [defaultDept, defaultFaculty, user]);

  // Load draft items & pending approvals from backend
  const loadBackendData = useCallback(async () => {
    try {
      // 1. Fetch user/department draft procurement items
      const res = await planningService.getDraftItems();
      const items = res.data?.data || res.data || [];
      parseDraftItems(items);

      // 2. Fetch pending items if user is Dean, Admin or Bursar
      if (['dean', 'super_admin', 'admin', 'bursar'].includes(user?.role)) {
        const pendingRes = await planningService.getPendingDraftItems();
        setPendingItems(pendingRes.data?.data || pendingRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching draft procurement data:', err);
      toast.error('Failed to load draft procurement items from database.');
    } finally {
      setLoading(false);
    }
  }, [parseDraftItems, user]);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      if (!ignore) {
        await loadBackendData();
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
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
      const matchesPriority = selectedPriorityFilter === 'ALL' || r.priority === selectedPriorityFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || r.status === selectedStatusFilter;

      return matchesSearch && matchesDept && matchesCategory && matchesPriority && matchesStatus;
    });
  }, [rows, searchQuery, selectedDeptFilter, selectedCategoryFilter, selectedPriorityFilter, selectedStatusFilter]);

  // Key KPI calculations
  const stats = useMemo(() => {
    let totalBudget = 0;
    let goodsTotal = 0;
    let worksTotal = 0;
    let servicesTotal = 0;
    let consultingTotal = 0;
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
      deptsCount: deptsSet.size,
      count,
      avgCost,
      utilPercentage,
      invalidQuarterAllocations
    };
  }, [filteredRows]);

  // Focused active cell information display
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

  // Auto-Save effect to Local Storage as secondary cache
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
  const handleCellChange = (id, field, value) => {
    const updated = rows.map(r => {
      if (r.id === id) {
        const item = { ...r, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
          const cost = Number(field === 'unitCost' ? value : item.unitCost) || 0;
          item.calculatedTotal = qty * cost;
        }
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
      priority: 'Medium',
      quantity: 1,
      unit: 'Units',
      unitCost: 100000,
      q1Amount: 100,
      q2Amount: 0,
      q3Amount: 0,
      q4Amount: 0,
      fundingSource: 'Recurrent Budget',
      status: 'Draft',
      notes: ''
    };
    updateRowsState([...rows, newRow]);
    toast.success('New spreadsheet row added!');
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
    // Also delete from database if they have dbId
    for (const id of selectedRows) {
      const target = rows.find(r => r.id === id);
      if (target?.dbId) {
        try { await planningService.deleteDraftItem(target.dbId); } catch { /* silent catch */ }
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
      'ID', 'Item Code', 'Description', 'Department', 'Category', 'Priority',
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
          return {
            id: `ROW-IMP-${idx + 1}`,
            itemCode: cols[1] || `IMP-${idx + 1}`,
            description: cols[2] || 'Imported item',
            department: cols[3] || defaultDept,
            category: CATEGORIES.includes(cols[4]) ? cols[4] : 'Goods',
            priority: PRIORITIES.includes(cols[5]) ? cols[5] : 'Medium',
            quantity: Number(cols[6]) || 1,
            unit: cols[7] || 'Units',
            unitCost: Number(cols[8]) || 100000,
            q1Amount: Number(cols[10]) || 100,
            q2Amount: Number(cols[11]) || 0,
            q3Amount: Number(cols[12]) || 0,
            q4Amount: Number(cols[13]) || 0,
            fundingSource: cols[14] || 'Recurrent Budget',
            status: 'Draft',
            notes: cols[16] || 'Imported via CSV'
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

  // Save / Submit Draft Procurement Items to New Database Table (`DraftProcurementItem`)
  const handleSavePlan = async (isSubmit = false) => {
    if (rows.length === 0) {
      toast.warning('Spreadsheet is empty! Please add at least one row before saving.');
      return;
    }

    setSaving(true);
    try {
      // 1. Bulk save to DraftProcurementItem database table
      const res = await planningService.saveDraftItems(rows);
      const savedItems = res.data?.data || res.data || [];
      toast.success(`Saved ${savedItems.length} draft procurement item(s) to database!`);

      // 2. Submit items to Dean for verification if requested
      if (isSubmit) {
        const itemIds = savedItems.map(i => i._id).filter(Boolean);
        await planningService.submitDraftItems(itemIds);
        toast.success('Draft procurement items submitted to Faculty Dean for verification!');
      }

      // Reload fresh database state
      await loadBackendData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to save draft procurement items to database.');
    } finally {
      setSaving(false);
    }
  };

  // Dean / Office Verification Handler
  const handleApproveRejectItem = async (itemId, action) => {
    setVerifyingId(itemId);
    try {
      const comments = action === 'approve' ? 'Approved by Faculty Dean' : 'Rejected during procurement verification';
      await planningService.approveDraftItem(itemId, { action, comments });
      toast.success(action === 'approve' ? 'Draft procurement item approved!' : 'Item rejected.');
      await loadBackendData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Verification action failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  // Toggle row selection
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

  // Active filter count
  const activeFiltersCount = (selectedDeptFilter !== 'ALL' ? 1 : 0) +
    (selectedCategoryFilter !== 'ALL' ? 1 : 0) +
    (selectedPriorityFilter !== 'ALL' ? 1 : 0) +
    (selectedStatusFilter !== 'ALL' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedDeptFilter('ALL');
    setSelectedCategoryFilter('ALL');
    setSelectedPriorityFilter('ALL');
    setSelectedStatusFilter('ALL');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 font-sans">
        <FaSpinner className="text-4xl text-emerald-600 animate-spin" />
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-800">Loading Draft Procurement Items...</h3>
          <p className="text-xs text-slate-500 mt-1">Connecting to backend database & aggregating user draft items...</p>
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
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Draft Master Procurement Plan Sheet
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              All university users can enter draft procurement requirements. Submitted items undergo Dean & Office verification before department compilation into the final 3-Year Master Plan.
            </p>
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
              <span>{saving ? 'Submitting...' : 'Submit to Deans'}</span>
            </button>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="relative z-10 flex items-center gap-3 mt-6 pt-4 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'sheet'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FaTable /> <span>Draft Spreadsheet Grid ({rows.length})</span>
          </button>

          {['dean', 'super_admin', 'admin', 'bursar'].includes(user?.role) && (
            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer relative ${
                activeTab === 'verification'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FaUserCheck /> <span>Dean & Office Verification Queue</span>
              {pendingItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-bounce">
                  {pendingItems.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'verification' ? (
        /* Dean & Office Verification Queue View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FaUserCheck className="text-emerald-600" />
                <span>Faculty Dean & Office Procurement Verification Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted draft procurement items for your faculty/office before they are verified for Master Plan inclusion.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
              {pendingItems.length} Pending Approval(s)
            </span>
          </div>

          {pendingItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FaCheckCircle className="text-5xl text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Pending Items for Verification</h3>
              <p className="text-xs text-slate-500 mt-1">All submitted user draft items for your faculty/office have been verified.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map((item) => (
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
                      Submitted by: <strong className="text-slate-700">{item.createdBy?.name || 'University Staff'}</strong> ({new Date(item.submittedAt || item.createdAt).toLocaleDateString()})
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveRejectItem(item._id, 'reject')}
                        disabled={verifyingId === item._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        <FaThumbsDown /> <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleApproveRejectItem(item._id, 'approve')}
                        disabled={verifyingId === item._id}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <FaThumbsUp /> <span>Approve Item</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
              <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-slate-600">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Goods</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Services</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Works</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 flex-1">
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

              {/* Reset Filters button if active */}
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
                {/* Header with Excel Column Identifiers */}
                <thead className="bg-slate-200 sticky top-0 z-20 text-slate-700 shadow-xs border-b border-slate-300">
                  <tr className="bg-slate-300/90 text-[10px] text-slate-700 font-mono font-bold">
                    <th className="w-10 px-2 py-1 text-center border-r border-b border-slate-300"></th>
                    <th className="w-8 px-2 py-1 text-center border-r border-b border-slate-300"></th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">A</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">B</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">C</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">D</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">E</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">F</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">G</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-right">H (Total)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-center">I (Q1)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-center">J (Q2)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-center">K (Q3)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300 text-center">L (Q4)</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">M</th>
                    <th className="px-2 py-1 border-r border-b border-slate-300">N</th>
                    <th className="px-2 py-1 border-b border-slate-300 text-center">O</th>
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

                {/* Table Rows Body */}
                <tbody className="divide-y divide-slate-200 bg-white font-mono text-[12px]">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="17" className="text-center py-16 text-slate-400 font-sans">
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
                              row.status === 'Submitted to Dean' ? 'bg-amber-100 text-amber-800 border-amber-300' :
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
