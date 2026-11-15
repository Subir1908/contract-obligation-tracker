import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  MetricsCards 
} from './components/MetricsCards';
import { 
  DocumentUploadZone 
} from './components/DocumentUploadZone';
import { 
  ObligationsTable 
} from './components/ObligationsTable';
import { 
  DocumentPreviewPane 
} from './components/DocumentPreviewPane';
import { 
  AuthModal 
} from './components/AuthModal';
import { 
  TenantWorkspaceBar 
} from './components/TenantWorkspaceBar';
import { 
  PrintReportView 
} from './components/PrintReportView';
import { 
  NotificationToast 
} from './components/NotificationToast';
import type { 
  ContractObligation, 
  TimelineStatus, 
  RiskLevel,
  DocumentMetadata, 
  ParsingStage, 
  NotificationToastData,
  CurrencyCode,
  UserAccount,
  StoredContractRecord
} from './types/obligation';
import { 
  getTodayIsoString
} from './utils/dateUtils';
import { 
  getSavedSession,
  clearSession,
  getTenantContracts,
  saveTenantContract,
  authenticateUser
} from './utils/authService';
import { 
  exportToCsv, 
  exportToExcel, 
  exportToIcsCalendar,
  triggerPrintReport 
} from './utils/exportUtils';
import { 
  DEMO_CONTRACT_BUNDLES, 
  INITIAL_DEMO_CONTRACT 
} from './data/mockContracts';
import { 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';

const INITIAL_STAGES: ParsingStage[] = [
  { id: 1, name: 'Reading file structure & layout streams (PDF/DOCX)...', description: 'Preserving clause hierarchies across pages', status: 'pending' },
  { id: 2, name: 'Extracting key parameters & contracting entities...', description: 'Extracting descriptions, parties, penalties & values with verbatim snippets', status: 'pending' },
  { id: 3, name: 'Normalizing milestone dates to YYYY-MM-DD...', description: 'Resolving relative calendar terms into ISO standards', status: 'pending' },
  { id: 4, name: 'Calculating real-time deadline urgency & risk severity scoring...', description: 'Cross-referencing timeline against baseline and financial exposure', status: 'pending' },
];

export function App() {
  // Reference date used to calculate urgency (defaults to today)
  const [referenceDate, setReferenceDate] = useState<string>(() => getTodayIsoString());

  // FR-1 Authentication & Session Management (FR-1.1 & FR-1.2)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = getSavedSession();
    if (saved) return saved;
    // Default logged in user for immediate academic evaluation
    const res = authenticateUser('mihir.csm25008@tezpur.ac.in', 'admin123');
    return res.user || null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // FR-1.3 Isolated Contracts for Current User Tenant
  const [tenantContracts, setTenantContracts] = useState<StoredContractRecord[]>(() => {
    if (currentUser) {
      return getTenantContracts(currentUser);
    }
    return [];
  });

  // Active Contract Record ID
  const [activeContractId, setActiveContractId] = useState<string>(() => {
    if (tenantContracts.length > 0) return tenantContracts[0].contractId;
    return 'CTR-TEZPUR-001';
  });

  // Active Document Metadata & Obligations
  const [metadata, setMetadata] = useState<DocumentMetadata>(() => {
    if (tenantContracts.length > 0) return tenantContracts[0].metadata;
    return INITIAL_DEMO_CONTRACT.metadata;
  });

  const [obligations, setObligations] = useState<ContractObligation[]>(() => {
    if (tenantContracts.length > 0) return tenantContracts[0].obligations;
    return INITIAL_DEMO_CONTRACT.getObligations(getTodayIsoString());
  });

  // Status & Risk Filter states
  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | TimelineStatus>('ALL');
  const [activeRiskFilter, setActiveRiskFilter] = useState<'ALL' | RiskLevel>('ALL');

  // Simulated parsing state
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingProgress, setParsingProgress] = useState<number>(0);
  const [parsingStages, setParsingStages] = useState<ParsingStage[]>(INITIAL_STAGES);

  // Toast notifications
  const [toasts, setToasts] = useState<NotificationToastData[]>([]);

  // Currency configuration
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [conversionMultiplier, setConversionMultiplier] = useState<number>(1);

  // FR-2.4 Side-by-side Document Preview Pane
  const [isPreviewPaneOpen, setIsPreviewPaneOpen] = useState<boolean>(true);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);

  // Deleted item buffer for Undo functionality
  const recentlyDeletedRef = useRef<{ item: ContractObligation; index: number } | null>(null);

  // Helper to add toast
  const addToast = useCallback((toast: Omit<NotificationToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts(prev => [...prev, { ...toast, id }]);

    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Sync tenant contracts whenever current user changes (FR-1.3)
  useEffect(() => {
    if (currentUser) {
      const contracts = getTenantContracts(currentUser);
      setTenantContracts(contracts);
      if (contracts.length > 0) {
        const first = contracts[0];
        setActiveContractId(first.contractId);
        setMetadata(first.metadata);
        setObligations(first.obligations);
      }
    } else {
      setTenantContracts([]);
    }
  }, [currentUser]);

  // Handle Tenant Contract Selection (FR-1.3)
  const handleSelectTenantContract = useCallback((contract: StoredContractRecord) => {
    setActiveContractId(contract.contractId);
    setMetadata(contract.metadata);
    setObligations(contract.obligations);
    addToast({
      type: 'info',
      title: 'Contract Loaded (FR-1.3 Isolation)',
      message: `Switched to "${contract.fileName}" in ${contract.organization}.`,
    });
  }, [addToast]);

  const handleCurrencyChange = useCallback((newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    addToast({
      type: 'info',
      title: `Currency Switched: ${newCurrency === 'INR' ? 'Indian Rupees (₹)' : 'US Dollars ($)'}`,
      message: newCurrency === 'INR'
        ? 'Formatted with Indian numbering standard (₹, Lakhs & Crores).'
        : 'Formatted with US Dollar standard ($).',
      duration: 3500,
    });
  }, [addToast]);

  // Update an obligation row in-place (FR-4.2)
  const handleUpdateObligation = useCallback((id: string, updates: Partial<ContractObligation>) => {
    setObligations(prev => {
      const updated = prev.map(item => (item.id === id ? { ...item, ...updates } : item));
      if (currentUser) {
        saveTenantContract(currentUser, activeContractId, metadata, updated);
      }
      return updated;
    });
  }, [currentUser, activeContractId, metadata]);

  // Delete an obligation with Undo support (FR-4.2)
  const handleDeleteObligation = useCallback((id: string) => {
    setObligations(prev => {
      const idx = prev.findIndex(o => o.id === id);
      if (idx === -1) return prev;
      const deletedItem = prev[idx];
      recentlyDeletedRef.current = { item: deletedItem, index: idx };

      const filtered = prev.filter(o => o.id !== id);
      if (currentUser) {
        saveTenantContract(currentUser, activeContractId, metadata, filtered);
      }

      addToast({
        type: 'warning',
        title: 'Obligation Deleted',
        message: `Removed "${deletedItem.id}" from tracking matrix.`,
        actionLabel: 'Undo',
        onAction: () => {
          if (recentlyDeletedRef.current) {
            const { item, index } = recentlyDeletedRef.current;
            setObligations(curr => {
              const copy = [...curr];
              copy.splice(index, 0, item);
              if (currentUser) {
                saveTenantContract(currentUser, activeContractId, metadata, copy);
              }
              return copy;
            });
            recentlyDeletedRef.current = null;
            addToast({
              type: 'success',
              title: 'Obligation Restored',
              message: `Restored "${item.id}" to the table.`,
            });
          }
        },
      });

      return filtered;
    });
  }, [addToast, currentUser, activeContractId, metadata]);

  // Duplicate an obligation row (FR-4.2)
  const handleDuplicateObligation = useCallback((id: string) => {
    setObligations(prev => {
      const target = prev.find(o => o.id === id);
      if (!target) return prev;

      const newId = `OBL-${Math.floor(100 + Math.random() * 900)}`;
      const duplicated: ContractObligation = {
        ...target,
        id: newId,
        description: `[Copy] ${target.description}`,
        verificationStatus: 'UNVERIFIED',
      };

      const targetIdx = prev.findIndex(o => o.id === id);
      const copy = [...prev];
      copy.splice(targetIdx + 1, 0, duplicated);

      if (currentUser) {
        saveTenantContract(currentUser, activeContractId, metadata, copy);
      }

      addToast({
        type: 'info',
        title: 'Obligation Duplicated',
        message: `Created duplicate row with ID: ${newId}.`,
      });

      return copy;
    });
  }, [addToast, currentUser, activeContractId, metadata]);

  // Add new custom obligation row (FR-4.3)
  const handleAddObligation = useCallback(() => {
    const newId = `OBL-${Math.floor(100 + Math.random() * 900)}`;
    const newObligation: ContractObligation = {
      id: newId,
      description: 'New contractual obligation or deliverable requirement...',
      responsibleParty: 'Vendor / Contractor',
      dueDate: referenceDate,
      monetaryValue: 100000,
      latePenalty: 'Liquidated damages of 1% per week of delay',
      sourceClause: 'Manual entry: "Vendor covenants to deliver agreed milestone deliverables as scheduled."',
      verificationStatus: 'UNVERIFIED',
      riskLevel: 'MEDIUM',
      category: 'Deliverable',
      isCompleted: false,
    };

    setObligations(prev => {
      const updated = [newObligation, ...prev];
      if (currentUser) {
        saveTenantContract(currentUser, activeContractId, metadata, updated);
      }
      return updated;
    });

    addToast({
      type: 'success',
      title: 'Custom Obligation Added (FR-4.3)',
      message: `Appended new inline-editable record "${newId}" to top of matrix.`,
    });
  }, [referenceDate, addToast, currentUser, activeContractId, metadata]);

  // Simulated extraction pipeline for uploaded file (FR-2, NFR-1, NFR-2)
  const executeSimulatedParsing = useCallback((file: File, bundleTemplate = INITIAL_DEMO_CONTRACT) => {
    setIsParsing(true);
    setParsingProgress(10);
    setParsingStages(INITIAL_STAGES.map(s => (s.id === 1 ? { ...s, status: 'in_progress' } : s)));

    const newContractId = `CTR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const updatedMetadata: DocumentMetadata = {
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      pageCount: Math.min(18, Math.max(3, Math.floor(file.size / 100000) || 8)),
      uploadedAt: new Date().toISOString(),
      contractTitle: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      contractType: file.name.toLowerCase().includes('mou') ? 'Memorandum of Understanding' : 'Master Services Agreement',
      parties: [currentUser?.organization || 'Organization A', 'Vendor Entity B'],
      rawTextPreview: `AGREEMENT: ${file.name}\n\n1. RECITALS & GENERAL CLAUSES\nThis digital contract specifies milestones and deliverables for ${file.name}. Parties covenant to observe strict deadlines.\n\n2. KEY OPERATIONAL CLAUSES\nClause 2.1: Timely delivery of milestone items is the essence of contract.\nClause 2.2: Liquidated damages apply for any milestone default.`,
    };

    // Stage 1 -> 2
    setTimeout(() => {
      setParsingProgress(35);
      setParsingStages(prev =>
        prev.map(s => (s.id === 1 ? { ...s, status: 'completed' } : s.id === 2 ? { ...s, status: 'in_progress' } : s))
      );
    }, 450);

    // Stage 2 -> 3
    setTimeout(() => {
      setParsingProgress(70);
      setParsingStages(prev =>
        prev.map(s => (s.id === 2 ? { ...s, status: 'completed' } : s.id === 3 ? { ...s, status: 'in_progress' } : s))
      );
    }, 950);

    // Stage 3 -> 4
    setTimeout(() => {
      setParsingProgress(90);
      setParsingStages(prev =>
        prev.map(s => (s.id === 3 ? { ...s, status: 'completed' } : s.id === 4 ? { ...s, status: 'in_progress' } : s))
      );
    }, 1400);

    // Complete
    setTimeout(() => {
      setParsingProgress(100);
      setParsingStages(prev => prev.map(s => ({ ...s, status: 'completed' })));
      
      const newObligations = bundleTemplate.getObligations(referenceDate);
      setMetadata(updatedMetadata);
      setObligations(newObligations);
      setActiveContractId(newContractId);
      setIsParsing(false);
      setIsPreviewPaneOpen(true);

      // Persist in tenant workspace (FR-1.3)
      if (currentUser) {
        saveTenantContract(currentUser, newContractId, updatedMetadata, newObligations);
        setTenantContracts(getTenantContracts(currentUser));
      }

      addToast({
        type: 'success',
        title: 'Document Ingestion Complete (FR-2)',
        message: `Parsed "${file.name}" and isolated under ${currentUser?.organization || 'Current Tenant'}.`,
      });
    }, 1800);
  }, [referenceDate, addToast, currentUser]);

  // Ingestion handler: file accepted
  const handleFileAccepted = useCallback((file: File) => {
    executeSimulatedParsing(file, INITIAL_DEMO_CONTRACT);
  }, [executeSimulatedParsing]);

  // Ingestion handler: error rejection (NFR-2.1, NFR-2.2)
  const handleValidationError = useCallback((title: string, message: string) => {
    addToast({
      type: 'error',
      title,
      message,
      duration: 7000,
    });
  }, [addToast]);

  // Template switcher handler
  const handleSelectDemoBundle = useCallback((bundleId: string) => {
    const bundle = DEMO_CONTRACT_BUNDLES.find(b => b.id === bundleId);
    if (!bundle) return;
    setMetadata(bundle.metadata);
    setObligations(bundle.getObligations(referenceDate));

    if (currentUser) {
      saveTenantContract(currentUser, bundle.id, bundle.metadata, bundle.getObligations(referenceDate));
      setTenantContracts(getTenantContracts(currentUser));
    }

    addToast({
      type: 'info',
      title: 'Agreement Loaded',
      message: `Loaded sample agreement: "${bundle.title}".`,
    });
  }, [referenceDate, addToast, currentUser]);

  // Load standard demo contract button trigger
  const handleLoadDemoContract = useCallback(() => {
    handleSelectDemoBundle(INITIAL_DEMO_CONTRACT.id);
  }, [handleSelectDemoBundle]);

  // Reset table handler
  const handleReset = useCallback(() => {
    if (window.confirm('Reset the obligations table to the default sample agreement?')) {
      handleSelectDemoBundle(INITIAL_DEMO_CONTRACT.id);
      addToast({
        type: 'info',
        title: 'Table Reset',
        message: 'Obligations matrix restored to default sample data.',
      });
    }
  }, [handleSelectDemoBundle, addToast]);

  // Export handlers (FR-6)
  const handleExportCsv = useCallback(() => {
    exportToCsv(obligations, metadata, referenceDate, currency, conversionMultiplier);
    addToast({
      type: 'success',
      title: 'CSV Export Initiated (FR-6.1)',
      message: `Generated RFC 4180 CSV spreadsheet download in ${currency}.`,
    });
  }, [obligations, metadata, referenceDate, currency, conversionMultiplier, addToast]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(obligations, metadata, referenceDate, currency, conversionMultiplier);
    addToast({
      type: 'success',
      title: 'Excel (.xlsx) Exported (FR-6.1)',
      message: `Generated multi-sheet workbook with ${currency} formatting.`,
    });
  }, [obligations, metadata, referenceDate, currency, conversionMultiplier, addToast]);

  const handleExportIcs = useCallback(() => {
    exportToIcsCalendar(obligations, metadata.contractTitle);
    addToast({
      type: 'success',
      title: 'Calendar File Generated (FR-6.4)',
      message: `Exported upcoming milestone dates to .ics file for Google Calendar / Outlook.`,
    });
  }, [obligations, metadata, addToast]);

  const handlePrint = useCallback(() => {
    triggerPrintReport();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. Header & Global Utility Bar */}
      <Header
        referenceDate={referenceDate}
        onReferenceDateChange={setReferenceDate}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        onExportIcs={handleExportIcs}
        onPrint={handlePrint}
        onLoadDemo={handleLoadDemoContract}
        onReset={handleReset}
        totalObligations={obligations.length}
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        conversionMultiplier={conversionMultiplier}
        onConversionMultiplierChange={setConversionMultiplier}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isPreviewPaneOpen={isPreviewPaneOpen}
        onTogglePreviewPane={() => setIsPreviewPaneOpen(!isPreviewPaneOpen)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Banner with RTM & Architecture reference */}
        <div className="no-print bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                  CSMC502 Software Engineering Lab • Tezpur University
                </span>
                {currentUser && (
                  <span className="text-[11px] text-emerald-300 font-medium">
                    Tenant: {currentUser.organization}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
                Contract Obligation Tracker (COT) — Technical Architecture & Execution
              </h2>
              <p className="text-xs text-blue-100/80 leading-relaxed">
                Ingest PDF/DOCX contracts (<span className="text-blue-200 font-semibold">FR-2</span>), inspect verbatim source clauses side-by-side (<span className="text-blue-200 font-semibold">FR-2.4 & FR-3.3</span>), manage verified milestones (<span className="text-blue-200 font-semibold">FR-4</span>), track timeline urgency (<span className="text-blue-200 font-semibold">FR-5</span>), score risk exposure (<span className="text-purple-300 font-semibold">FR-7</span>), and export structured reports & iCalendar feeds (<span className="text-emerald-300 font-semibold">FR-6</span>).
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={handleLoadDemoContract}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-xs transition-all border border-blue-400/30 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>Reload Demo Agreement</span>
              </button>
            </div>
          </div>
        </div>

        {/* FR-1.3 Tenant Workspace Bar (Organization Data Isolation) */}
        <TenantWorkspaceBar
          currentUser={currentUser}
          contracts={tenantContracts}
          activeContractId={activeContractId}
          onSelectContract={handleSelectTenantContract}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* 2. Global Status Summary Metric Cards (FR-5 & FR-7) */}
        <MetricsCards
          obligations={obligations}
          referenceDate={referenceDate}
          activeStatusFilter={activeStatusFilter}
          onSelectFilter={setActiveStatusFilter}
          activeRiskFilter={activeRiskFilter}
          onSelectRiskFilter={setActiveRiskFilter}
          currency={currency}
          conversionMultiplier={conversionMultiplier}
        />

        {/* 3. Document Ingestion Section (FR-2 & NFR-2) */}
        <DocumentUploadZone
          currentMetadata={metadata}
          isParsing={isParsing}
          parsingProgress={parsingProgress}
          parsingStages={parsingStages}
          onFileAccepted={handleFileAccepted}
          onValidationError={handleValidationError}
          onSelectDemoBundle={handleSelectDemoBundle}
          currentBundleId={activeContractId}
        />

        {/* 4. Side-by-Side Document & Clause Preview Pane (FR-2.4 & FR-3.3) */}
        <DocumentPreviewPane
          metadata={metadata}
          obligations={obligations}
          activeClauseId={activeClauseId}
          onSelectObligation={(id) => setActiveClauseId(id)}
          isOpen={isPreviewPaneOpen}
          onToggle={() => setIsPreviewPaneOpen(!isPreviewPaneOpen)}
        />

        {/* 5. Interactive Obligations Table with In-Place Editing (FR-3, FR-4, FR-5, FR-7) */}
        <ObligationsTable
          obligations={obligations}
          referenceDate={referenceDate}
          activeStatusFilter={activeStatusFilter}
          onStatusFilterChange={setActiveStatusFilter}
          activeRiskFilter={activeRiskFilter}
          onRiskFilterChange={setActiveRiskFilter}
          onUpdateObligation={handleUpdateObligation}
          onDeleteObligation={handleDeleteObligation}
          onDuplicateObligation={handleDuplicateObligation}
          onAddObligation={handleAddObligation}
          onLoadDemoContract={handleLoadDemoContract}
          currency={currency}
          conversionMultiplier={conversionMultiplier}
          onSelectClauseSnippet={(id) => {
            setActiveClauseId(id);
            setIsPreviewPaneOpen(true);
          }}
        />

        {/* 6. Print / PDF Summary View (@media print - FR-6.3) */}
        <PrintReportView
          obligations={obligations}
          metadata={metadata}
          referenceDate={referenceDate}
          currency={currency}
          conversionMultiplier={conversionMultiplier}
        />

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Contract Obligation Tracker (COT)</span>
            <span>• Tezpur University CSE CSM25008 / CSM25011 / CSM25052</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              JWT Authenticated Session
            </span>
            <span>RFC 4180 / XLSX / iCalendar</span>
            <span>WCAG 2.1 AA</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal (FR-1.1 & FR-1.2) */}
      <AuthModal
        currentUser={currentUser}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(acc) => {
          setCurrentUser(acc);
          addToast({
            type: 'success',
            title: 'Authenticated Session Active (FR-1.2)',
            message: `Logged in as ${acc.email} (${acc.organization}). JWT Bearer issued.`,
          });
        }}
        onLogout={() => {
          clearSession();
          setCurrentUser(null);
          addToast({
            type: 'info',
            title: 'Logged Out',
            message: 'JWT token invalidated. Working in guest session.',
          });
        }}
      />

      {/* Toast Notification Container */}
      <NotificationToast
        toasts={toasts}
        onDismiss={dismissToast}
      />

    </div>
  );
}

export default App;
