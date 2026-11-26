import { useState, useCallback, useRef, useEffect } from 'react';
import { Sidebar, type WorkspaceSection } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricsCards } from './components/MetricsCards';
import { AnalyticsOverview } from './components/AnalyticsOverview';
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
import { Lock } from 'lucide-react';

const EMPTY_METADATA: DocumentMetadata = {
  fileName: 'No contract uploaded yet',
  fileSize: '',
  pageCount: 0,
  uploadedAt: '',
  contractTitle: 'No active contract',
  contractType: 'N/A',
  parties: [],
};

const INITIAL_STAGES: ParsingStage[] = [
  { id: 1, name: 'Uploading document to server', description: 'Transferring PDF/DOCX to workspace', status: 'pending' },
  { id: 2, name: 'Extracting text structure', description: 'Reading document paragraphs and tables', status: 'pending' },
  { id: 3, name: 'Extracting obligations, dates & amounts', description: 'Normalizing clauses and deadlines', status: 'pending' },
  { id: 4, name: 'Saving contract records', description: 'Persisting obligations to workspace', status: 'pending' },
];

const SECTION_TITLES: Record<WorkspaceSection, string> = {
  dashboard: 'Dashboard',
  documents: 'Contracts & Source Preview',
  obligations: 'Obligations Ledger',
  analytics: 'Exposure & Risk Analytics',
};

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getStoredBackendUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [tenantContracts, setTenantContracts] = useState<StoredContractRecord[]>([]);
  const [activeContractId, setActiveContractId] = useState<string>('');
  const [referenceDate, setReferenceDate] = useState<string>(getTodayIsoString());
  const [obligations, setObligations] = useState<ContractObligation[]>([]);
  const [metadata, setMetadata] = useState<DocumentMetadata>(EMPTY_METADATA);

  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | TimelineStatus>('ALL');
  const [activeRiskFilter, setActiveRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingStages, setParsingStages] = useState<ParsingStage[]>(INITIAL_STAGES);

  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [conversionMultiplier, setConversionMultiplier] = useState<number>(1);
  const [isPreviewPaneOpen, setIsPreviewPaneOpen] = useState(false);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<NotificationToastData[]>([]);

  // Shell layout state
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const recentlyDeletedRef = useRef<{ item: ContractObligation; index: number } | null>(null);

  const addToast = useCallback((toast: Omit<NotificationToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duration = toast.duration || 4500;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
          title: 'Failed to load workspace data',
          message: err instanceof Error ? err.message : 'Could not fetch contracts from backend.',
        });
      }
    }

    loadBackendData();
    return () => {
      cancelled = true;
    };
  }, [currentUser, addToast]);

  const handleSelectTenantContract = useCallback(
    async (contract: StoredContractRecord) => {
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
        title: 'Contract loaded',
        message: `Switched to "${contract.fileName}".`,
      });
    },
    [addToast]
  );

  const handleDeleteContract = useCallback(
    async (contractId: string, contractName: string) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete contract "${contractName}" and all its extracted obligations? This action cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await deleteContractOnBackend(contractId);
      } catch (err) {
        console.warn('Backend contract delete warning:', err);
      }

      setTenantContracts((prev) => {
        const remaining = prev.filter((c) => c.contractId !== contractId);
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
        title: 'Contract deleted',
        message: `"${contractName}" has been removed.`,
      });
    },
    [activeContractId, addToast]
  );

  const handleCurrencyChange = useCallback(
    (newCurrency: CurrencyCode) => {
      setCurrency(newCurrency);
      setConversionMultiplier(newCurrency === 'USD' ? 1 / USD_TO_INR_RATE : 1);
      addToast({
        type: 'info',
        title: `Currency: ${newCurrency}`,
        message:
          newCurrency === 'INR'
            ? 'Displaying amounts in Indian Rupees (₹).'
            : `Converted at $1 = ₹${USD_TO_INR_RATE}.`,
        duration: 3000,
      });
    },
    [addToast]
  );

  const handleUpdateObligation = useCallback(
    (id: string, updates: Partial<ContractObligation>) => {
      setObligations((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));

        setTenantContracts((currList) =>
          currList.map((c) => {
            if (c.contractId !== activeContractId) return c;
            return {
              ...c,
              obligations: c.obligations.map((ob) => (ob.id === id ? { ...ob, ...updates } : ob)),
            };
          })
        );

        return next;
      });

      if (/^(ob-)?\d+$/i.test(id)) {
        const syncPayload = { ...updates };
        if (syncPayload.dueDate !== undefined && syncPayload.dueDate !== '') {
          const normalized = normalizeDateString(syncPayload.dueDate);
          if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            syncPayload.dueDate = normalized;
          } else {
            return;
          }
        }

        updateObligationOnBackend(id, syncPayload).catch((err) => {
          console.warn('Backend sync warning:', err);
        });
      }
    },
    [activeContractId]
  );

  const handleDeleteObligation = useCallback(
    (id: string) => {
      setObligations((prev) => {
        const idx = prev.findIndex((o) => o.id === id);
        if (idx === -1) return prev;
        const deletedItem = prev[idx];
        recentlyDeletedRef.current = { item: deletedItem, index: idx };

        if (/^(ob-)?\d+$/i.test(id)) {
          deleteObligationOnBackend(id).catch(() => {});
        }

        addToast({
          type: 'warning',
          title: 'Obligation deleted',
          message: `Removed obligation from tracking ledger.`,
          actionLabel: 'Undo',
          onAction: () => {
            if (recentlyDeletedRef.current) {
              const { item, index } = recentlyDeletedRef.current;
              setObligations((curr) => {
                const copy = [...curr];
                copy.splice(index, 0, item);
                return copy;
              });
              recentlyDeletedRef.current = null;
            }
          },
        });

        return prev.filter((o) => o.id !== id);
      });
    },
    [addToast]
  );

  const handleDuplicateObligation = useCallback(
    async (id: string) => {
      const target = obligations.find((o) => o.id === id);
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
        setObligations((prev) => [...prev, created]);
        addToast({
          type: 'success',
          title: 'Obligation duplicated',
          message: `Added copy to tracking ledger.`,
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Duplicate failed',
          message: err instanceof Error ? err.message : 'Could not duplicate obligation.',
        });
      }
    },
    [obligations, activeContractId, currency, addToast]
  );

  const handleAddObligation = useCallback(async () => {
    if (!activeContractId) {
      addToast({
        type: 'warning',
        title: 'Upload a contract first',
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
      setObligations((prev) => [created, ...prev]);
      addToast({
        type: 'success',
        title: 'Obligation added',
        message: 'Saved new obligation row to workspace.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Create failed',
        message: err instanceof Error ? err.message : 'Could not save new obligation.',
      });
    }
  }, [activeContractId, referenceDate, currency, addToast]);

  const handleFileAccepted = useCallback(
    async (file: File) => {
      if (!currentUser) {
        setIsAuthModalOpen(true);
        addToast({
          type: 'warning',
          title: 'Sign in required',
          message: 'Sign in first so your uploaded contract can be processed.',
        });
        return;
      }

      setIsParsing(true);
      setParsingProgress(25);
      setParsingStages(
        INITIAL_STAGES.map((s) =>
          s.id === 1 ? { ...s, status: 'completed' } : s.id === 2 ? { ...s, status: 'in_progress' } : s
        )
      );

      try {
        const record = await uploadContractToBackend(file, currentUser);
        setParsingProgress(100);
        setParsingStages(INITIAL_STAGES.map((s) => ({ ...s, status: 'completed' })));

        setActiveContractId(record.contractId);
        setMetadata(record.metadata);
        setObligations(record.obligations);
        setTenantContracts((prev) => [record, ...prev.filter((c) => c.contractId !== record.contractId)]);
        setIsPreviewPaneOpen(true);

        addToast({
          type: 'success',
          title: 'Extraction complete',
          message: `Extracted ${record.obligations.length} obligations from "${record.fileName}".`,
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Upload failed',
          message: err instanceof Error ? err.message : 'Failed to process contract on server.',
          duration: 7000,
        });
      } finally {
        setIsParsing(false);
      }
    },
    [currentUser, addToast]
  );

  const handleValidationError = useCallback(
    (title: string, message: string) => {
      addToast({ type: 'error', title, message, duration: 7000 });
    },
    [addToast]
  );

  const handleSelectDemoBundle = useCallback(
    async (bundleId: string) => {
      const matching = tenantContracts.find((c) => c.contractId === bundleId);
      if (matching) {
        await handleSelectTenantContract(matching);
        return;
      }

      const bundle = DEMO_CONTRACT_BUNDLES.find((b) => b.id === bundleId);
      if (!bundle) {
        addToast({
          type: 'error',
          title: 'Template not found',
          message: `Could not locate template "${bundleId}".`,
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
        title: 'Template loaded',
        message: `Loaded "${bundle.title}" with ${demoObligations.length} obligations.`,
      });
    },
    [tenantContracts, handleSelectTenantContract, referenceDate, addToast]
  );

  const handleExportCsv = useCallback(() => {
    exportToCsv(obligations, metadata, referenceDate, currency, conversionMultiplier);
    addToast({ type: 'success', title: 'CSV exported', message: 'Downloaded obligations CSV file.' });
  }, [obligations, metadata, referenceDate, currency, conversionMultiplier, addToast]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(obligations, metadata, referenceDate, currency, conversionMultiplier);
    addToast({ type: 'success', title: 'Excel exported', message: 'Downloaded obligations workbook.' });
  }, [obligations, metadata, referenceDate, currency, conversionMultiplier, addToast]);

  const handleExportIcs = useCallback(() => {
    exportToIcsCalendar(obligations, metadata.contractTitle);
    addToast({ type: 'success', title: 'Calendar exported', message: 'Downloaded milestones .ics file.' });
  }, [obligations, metadata, addToast]);

  const handlePrint = useCallback(() => {
    triggerPrintReport();
  }, []);

  const showAnalytics = activeSection === 'dashboard' || activeSection === 'analytics';
  const showDocuments = activeSection === 'dashboard' || activeSection === 'documents';
  const showObligations = activeSection === 'dashboard' || activeSection === 'obligations';

  return (
    <div className="min-h-screen bg-[#141415] text-[#ededed] flex font-sans">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          if (sec === 'documents') {
            setIsPreviewPaneOpen(true);
          }
        }}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        onExportIcs={handleExportIcs}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          clearAuthSession();
          setCurrentUser(null);
          setIsAuthModalOpen(true);
          addToast({
            type: 'info',
            title: 'Signed out',
            message: 'Session cleared.',
          });
        }}
        contractsCount={tenantContracts.length}
        obligationsCount={obligations.length}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Header
          title={SECTION_TITLES[activeSection]}
          subtitle={currentUser && metadata.fileName !== 'No contract uploaded yet' ? metadata.fileName : undefined}
          referenceDate={referenceDate}
          onReferenceDateChange={setReferenceDate}
          onExportCsv={handleExportCsv}
          onExportExcel={handleExportExcel}
          onExportIcs={handleExportIcs}
          onPrint={handlePrint}
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-enter">
          {!currentUser ? (
            <div className="bg-[#19191b] rounded-xl border border-white/[0.08] p-10 text-center max-w-md mx-auto my-14 space-y-4">
              <div className="w-11 h-11 rounded-xl bg-[#232325] border border-white/[0.08] text-[#ededed] flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-[16px] font-medium text-[#ededed]">
                  Sign in to Contract Obligation Tracker
                </h2>
                <p className="text-[13px] text-[#a1a1a6] leading-relaxed">
                  Authenticate with your account to upload agreements, review extracted obligations, and export compliance schedules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center justify-center px-4 h-9 text-[13px] font-medium text-[#0f0f10] bg-[#ededed] hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Sign in or create account
              </button>
            </div>
          ) : (
            <>
              <TenantWorkspaceBar
                currentUser={currentUser}
                contracts={tenantContracts}
                activeContractId={activeContractId}
                onSelectContract={handleSelectTenantContract}
                onDeleteContract={handleDeleteContract}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />

              {showAnalytics && (
                <>
                  <MetricsCards
                    obligations={obligations}
                    referenceDate={referenceDate}
                    activeStatusFilter={activeStatusFilter}
                    onSelectFilter={(status) => {
                      setActiveStatusFilter(status);
                      if (activeSection === 'analytics') {
                        setActiveSection('obligations');
                      }
                    }}
                    activeRiskFilter={activeRiskFilter}
                    onSelectRiskFilter={(risk) => {
                      setActiveRiskFilter(risk);
                      if (activeSection === 'analytics') {
                        setActiveSection('obligations');
                      }
                    }}
                    currency={currency}
                    conversionMultiplier={conversionMultiplier}
                  />

                  <AnalyticsOverview
                    obligations={obligations}
                    referenceDate={referenceDate}
                    currency={currency}
                    conversionMultiplier={conversionMultiplier}
                  />
                </>
              )}

              {showDocuments && (
                <>
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
                </>
              )}

              {showObligations && (
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
                  currency={currency}
                  conversionMultiplier={conversionMultiplier}
                  externalSearchQuery={globalSearch}
                  onExternalSearchChange={setGlobalSearch}
                  onSelectClauseSnippet={(id) => {
                    setActiveClauseId(id);
                    setIsPreviewPaneOpen(true);
                    if (activeSection === 'obligations') {
                      setActiveSection('dashboard');
                    }
                  }}
                />
              )}

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
      </div>

      <AuthModal
        currentUser={currentUser}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(acc) => {
          setCurrentUser(acc);
          addToast({
            type: 'success',
            title: 'Signed in',
            message: `Authenticated as ${acc.email}.`,
          });
        }}
        onLogout={() => {
          clearAuthSession();
          setCurrentUser(null);
          setIsAuthModalOpen(true);
          addToast({
            type: 'info',
            title: 'Signed out',
            message: 'Session cleared.',
          });
        }}
      />

      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
