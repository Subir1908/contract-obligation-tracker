import React from 'react';
import { 
  Building2, 
  FileText, 
  Layers,
  Trash2
} from 'lucide-react';
import type { UserAccount, StoredContractRecord } from '../types/auth';

interface TenantWorkspaceBarProps {
  currentUser: UserAccount | null;
  contracts: StoredContractRecord[];
  activeContractId: string;
  onSelectContract: (contract: StoredContractRecord) => void;
  onDeleteContract?: (contractId: string, contractName: string) => void;
  onOpenAuth: () => void;
}

export const TenantWorkspaceBar: React.FC<TenantWorkspaceBarProps> = ({
  currentUser,
  contracts,
  activeContractId,
  onSelectContract,
  onDeleteContract,
  onOpenAuth,
}) => {
  return (
    <div className="no-print bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      
      {/* Organization Tenant Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {currentUser ? `Token: Active` : `Guest Mode`}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
            <span>{currentUser?.organization || 'Default Sandbox Workspace'}</span>
            <button
              type="button"
              onClick={onOpenAuth}
              className="text-[11px] text-blue-600 hover:underline font-normal cursor-pointer"
            >
              (Switch / Sign In)
            </button>
          </h3>
        </div>
      </div>

      {/* Tenant Isolated Contracts Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
        <span className="text-xs text-slate-500 whitespace-nowrap font-medium flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Contracts in this account ({contracts.length}):</span>
        </span>

        <div className="flex items-center gap-1.5">
          {contracts.map((c) => {
            const isActive = c.contractId === activeContractId;
            return (
              <div
                key={c.contractId}
                className={`group inline-flex items-center rounded-xl transition-all border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectContract(c)}
                  className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                  title={`Contract ID: ${c.contractId} (${c.obligations.length} extracted obligations)`}
                >
                  <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="max-w-[130px] truncate">{c.fileName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {c.obligations.length}
                  </span>
                </button>
                {onDeleteContract && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteContract(c.contractId, c.fileName);
                    }}
                    className={`pr-2 pl-0.5 py-1.5 text-xs transition-colors cursor-pointer ${
                      isActive 
                        ? 'text-indigo-200 hover:text-white hover:bg-indigo-700/60 rounded-r-xl' 
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-r-xl'
                    }`}
                    title={`Delete contract ${c.fileName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
