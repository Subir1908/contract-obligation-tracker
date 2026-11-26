import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  ChevronRight
} from 'lucide-react';
import type { DocumentMetadata, ParsingStage } from '../types/obligation';
import { DEMO_CONTRACT_BUNDLES } from '../data/mockContracts';

interface DocumentUploadZoneProps {
  currentMetadata: DocumentMetadata;
  isParsing: boolean;
  parsingProgress: number;
  parsingStages: ParsingStage[];
  onFileAccepted: (file: File) => void;
  onValidationError: (title: string, message: string) => void;
  onSelectDemoBundle: (bundleId: string) => void;
  currentBundleId: string;
}

export const DocumentUploadZone: React.FC<DocumentUploadZoneProps> = ({
  currentMetadata,
  isParsing,
  parsingProgress,
  parsingStages,
  onFileAccepted,
  onValidationError,
  onSelectDemoBundle,
  currentBundleId,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'templates'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf');
    const isDocx = fileName.endsWith('.docx');

    if (!isPdf && !isDocx) {
      onValidationError(
        'Unsupported file format',
        `File "${file.name}" is not supported. Upload a .pdf or .docx agreement (up to 20 pages).`
      );
      return;
    }

    if (file.size === 0 || fileName.includes('corrupt') || fileName.includes('broken')) {
      onValidationError(
        'Corrupted document detected',
        `The file "${file.name}" appears empty or damaged. Extraction aborted.`
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024 || fileName.includes('50page') || fileName.includes('oversize')) {
      onValidationError(
        'Document exceeds limit',
        `Files must be under 25 MB and up to 20 pages. "${file.name}" exceeds this limit.`
      );
      return;
    }

    onFileAccepted(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-[#19191b] rounded-xl border border-white/[0.08] overflow-hidden no-print">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-[#85858b] stroke-[1.5]" />
          <h2 className="text-[14px] font-medium text-[#ededed]">
            Contract ingestion
          </h2>
        </div>

        <div className="inline-flex items-center gap-1 self-start sm:self-auto bg-[#141415] p-0.5 rounded-lg border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#232325] text-[#ededed] raised-highlight'
                : 'text-[#71717a] hover:text-[#ededed]'
            }`}
          >
            Upload file
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-[#232325] text-[#ededed] raised-highlight'
                : 'text-[#71717a] hover:text-[#ededed]'
            }`}
          >
            Sample templates
          </button>
        </div>
      </div>

      <div className="p-5">
        {isParsing ? (
          <div className="py-6 px-4 max-w-lg mx-auto text-center">
            <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-[#232325] border border-white/[0.08] text-[#ededed] mb-3">
              <Loader2 className="w-5 h-5 animate-spin stroke-[1.5]" />
            </div>

            <h3 className="text-[14px] font-medium text-[#ededed]">
              Extracting clauses and deadlines
            </h3>
            <p className="text-[12px] text-[#71717a] mt-1">
              Parsing text structure, identifying obligations, and normalizing dates
            </p>

            <div className="w-full bg-[#141415] h-1.5 rounded-full mt-4 overflow-hidden border border-white/[0.06]">
              <div
                className="bg-[#ededed] h-full rounded-full transition-[width] duration-300"
                style={{ width: `${parsingProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-[#71717a] mt-1.5 font-mono tabular-nums">
              <span>Processing document</span>
              <span>{parsingProgress}%</span>
            </div>

            <div className="mt-5 space-y-2 text-left bg-[#141415] p-3.5 rounded-lg border border-white/[0.06]">
              {parsingStages.map((stage) => {
                let statusIcon = (
                  <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />
                );
                let textStyle = 'text-[#71717a]';

                if (stage.status === 'completed') {
                  statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a] flex-shrink-0 stroke-[1.5]" />;
                  textStyle = 'text-[#a1a1a6]';
                } else if (stage.status === 'in_progress') {
                  statusIcon = <Loader2 className="w-3.5 h-3.5 text-[#ededed] animate-spin flex-shrink-0 stroke-[1.5]" />;
                  textStyle = 'text-[#ededed] font-medium';
                }

                return (
                  <div key={stage.id} className="flex items-center gap-2.5 text-[12px]">
                    {statusIcon}
                    <span className={textStyle}>{stage.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'upload' ? (
          <div className="space-y-3.5">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl py-7 px-6 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-[#ededed]/50 bg-[#232325]'
                  : 'border-white/[0.12] bg-[#141415]/60 hover:border-white/25 hover:bg-[#1e1e21]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
                onChange={handleInputChange}
              />

              <div className="w-10 h-10 rounded-xl bg-[#232325] border border-white/[0.08] text-[#ededed] flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-5 h-5 stroke-[1.5]" />
              </div>

              <h3 className="text-[14px] font-medium text-[#ededed]">
                Drop your contract agreement here, or{' '}
                <span className="underline underline-offset-4 decoration-white/30 hover:decoration-white">
                  browse files
                </span>
              </h3>
              <p className="text-[12px] text-[#71717a] mt-1.5">
                Accepts PDF and DOCX agreements up to 20 pages (max 25 MB)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 text-[12px] text-[#71717a]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-[#71717a] flex-shrink-0 stroke-[1.5]" />
                <span className="truncate">
                  Active document:{' '}
                  <span className="text-[#ededed] font-medium">{currentMetadata.fileName}</span>
                  {currentMetadata.pageCount > 0 && (
                    <span className="text-[#71717a] font-mono tabular-nums">
                      {' '}({currentMetadata.pageCount} {currentMetadata.pageCount === 1 ? 'page' : 'pages'}
                      {currentMetadata.fileSize ? ` • ${currentMetadata.fileSize}` : ''})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {DEMO_CONTRACT_BUNDLES.map((bundle) => {
              const isSelected = currentBundleId === bundle.id;

              return (
                <button
                  key={bundle.id}
                  type="button"
                  onClick={() => onSelectDemoBundle(bundle.id)}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer group ${
                    isSelected
                      ? 'border-white/25 bg-[#232325] raised-highlight'
                      : 'border-white/[0.08] bg-[#141415] hover:border-white/20 hover:bg-[#1e1e21]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] text-[#71717a] truncate">
                      {bundle.category}
                    </span>
                    {isSelected && (
                      <span className="text-[11px] font-medium text-[#4cc38a]">
                        Active
                      </span>
                    )}
                  </div>
                  <h4 className="text-[13px] font-medium text-[#ededed] leading-snug">
                    {bundle.title}
                  </h4>
                  <div className="text-[11px] text-[#71717a] font-mono mt-2 truncate">
                    {bundle.metadata.fileName} • {bundle.metadata.pageCount}p
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-[#a1a1a6] group-hover:text-[#ededed]">
                    <span>{isSelected ? 'Reload template' : 'Load agreement'}</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[1.5]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
