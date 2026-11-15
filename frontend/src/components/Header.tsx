import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileDown, 
  Printer, 
  Calendar, 
  RotateCcw, 
  Download,
  ChevronDown,
  FileCheck,
  IndianRupee,
  CalendarDays,
  UserCheck,
  Lock,
  Eye
} from 'lucide-react';
import { formatDateDisplay } from '../utils/dateUtils';
import type { CurrencyCode, UserAccount } from '../types/obligation';

interface HeaderProps {
  referenceDate: string;
  onReferenceDateChange: (newDate: string) => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onExportIcs: () => void;
  onPrint: () => void;
  onLoadDemo: () => void;
  onReset: () => void;
  totalObligations: number;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  conversionMultiplier: number;
  onConversionMultiplierChange: (mult: number) => void;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  isPreviewPaneOpen: boolean;
  onTogglePreviewPane: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  referenceDate,
  onReferenceDateChange,
  onExportCsv,
  onExportExcel,
  onExportIcs,
  onPrint,
  onReset,
  currency,
  onCurrencyChange,
  currentUser,
  onOpenAuthModal,
  isPreviewPaneOpen,
  onTogglePreviewPane,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-4">
          
          {/* Brand & Subtitle */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0 mt-0.5">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-display">
                  Contract Obligation Tracker
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                  COT v1.0
                </span>
                
                {/* User Session Status (FR-1) */}
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                    currentUser
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  }`}
                  title={currentUser ? `Logged in as ${currentUser.email}` : 'Click to Sign In / JWT Auth'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  {currentUser ? <UserCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{currentUser ? `${currentUser.name || currentUser.email}` : 'Sign In (JWT)'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated document extraction, milestone urgency tracking, risk scoring & calendar sync
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            
            {/* Toggle Source Document Preview (FR-2.4) */}
            <button
              type="button"
              onClick={onTogglePreviewPane}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isPreviewPaneOpen
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle Side-by-side Document Preview & Verbatim Clause Viewer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>{isPreviewPaneOpen ? 'Hide Preview' : 'Doc Preview'}</span>
            </button>

            {/* Currency Selector (INR ₹ / USD $) */}
            <div className="relative">
              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => onCurrencyChange('INR')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    currency === 'INR'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Indian Rupees (₹) - Lakhs & Crores format"
                >
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  <span>INR (₹)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onCurrencyChange('USD')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="US Dollars ($)"
                >
                  <span className="font-mono font-bold">$</span>
                  <span>USD</span>
                </button>
              </div>
            </div>

            {/* Reference Date Control (FR-5 Baseline) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDateSelector(!showDateSelector)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-all cursor-pointer"
                title="Change urgency reference date"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-mono">{formatDateDisplay(referenceDate)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDateSelector && (
                <div className="absolute right-0 mt-1.5 w-64 p-3 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Reference Evaluation Date</span>
                    <button
                      type="button"
                      onClick={() => setShowDateSelector(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <input
                    type="date"
                    value={referenceDate}
                    onChange={(e) => {
                      onReferenceDateChange(e.target.value);
                      setShowDateSelector(false);
                    }}
                    className="w-full text-xs font-mono p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">
                    Deadlines are dynamically tagged as Upcoming, Due Today, or Overdue relative to this date.
                  </p>
                </div>
              )}
            </div>

            {/* Export Menu (CSV, XLSX, ICS Calendar, Print Report) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Reports</span>
                <ChevronDown className="w-3 h-3 text-blue-200" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-56 p-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCsv();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold">Export as CSV</div>
                      <div className="text-[10px] text-slate-400">RFC 4180 standard spreadsheet</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportExcel();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <div>
                      <div className="font-semibold">Export as Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-400">Multi-sheet compliance workbook</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportIcs();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <CalendarDays className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold">Sync to Calendar (.ics)</div>
                      <div className="text-[10px] text-slate-400">FR-6.4: Google & Outlook import</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onPrint();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="font-semibold">Print Summary Report</div>
                      <div className="text-[10px] text-slate-400">FR-6.3: Clean print-ready PDF view</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={onReset}
              title="Reset data table"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              aria-label="Reset obligations table"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
