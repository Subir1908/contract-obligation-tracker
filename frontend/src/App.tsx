import { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { MetricsCards } from './components/MetricsCards';
import { DocumentUploadZone } from './components/DocumentUploadZone';
import { ObligationsTable } from './components/ObligationsTable';
import { DocumentPreviewPane } from './components/DocumentPreviewPane';
import { AuthModal } from './components/AuthModal';
import { TenantWorkspaceBar } from './components/TenantWorkspaceBar';
import { PrintReportView } from './components/PrintReportView';
import { NotificationToast } from './components/NotificationToast';
import type {
  ContractObligation,
  TimelineStatus,
  RiskLevel,
  DocumentMetadata,
  ParsingStage,
  NotificationToastData,
  CurrencyCode,
  UserAccount,
  StoredContractRecord,
} from './types/obligation';
import { getTodayIsoString, USD_TO_INR_RATE, normalizeDateString } from './utils/dateUtils';
import { DEMO_CONTRACT_BUNDLES } from './data/mockContracts';
import {
  exportToCsv,
  exportToExcel,
  exportToIcsCalendar,
  triggerPrintReport,
} from './utils/exportUtils';
import {
  getStoredBackendUser,
  clearAuthSession,
  fetchUserContractsWithObligations,
  fetchContractObligations,
  uploadContractToBackend,
  createObligationOnBackend,
  updateObligationOnBackend,
  deleteObligationOnBackend,
  deleteContractOnBackend,
} from './services/api';
import { ShieldCheck, Lock } from 'lucide-react';

const EMPTY_METADATA: DocumentMetadata = {
  fileName: 'No contract uploaded yet',
  fileSize: '0 MB',
  pageCount: 0,
  uploadedAt: '',
  contractTitle: 'No Active Contract',
  contractType: 'N/A',
  parties: [],
};

const INITIAL_STAGES: ParsingStage[] = [
  { id: 1, name: 'Uploading & validating PDF/DOCX document...', description: 'Checking file size, page count & format', status: 'pending' },
  { id: 2, name: 'Running spaCy + rule-based NLP clause classifier...', description: 'Filtering boilerplate & isolating binding obligations', status: 'pending' },
  { id: 3, name: 'Extracting parties, dates, amounts & penalties...', description: 'Normalizing dates & currency values', status: 'pending' },
  { id: 4, name: 'Persisting obligations, deadlines & risk scores...', description: 'Saving to backend database', status: 'pending' },
];

export function App() {
  const [referenceDate, setReferenceDate] = useState<string>(() => getTodayIsoString());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getStoredBackendUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !getStoredBackendUser());

  const [tenantContracts, setTenantContracts] = useState<StoredContractRecord[]>([]);
  const [activeContractId, setActiveContractId] = useState<string>('');

  const [metadata, setMetadata] = useState<DocumentMetadata>(EMPTY_METADATA);
  const [obligations, setObligations] = useState<ContractObligation[]>([]);

  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | TimelineStatus>('ALL');
  const [activeRiskFilter, setActiveRiskFilter] = useState<'ALL' | RiskLevel>('ALL');

  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingProgress, setParsingProgress] = useState<number>(0);
  const [parsingStages, setParsingStages] = useState<ParsingStage[]>(INITIAL_STAGES);

  const [toasts, setToasts] = useState<NotificationToastData[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [conversionMultiplier, setConversionMultiplier] = useState<number>(1);

  const [isPreviewPaneOpen, setIsPreviewPaneOpen] = useState<boolean>(true);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);

  const recentlyDeletedRef = useRef<{ item: ContractObligation; index: number } | null>(null);

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

  // Load real contracts & obligations from backend whenever an authenticated user is active
  useEffect(() => {
    let cancelled = false;

    async function loadBackendData() {
      if (!currentUser) {
        setTenantContracts([]);
        setActiveContractId('');
        setMetadata(EMPTY_METADATA);
        setObligations([]);
        return;
      }

      try {
        const contracts = await fetchUserContractsWithObligations(currentUser);
        if (cancelled) return;
        setTenantContracts(contracts);

        if (contracts.length > 0) {
          const latest = contracts[0];
          setActiveContractId(latest.contractId);
          setMetadata(latest.metadata);
          setObligations(latest.obligations);
        } else {
          setActiveContractId('');
          setMetadata(EMPTY_METADATA);
          setObligations([]);
        }
      } catch (err) {
        if (cancelled) return;
        addToast({
          type: 'error',
          title: 'Failed to Load Workspace Data',
          message: err instanceof Error ? err.message : 'Could not fetch contracts from backend.',
        });
      }
    }

    loadBackendData();
    return () => {
      cancelled = true;
    };
  }, [currentUser, addToast]);

  const handleSelectTenantContract = useCallback(async (contract: StoredContractRecord) => {
  setActiveContractId(contract.contractId);
  setMetadata(contract.metadata);
  setObligations(contract.obligations);
  setActiveStatusFilter('ALL');
  setActiveRiskFilter('ALL');
  setActiveClauseId(null);

  if (/^(ctr-)?\d+$/i.test(contract.contractId)) {
    try {
      const freshObs = await fetchContractObligations(contract.contractId);
      setObligations(freshObs);
    } catch {
      // Keep obligations already loaded on the contract record
    }
  }

  addToast({
    type: 'info',
    title: 'Contract Loaded',
    message: `Switched to "${contract.fileName}" (#${contract.contractId}).`,
  });
}, [addToast]);

  const handleDeleteContract = useCallback(async (contractId: string, contractName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete contract "${contractName}" and all its extracted obligations? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteContractOnBackend(contractId);
    } catch (err) {
      console.warn('Backend contract delete warning:', err);
    }

    // Update local state
    setTenantContracts(prev => {
      const remaining = prev.filter(c => c.contractId !== contractId);
      if (activeContractId === contractId) {
        if (remaining.length > 0) {
          const nextContract = remaining[0];
          setActiveContractId(nextContract.contractId);
          setMetadata(nextContract.metadata);
          setObligations(nextContract.obligations);
        } else {
          setActiveContractId('');
          setMetadata(EMPTY_METADATA);
          setObligations([]);
        }
      }
      return remaining;
    });

    addToast({
      type: 'success',
      title: 'Contract Deleted',
      message: `"${contractName}" has been successfully deleted.`,
    });
  }, [activeContractId, addToast]);

  const handleCurrencyChange = useCallback((newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    if (newCurrency === 'USD') {
      setConversionMultiplier(1 / USD_TO_INR_RATE);
    } else {
      setConversionMultiplier(1);
    }
    addToast({
      type: 'info',
      title: `Currency Switched: ${newCurrency === 'INR' ? 'Indian Rupees (₹)' : 'US Dollars ($)'}`,
      message: newCurrency === 'INR'
        ? 'Formatted with Indian numbering standard (₹, Lakhs & Crores).'
        : `Converted at $1 = ₹${USD_TO_INR_RATE}.`,
      duration: 3500,
    });
  }, [addToast]);

  const handleUpdateObligation = useCallback((id: string, updates: Partial<ContractObligation>) => {
    // Optimistically update frontend state
    setObligations(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        return { ...item, ...updates };
      });

      // Also keep tenantContracts synchronized so switching contracts retains edits
      setTenantContracts(currList => currList.map(c => {
        if (c.contractId !== activeContractId) return c;
        return {
          ...c,
          obligations: c.obligations.map(ob => ob.id === id ? { ...ob, ...updates } : ob),
        };
      }));

      return next;
    });

    // Sync to backend if valid ID
    if (/^(ob-)?\d+$/i.test(id)) {
      const syncPayload = { ...updates };
      if (syncPayload.dueDate !== undefined && syncPayload.dueDate !== '') {
        const normalized = normalizeDateString(syncPayload.dueDate);
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
          syncPayload.dueDate = normalized;
        } else {
          // Wait until a complete valid date is entered before sending to backend
          return;
        }
      }

      updateObligationOnBackend(id, syncPayload).catch(err => {
        console.warn('Backend sync warning:', err);
      });
    }
  }, [activeContractId]);

  const handleDeleteObligation = useCallback((id: string) => {
    setObligations(prev => {
      const idx = prev.findIndex(o => o.id === id);
      if (idx === -1) return prev;
      const deletedItem = prev[idx];
      recentlyDeletedRef.current = { item: deletedItem, index: idx };

      if (/^(ob-)?\d+$/i.test(id)) {
        deleteObligationOnBackend(id).catch(() => {});
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
              return copy;
            });
            recentlyDeletedRef.current = null;
          }
        },
      });

      return prev.filter(o => o.id !== id);
    });
  }, [addToast]);

  const handleDuplicateObligation = useCallback(async (id: string) => {
    const target = obligations.find(o => o.id === id);
    if (!target || !activeContractId) return;

    try {
      const created = await createObligationOnBackend({
        contractId: activeContractId,
        description: `[Copy] ${target.description}`,
        responsibleParty: target.responsibleParty,
        dueDate: target.dueDate,
        monetaryValue: target.monetaryValue,
        currency,
        latePenalty: target.latePenalty,
        sourceClause: target.sourceClause,
      });
      setObligations(prev => [...prev, created]);
      addToast({
        type: 'success',
        title: 'Obligation Duplicated',
        message: `Saved duplicate row (${created.id}) to backend.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Duplicate Failed',
        message: err instanceof Error ? err.message : 'Could not duplicate obligation.',
      });
    }
  }, [obligations, activeContractId, currency, addToast]);

  const handleAddObligation = useCallback(async () => {
    if (!activeContractId) {
      addToast({
        type: 'warning',
        title: 'Upload a Contract First',
        message: 'Upload a PDF or DOCX contract to create obligations under it.',
      });
      return;
    }

    try {
      const created = await createObligationOnBackend({
        contractId: activeContractId,
        description: 'New contractual obligation or deliverable requirement',
        responsibleParty: 'Vendor',
        dueDate: referenceDate,
        monetaryValue: 100000,
        currency,
        latePenalty: '1% per week of delay',
        sourceClause: 'Manually added obligation',
      });
      setObligations(prev => [created, ...prev]);
      addToast({
        type: 'success',
        title: 'Obligation Created',
        message: `Added obligation ${created.id} to database.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Create Failed',
        message: err instanceof Error ? err.message : 'Could not save new obligation.',
      });
    }
  }, [activeContractId, referenceDate, currency, addToast]);

  const handleFileAccepted = useCallback(async (file: File) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      addToast({
        type: 'warning',
        title: 'Sign In Required',
        message: 'Please sign in first so your uploaded contract can be processed by the backend.',
      });
      return;
    }

    setIsParsing(true);
    setParsingProgress(25);
    setParsingStages(
      INITIAL_STAGES.map(s =>
        s.id === 1 ? { ...s, status: 'completed' } : s.id === 2 ? { ...s, status: 'in_progress' } : s
      )
    );

    try {
      const record = await uploadContractToBackend(file, currentUser);
      setParsingProgress(100);
      setParsingStages(INITIAL_STAGES.map(s => ({ ...s, status: 'completed' })));

      setActiveContractId(record.contractId);
      setMetadata(record.metadata);
      setObligations(record.obligations);
      setTenantContracts(prev => [record, ...prev.filter(c => c.contractId !== record.contractId)]);
      setIsPreviewPaneOpen(true);

      addToast({
        type: 'success',
        title: 'NLP Extraction Complete',
        message: `Extracted ${record.obligations.length} obligation(s) from "${record.fileName}".`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Upload / NLP Error',
        message: err instanceof Error ? err.message : 'Failed to process contract on server.',
        duration: 7000,
      });
    } finally {
      setIsParsing(false);
    }
  }, [currentUser, addToast]);

  const handleValidationError = useCallback((title: string, message: string) => {
    addToast({ type: 'error', title, message, duration: 7000 });
  }, [addToast]);

  const handleSelectDemoBundle = useCallback(async (bundleId: string) => {
    const matching = tenantContracts.find(c => c.contractId === bundleId);
    if (matching) {
      await handleSelectTenantContract(matching);
      return;
    }

    const bundle = DEMO_CONTRACT_BUNDLES.find(b => b.id === bundleId);
    if (!bundle) {
      addToast({
        type: 'error',
        title: 'Preset Not Found',
        message: `Could not locate preset agreement "${bundleId}".`,
      });
      return;
    }

    const demoObligations = bundle.getObligations(referenceDate);
    setActiveContractId(bundle.id);
    setMetadata(bundle.metadata);
    setObligations(demoObligations);
    setActiveStatusFilter('ALL');
    setActiveRiskFilter('ALL');
    setActiveClauseId(null);
    setIsPreviewPaneOpen(true);

    addToast({
      type: 'success',
      title: 'Preset Agreement Loaded',
      message: `Loaded "${bundle.title}" with ${demoObligations.length} obligations.`,
    });
  }, [tenantContracts, handleSelectTenantContract, referenceDate, addToast]);

  const handleLoadDemoContract = useCallback(() => {
    if (tenantContracts.length > 0) {
      handleSelectTenantContract(tenantContracts[0]);
    } else {
      addToast({
        type: 'info',
        title: 'No Contracts Yet',
        message: 'Upload a PDF or DOCX agreement to extract obligations.',
      });
    }
  }, [tenantContracts, handleSelectTenantContract, addToast]);

  const handleReset = useCallback(() => {
    setActiveStatusFilter('ALL');
    setActiveRiskFilter('ALL');
  }, []);

  const handleExportCsv = useCallback(() => {
    exportToCsv(obligations, metadata, referenceDate, currency, conversionMultiplier);
    addToast({ type: 'success', title: 'CSV Exported', message: 'Downloaded obligations CSV file.' });
  }, [obligations, metadata, referenceDate, currency, conversionMultiplier, addToast]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(obligations, metadata, referenceDate, currency, conversionMultiplier);
    addToast({ type: 'success', title: 'Excel Exported', message: 'Downloaded obligations .xlsx workbook.' });
  }, [obligations, metadata, referenceDate, currency, conversionMultiplier, addToast]);

  const handleExportIcs = useCallback(() => {
    exportToIcsCalendar(obligations, metadata.contractTitle);
    addToast({ type: 'success', title: 'Calendar Exported', message: 'Downloaded milestones .ics file.' });
  }, [obligations, metadata, addToast]);

  const handlePrint = useCallback(() => {
    triggerPrintReport();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
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
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {!currentUser ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto my-8 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Sign In to Contract Obligation Tracker
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authenticate with your backend account to upload contracts, run NLP obligation extraction, and manage your workspace obligations.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Open Sign In / Register</span>
            </button>
          </div>
        ) : (
          <>
            <div className="no-print bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                      CSMC502 Software Engineering Lab • Tezpur University
                    </span>
                    <span className="text-[11px] text-emerald-300 font-medium">
                      Tenant: {currentUser.organization}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
                    Contract Obligation Tracker (COT)
                  </h2>
                  <p className="text-xs text-blue-100/80 leading-relaxed">
                    Upload PDF or DOCX contracts for automated NLP obligation extraction, deadline tracking, risk scoring, and structured export.
                  </p>
                </div>
              </div>
            </div>

            <TenantWorkspaceBar
              currentUser={currentUser}
              contracts={tenantContracts}
              activeContractId={activeContractId}
              onSelectContract={handleSelectTenantContract}
              onDeleteContract={handleDeleteContract}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />

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

            <DocumentPreviewPane
              metadata={metadata}
              obligations={obligations}
              activeClauseId={activeClauseId}
              onSelectObligation={(id) => setActiveClauseId(id)}
              isOpen={isPreviewPaneOpen}
              onToggle={() => setIsPreviewPaneOpen(!isPreviewPaneOpen)}
            />

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

            <PrintReportView
              obligations={obligations}
              metadata={metadata}
              referenceDate={referenceDate}
              currency={currency}
              conversionMultiplier={conversionMultiplier}
            />
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Contract Obligation Tracker (COT)</span>
            <span>• Tezpur University CSE</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-700 font-medium">
              {currentUser ? `Authenticated: ${currentUser.email}` : 'Unauthenticated'}
            </span>
          </div>
        </div>
      </footer>

      <AuthModal
        currentUser={currentUser}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(acc) => {
          setCurrentUser(acc);
          addToast({
            type: 'success',
            title: 'Authenticated',
            message: `Signed in as ${acc.email}.`,
          });
        }}
        onLogout={() => {
          clearAuthSession();
          setCurrentUser(null);
          setIsAuthModalOpen(true);
          addToast({
            type: 'info',
            title: 'Signed Out',
            message: 'Cleared backend session token.',
          });
        }}
      />

      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;