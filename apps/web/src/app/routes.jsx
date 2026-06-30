import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import HomePage from "../features/public/pages/HomePage";
import DashboardLayout from "../layouts/DashboardLayout";
import { canAccessRoute, getLandingPage } from "../constants/routes";
import { ROLES } from "../constants/roles";

// Auth
import LoginPage from "../features/auth/login/LoginPage";
import RegisterPage from "../features/auth/register/RegisterPage";
import ForgotPassword from "../features/auth/forgot-password/ForgotPassword";
import ResetPassword from "../features/auth/forgot-password/ResetPassword";

// Dashboard
import DashboardPage from "../features/dashboard/DashboardPage";
import SupplierDashboard from "../features/dashboard/SupplierDashboard";

// Procurement Lifecycle (Stages 1-5)
import ProcurementList from "../features/procurement/pages/ProcurementList";
import CreateRequest from "../features/procurement/pages/CreateRequest";
import RequestDetails from "../features/procurement/pages/RequestDetails";
import ApprovalsPage from "../features/procurement/pages/ApprovalsPage";
import BudgetLockPage from "../features/procurement/pages/BudgetLockPage";

// Tendering (Stages 6-9)
import TenderList from "../features/tenders/pages/TenderList";
import CreateTender from "../features/tenders/pages/CreateTender";
import TenderDetails from "../features/tenders/pages/TenderDetails";
import BidBoxPage from "../features/tenders/pages/BidBoxPage";
import BidOpeningPage from "../features/tenders/pages/BidOpeningPage";
import EvaluationPage from "../features/tenders/pages/EvaluationPage";

// Awards & Contracts (Stages 10-12)
import AwardsPage from "../features/tenders/pages/AwardsPage";
import ContractList from "../features/contracts/pages/ContractList";
import ContractCreate from "../features/contracts/pages/ContractCreate";
import ContractDetails from "../features/contracts/pages/ContractDetails";

// Delivery & Payments (Stages 13-14)
import DeliveryPage from "../features/contracts/pages/DeliveryPage";
import PaymentList from "../features/payments/pages/PaymentList";
import PaymentDetails from "../features/payments/pages/PaymentDetails";

// Vendors
import VendorList from "../features/vendors/pages/VendorList";
import VendorDetails from "../features/vendors/pages/VendorDetails";
import VendorRegister from "../features/vendors/pages/VendorRegister";

// Reports & Audit (Stage 15)
import ReportsDashboard from "../features/reports/pages/ReportsDashboard";
import SpendAnalysis from "../features/reports/pages/SpendAnalysis";
import VendorPerformance from "../features/reports/pages/VendorPerformance";
import UserAuditPage from "../features/reports/pages/UserAuditPage";
import ArchivePage from "../features/reports/pages/ArchivePage";
import CommunicationsHub from "../features/communications/pages/CommunicationsHub";
import DocumentRepository from "../features/documents/pages/DocumentRepository";
import UserManagement from "../features/users/pages/UserManagement";

// Phase 1-4: Strategic Planning
import StrategicPlanningHub from "../features/planning/pages/StrategicPlanningHub";
import MasterPlanList from "../features/planning/pages/MasterPlanList";
import CreateMasterPlan from "../features/planning/pages/CreateMasterPlan";
import MasterPlanDetail from "../features/planning/pages/MasterPlanDetail";
import AnnualPlanList from "../features/planning/pages/AnnualPlanList";
import CreateAnnualPlan from "../features/planning/pages/CreateAnnualPlan";
import AnnualPlanDetail from "../features/planning/pages/AnnualPlanDetail";
import BudgetDistribution from "../features/planning/pages/BudgetDistribution";
import WorkflowDashboard from "../features/planning/pages/WorkflowDashboard";

// Phase 7-8: Store & Inventory
import StoreHub from "../features/store/pages/StoreHub";
import CreateGRN from "../features/store/pages/CreateGRN";
import IssueItems from "../features/store/pages/IssueItems";

// AI Intelligence Pages
import AIIntelligenceHubPage from "../features/ai/pages/AIIntelligenceHubPage";
import AIMarketPricePage from "../features/procurement/pages/AIMarketPricePage";
import AIBidVerificationPage from "../features/tenders/pages/AIBidVerificationPage";
import AISmartRecommendationsPage from "../features/tenders/pages/AISmartRecommendationsPage";
import AIMarketMonitoringPage from "../features/dashboard/AIMarketMonitoringPage";
import AIRiskAssessmentPage from "../features/procurement/pages/AIRiskAssessmentPage";
import AIComparativeAnalysisPage from "../features/tenders/pages/AIComparativeAnalysisPage";
import AIHistoricalMatchPage from "../features/ai/pages/AIHistoricalMatchPage";
import AIExplainabilityPage from "../features/ai/pages/AIExplainabilityPage";

// Checks if the authenticated user's role can access the current route
function ProtectedRoute({ children }) {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = user.role || ROLES.DEPARTMENT_USER;
  const path = location.pathname;

  if (!canAccessRoute(userRole, path)) {
    const landing = getLandingPage(userRole);
    return <Navigate to={landing} replace />;
  }

  return children;
}

function UnauthorizedPage() {
  const { user } = useSelector(state => state.auth);
  const landing = getLandingPage(user?.role);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500 mb-6">
          Your role ({user?.role ? user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown'}) does not have permission to access this area.
        </p>
        <a href={landing} className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 transition-all shadow-md">
          Go to My Dashboard
        </a>
      </div>
    </div>
  );
}

export default function RoutesConfig() {
  return (
    <Routes>
      {/* Public / Auth Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/vendor-register" element={<VendorRegister />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected / Dashboard Routes — 15-Stage Lifecycle */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/supplier-dashboard" element={<ProtectedRoute><SupplierDashboard /></ProtectedRoute>} />

        {/* Stages 1-2: Requisitions */}
        <Route path="/procurements" element={<ProtectedRoute><ProcurementList /></ProtectedRoute>} />
        <Route path="/procurements/new" element={<ProtectedRoute><CreateRequest /></ProtectedRoute>} />
        <Route path="/procurements/:id/edit" element={<ProtectedRoute><CreateRequest /></ProtectedRoute>} />
        <Route path="/procurements/:id" element={<ProtectedRoute><RequestDetails /></ProtectedRoute>} />

        {/* Stage 3: Multi-Level Approval */}
        <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />

        {/* Stage 4: Financial Validation & Budget Lock */}
        <Route path="/budget-lock" element={<ProtectedRoute><BudgetLockPage /></ProtectedRoute>} />

        {/* Stages 5-6: Strategy, Document Preparation & Solicitation */}
        <Route path="/tenders" element={<ProtectedRoute><TenderList /></ProtectedRoute>} />
        <Route path="/tenders/new" element={<ProtectedRoute><CreateTender /></ProtectedRoute>} />
        <Route path="/tenders/:id" element={<ProtectedRoute><TenderDetails /></ProtectedRoute>} />

        {/* Stage 7: Secure Digital Bidding */}
        <Route path="/bid-box" element={<ProtectedRoute><BidBoxPage /></ProtectedRoute>} />

        {/* Stage 8: Public Opening */}
        <Route path="/bid-opening" element={<ProtectedRoute><BidOpeningPage /></ProtectedRoute>} />

        {/* Stage 9: Technical & Financial Evaluation */}
        <Route path="/evaluation" element={<ProtectedRoute><EvaluationPage /></ProtectedRoute>} />

        {/* Stages 10-11: Award & Appeals */}
        <Route path="/awards" element={<ProtectedRoute><AwardsPage /></ProtectedRoute>} />

        {/* Stage 12: Contract Finalization */}
        <Route path="/contracts" element={<ProtectedRoute><ContractList /></ProtectedRoute>} />
        <Route path="/contracts/new" element={<ProtectedRoute><ContractCreate /></ProtectedRoute>} />
        <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetails /></ProtectedRoute>} />

        {/* Stage 13: Delivery & 3-Way Match */}
        <Route path="/delivery" element={<ProtectedRoute><DeliveryPage /></ProtectedRoute>} />

        {/* Stage 14: Payments */}
        <Route path="/payments" element={<ProtectedRoute><PaymentList /></ProtectedRoute>} />
        <Route path="/payments/:id" element={<ProtectedRoute><PaymentDetails /></ProtectedRoute>} />

        {/* Vendors */}
        <Route path="/vendors" element={<ProtectedRoute><VendorList /></ProtectedRoute>} />
        <Route path="/vendors/:id" element={<ProtectedRoute><VendorDetails /></ProtectedRoute>} />

        {/* Stage 15: Reports & Audit */}
        <Route path="/reports" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
        <Route path="/reports/spend" element={<ProtectedRoute><SpendAnalysis /></ProtectedRoute>} />
        <Route path="/reports/vendor-performance" element={<ProtectedRoute><VendorPerformance /></ProtectedRoute>} />
        <Route path="/reports/user-audit" element={<ProtectedRoute><UserAuditPage /></ProtectedRoute>} />
        <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />

        {/* User Management (Admin only) */}
        <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />

        {/* Hubs */}
        <Route path="/communications" element={<ProtectedRoute><CommunicationsHub /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentRepository /></ProtectedRoute>} />

        {/* Phase 1-4: Strategic Planning */}
        <Route path="/planning" element={<ProtectedRoute><StrategicPlanningHub /></ProtectedRoute>} />
        <Route path="/planning/master-plans" element={<ProtectedRoute><MasterPlanList /></ProtectedRoute>} />
        <Route path="/planning/master-plans/new" element={<ProtectedRoute><CreateMasterPlan /></ProtectedRoute>} />
        <Route path="/planning/master-plans/:id" element={<ProtectedRoute><MasterPlanDetail /></ProtectedRoute>} />
        <Route path="/planning/annual-plans" element={<ProtectedRoute><AnnualPlanList /></ProtectedRoute>} />
        <Route path="/planning/annual-plans/new" element={<ProtectedRoute><CreateAnnualPlan /></ProtectedRoute>} />
        <Route path="/planning/annual-plans/:id" element={<ProtectedRoute><AnnualPlanDetail /></ProtectedRoute>} />
        <Route path="/planning/budget-distribution" element={<ProtectedRoute><BudgetDistribution /></ProtectedRoute>} />
        <Route path="/workflow" element={<ProtectedRoute><WorkflowDashboard /></ProtectedRoute>} />

        {/* Phase 7-8: Store & Inventory */}
        <Route path="/store" element={<ProtectedRoute><StoreHub /></ProtectedRoute>} />
        <Route path="/store/grn/new" element={<ProtectedRoute><CreateGRN /></ProtectedRoute>} />
        <Route path="/store/issue" element={<ProtectedRoute><IssueItems /></ProtectedRoute>} />

        {/* AI Intelligence Hub */}
        <Route path="/ai" element={<ProtectedRoute><AIIntelligenceHubPage /></ProtectedRoute>} />

        {/* AI Intelligence Feature Pages */}
        <Route path="/ai/market-price" element={<ProtectedRoute><AIMarketPricePage /></ProtectedRoute>} />
        <Route path="/ai/bid-verification/:tenderId" element={<ProtectedRoute><AIBidVerificationPage /></ProtectedRoute>} />
        <Route path="/ai/recommendations/:tenderId" element={<ProtectedRoute><AISmartRecommendationsPage /></ProtectedRoute>} />
        <Route path="/ai/market-monitoring" element={<ProtectedRoute><AIMarketMonitoringPage /></ProtectedRoute>} />
        <Route path="/ai/risk-assessment/:procurementId" element={<ProtectedRoute><AIRiskAssessmentPage /></ProtectedRoute>} />
        <Route path="/ai/comparative-analysis/:tenderId" element={<ProtectedRoute><AIComparativeAnalysisPage /></ProtectedRoute>} />
        <Route path="/ai/historical-match/:procurementId" element={<ProtectedRoute><AIHistoricalMatchPage /></ProtectedRoute>} />
        <Route path="/ai/explainability" element={<ProtectedRoute><AIExplainabilityPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}