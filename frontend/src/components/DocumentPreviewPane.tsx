import React, { useState } from 'react';
import {
  FileText,
  Search,
  Copy,
  Check,
  ChevronRight,
  EyeOff
} from 'lucide-react';
import type { ContractObligation, DocumentMetadata } from '../types/obligation';

interface DocumentPreviewPaneProps {
  metadata: DocumentMetadata;
  obligations: ContractObligation[];
  activeClauseId?: string | null;
  onSelectObligation?: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const DocumentPreviewPane: React.FC<DocumentPreviewPaneProps> = ({
  metadata,
  obligations,
  activeClauseId,
  onSelectObligation,
  isOpen,
  onToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rawText =
    metadata.rawTextPreview ||
    `Agreement: ${metadata.contractTitle}
File: ${metadata.fileName} (${metadata.fileSize}, ${metadata.pageCount} pages)
Parties: ${metadata.parties?.join(' & ') || 'Signatory Entities'}

Extracted clauses
${obligations
  .map(
    (o, idx) =>
      `${idx + 1}. [${o.responsibleParty}] ${o.description}. Due: ${o.dueDate || 'Unspecified'}. Value: ${o.monetaryValue}. Penalty: ${o.latePenalty}.`
  )
  .join('\n\n')}`;

  const handleCopyClause = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) {
    return (
      <div className="no-print">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#19191b] border border-white/[0.08] hover:border-white/[0.16] hover:bg-[#1e1e21] rounded-xl transition-colors text-[13px] cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-[#85858b] flex-shrink-0 stroke-[1.5]" />
            <span className="font-medium text-[#ededed]">Source document & verbatim clauses</span>
            <span className="text-[12px] text-[#71717a] truncate hidden sm:inline">
              {metadata.fileName}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[12px] text-[#a1a1a6] flex-shrink-0">
            <span>Open preview</span>
            <ChevronRight className="w-4 h-4 stroke-[1.5]" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="no-print bg-[#19191b] rounded-xl border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-medium text-[#ededed]">
            Source document & verbatim clauses
          </h3>
          <p className="text-[12px] text-[#71717a] truncate mt-0.5 font-mono tabular-nums">
            {metadata.fileName} • {metadata.pageCount} pages
            {metadata.fileSize ? ` • ${metadata.fileSize}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-2.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search document text"
              className="w-full text-[12px] pl-8 pr-2.5 h-8 bg-[#141415] text-[#ededed] placeholder-[#71717a] rounded-lg border border-white/[0.08] focus:outline-none focus:border-white/25"
            />
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-lg bg-[#232325] text-[#ededed] border border-white/[0.1] hover:bg-[#2a2a2d] transition-colors cursor-pointer whitespace-nowrap"
            title="Hide Source Document Preview"
          >
            <EyeOff className="w-3.5 h-3.5 text-[#a1a1a6] stroke-[1.5]" />
            <span>Hide preview</span>
          </button>
        </div>
      </div>

      {/* Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
        {/* Left: Raw Document Text */}
        <div className="lg:col-span-7 p-4 sm:p-5 max-h-[360px] overflow-y-auto font-mono text-[12px] text-[#a1a1a6] leading-relaxed bg-[#141415]/60 select-text space-y-3">
          <div className="text-[12px] font-sans text-[#71717a] mb-2">
            Extracted text stream
          </div>

          <div className="p-4 bg-[#141415] rounded-lg border border-white/[0.06] whitespace-pre-wrap">
            {rawText.split('\n\n').map((paragraph, idx) => {
              const isMatch =
                searchTerm.trim() &&
                paragraph.toLowerCase().includes(searchTerm.toLowerCase().trim());
              return (
                <p
                  key={idx}
                  className={`mb-3 last:mb-0 ${
                    isMatch ? 'bg-[#eab308]/15 text-[#ededed] p-1.5 rounded' : ''
                  }`}
                >
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>

        {/* Right: Linked Verbatim Clauses */}
        <div className="lg:col-span-5 p-4 sm:p-5 max-h-[360px] overflow-y-auto space-y-2.5 bg-[#19191b]">
          <div className="flex items-center justify-between text-[12px] text-[#71717a] mb-1">
            <span>Extracted clauses ({obligations.length})</span>
            <span>Click to link</span>
          </div>

          {obligations.length === 0 ? (
            <p className="text-[12px] text-[#71717a] py-6 text-center">
              No extracted clauses available for this document
            </p>
          ) : (
            <div className="space-y-2">
              {obligations.map((ob, idx) => {
                const isSelected = activeClauseId === ob.id;
                const snippet =
                  ob.sourceClause ||
                  `${ob.responsibleParty}: "${ob.description}" (Due: ${ob.dueDate || 'Unspecified'})`;

                return (
                  <div
                    key={ob.id}
                    onClick={() => onSelectObligation && onSelectObligation(ob.id)}
                    className={`p-3 rounded-lg border text-[12px] transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-white/30 bg-[#232325] raised-highlight'
                        : 'border-white/[0.06] bg-[#141415]/60 hover:border-white/[0.15] hover:bg-[#1e1e21]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] tabular-nums text-[#71717a]">
                        Clause {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] ${
                            ob.verificationStatus === 'VERIFIED'
                              ? 'text-[#4cc38a]'
                              : 'text-[#eab308]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ob.verificationStatus === 'VERIFIED'
                                ? 'bg-[#4cc38a]'
                                : 'bg-[#eab308]'
                            }`}
                          ></span>
                          {ob.verificationStatus === 'VERIFIED' ? 'Verified' : 'Unverified'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyClause(snippet, ob.id);
                          }}
                          className="text-[#71717a] hover:text-[#ededed] p-0.5 rounded cursor-pointer"
                          title="Copy clause text"
                        >
                          {copiedId === ob.id ? (
                            <Check className="w-3.5 h-3.5 text-[#4cc38a]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 stroke-[1.5]" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-[12px] text-[#a1a1a6] leading-relaxed line-clamp-3 hover:line-clamp-none">
                      "{snippet}"
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#71717a]">
                      <span className="text-[#ededed] font-medium truncate max-w-[160px]">
                        {ob.responsibleParty}
                      </span>
                      <span className="font-mono tabular-nums">
                        {ob.dueDate || 'No date'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
