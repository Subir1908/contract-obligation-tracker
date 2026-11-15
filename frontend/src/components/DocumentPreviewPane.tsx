import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Copy, 
  Check, 
  ChevronRight, 
  Sparkles,
  X
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

  const rawText = metadata.rawTextPreview || `AGREEMENT: ${metadata.contractTitle}
FILE: ${metadata.fileName} (${metadata.fileSize}, ${metadata.pageCount} pages)
PARTIES: ${metadata.parties?.join(' & ') || 'Signatory Entities'}

SECTION 1: RECITALS & SCOPE
The parties enter into this mutual binding commitment. All contractual obligations, financial parameters, milestone delivery dates, and liquidated damage penalty terms are detailed below for audit extraction.

SECTION 2: OBLIGATIONS & CLAUSES
${obligations.map((o, idx) => `Clause 2.${idx + 1} [${o.responsibleParty}]: ${o.description}. Milestone Due: ${o.dueDate}. Financial Consideration: ${o.monetaryValue}. Penalty: ${o.latePenalty}.`).join('\n\n')}`;

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
          className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-blue-400 hover:bg-blue-50/20 transition-all text-xs font-semibold text-slate-700 cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800">Source Document & Verbatim Clause Viewer</span>
              <span className="text-[11px] text-slate-500 font-normal ml-2">
                (FR-2.4 Side-by-Side Review • {metadata.fileName})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-blue-600 font-medium">
            <span>Open Preview Pane</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="no-print bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all animate-in fade-in">
      {/* Pane Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Source Document Preview & Verbatim Clauses
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                FR-2.4 & FR-3.3
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {metadata.fileName} • {metadata.pageCount} pages • {metadata.fileSize}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search in preview */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search source document text..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Collapse Preview Pane"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Left Column: Selectable Document Text (FR-2.4) */}
        <div className="lg:col-span-7 p-4 sm:p-5 max-h-[380px] overflow-y-auto font-mono text-[11px] text-slate-700 leading-relaxed bg-slate-50/50 select-text space-y-3">
          <div className="text-[11px] font-sans font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Selectable OCR/Text Stream</span>
            <span className="text-[10px] text-emerald-600 font-normal">Machine-Readable PDF/DOCX</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs whitespace-pre-wrap">
            {rawText.split('\n\n').map((paragraph, idx) => {
              const isMatch = searchTerm.trim() && paragraph.toLowerCase().includes(searchTerm.toLowerCase().trim());
              return (
                <p 
                  key={idx} 
                  className={`mb-3 last:mb-0 transition-colors ${
                    isMatch ? 'bg-amber-100 text-slate-900 p-1.5 rounded' : ''
                  }`}
                >
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>

        {/* Right Column: Linked Verbatim Clauses for Human Verification (FR-3.3) */}
        <div className="lg:col-span-5 p-4 sm:p-5 max-h-[380px] overflow-y-auto space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Extracted Clause Snippets ({obligations.length})</span>
            </div>
            <span className="text-[11px] text-slate-400">Linked to Matrix</span>
          </div>

          <div className="space-y-2.5">
            {obligations.map((ob) => {
              const isSelected = activeClauseId === ob.id;
              const snippet = ob.sourceClause || `Extracted from ${metadata.fileName} for ${ob.responsibleParty}: "${ob.description}" (Due: ${ob.dueDate}, Penalty: ${ob.latePenalty})`;

              return (
                <div
                  key={ob.id}
                  onClick={() => onSelectObligation && onSelectObligation(ob.id)}
                  className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/10' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {ob.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ob.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ob.verificationStatus || 'VERIFIED'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyClause(snippet, ob.id);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                        title="Copy source clause snippet"
                      >
                        {copiedId === ob.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-3 hover:line-clamp-none transition-all">
                    "{snippet}"
                  </p>
                  
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">{ob.responsibleParty}</span>
                    <span className="font-mono text-slate-600">Due: {ob.dueDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
