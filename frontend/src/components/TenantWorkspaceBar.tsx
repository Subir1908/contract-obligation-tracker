import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
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
    <div className="no-print bg-[#19191b] rounded-xl border border-white/[0.08] px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Workspace Organization Context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#ededed] truncate">
              {currentUser?.organization || 'Default Workspace'}
            </span>
            <button
              type="button"
              onClick={onOpenAuth}
              className="text-[12px] text-[#71717a] hover:text-[#ededed] transition-colors cursor-pointer"
            >
              Switch account
            </button>
          </div>
        </div>
      </div>

      {/* Contracts in Account */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
        <span className="text-[12px] text-[#71717a] whitespace-nowrap">
          Contracts in this account ({contracts.length})
        </span>

        {contracts.length === 0 ? (
          <span className="text-[12px] text-[#71717a] font-mono">None</span>
        ) : (
          <div className="flex items-center gap-1.5">
            {contracts.map((c) => {
              const isActive = c.contractId === activeContractId;
              return (
                <div
                  key={c.contractId}
                  className={`inline-flex items-center rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-[#232325] text-[#ededed] border-white/[0.16] raised-highlight'
                      : 'bg-[#141415] hover:bg-[#1e1e21] text-[#a1a1a6] border-white/[0.08]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectContract(c)}
                    className="px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap flex items-center gap-2 cursor-pointer"
                    title={`${c.fileName} (${c.obligations.length} obligations)`}
                  >
                    <FileText
                      className={`w-3.5 h-3.5 stroke-[1.5] ${
                        isActive ? 'text-[#ededed]' : 'text-[#71717a]'
                      }`}
                    />
                    <span className="max-w-[160px] truncate">{c.fileName}</span>
                    <span className="text-[11px] font-mono tabular-nums text-[#71717a]">
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
                      className="pr-2 pl-1 py-1.5 text-[#71717a] hover:text-[#e5484d] transition-colors cursor-pointer"
                      title={`Delete contract ${c.fileName}`}
                      aria-label={`Delete contract ${c.fileName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
