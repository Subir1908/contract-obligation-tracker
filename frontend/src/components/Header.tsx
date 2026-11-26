import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Printer,
  Calendar,
  Download,
  ChevronDown,
  CalendarDays,
  Menu
} from 'lucide-react';
import { formatDateDisplay } from '../utils/dateUtils';
import type { CurrencyCode, UserAccount } from '../types/obligation';

interface HeaderProps {
  title: string;
  subtitle?: string;
  referenceDate: string;
  onReferenceDateChange: (newDate: string) => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onExportIcs: () => void;
  onPrint: () => void;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  referenceDate,
  onReferenceDateChange,
  onExportCsv,
  onExportExcel,
  onExportIcs,
  onPrint,
  currency,
  onCurrencyChange,
  currentUser,
  onOpenAuthModal,
  onOpenMobileNav,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);

  return (
    <header className="sticky top-0 z-20 h-15 bg-[#141415]/95 backdrop-blur-md border-b border-white/[0.08] no-print">
      <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile Nav Toggle + Section Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden p-1.5 rounded-lg bg-[#19191b] border border-white/[0.08] text-[#a1a1a6] hover:text-[#ededed] cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4 stroke-[1.5]" />
          </button>

          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <h1 className="text-[18px] sm:text-[20px] font-medium tracking-tight text-[#ededed] truncate">
                {title}
              </h1>
              {subtitle && (
                <span className="hidden md:inline text-[12px] text-[#71717a] truncate max-w-[320px]">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Currency, Reference Date, Export */}
        <div className="flex items-center gap-2">
          {/* Currency Segmented Control */}
          <div className="inline-flex items-center bg-[#19191b] p-0.5 rounded-lg border border-white/[0.08]">
            <button
              type="button"
              onClick={() => onCurrencyChange('INR')}
              className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                currency === 'INR'
                  ? 'bg-[#232325] text-[#ededed] raised-highlight'
                  : 'text-[#71717a] hover:text-[#ededed]'
              }`}
              title="Display amounts in Indian Rupees (INR)"
            >
              ₹ INR
            </button>
            <button
              type="button"
              onClick={() => onCurrencyChange('USD')}
              className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                currency === 'USD'
                  ? 'bg-[#232325] text-[#ededed] raised-highlight'
                  : 'text-[#71717a] hover:text-[#ededed]'
              }`}
              title="Display amounts in US Dollars (USD)"
            >
              $ USD
            </button>
          </div>

          {/* Reference Evaluation Date */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowDateSelector((v) => !v);
                setShowExportMenu(false);
              }}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[12px] text-[#a1a1a6] hover:text-[#ededed] bg-[#19191b] border border-white/[0.08] rounded-lg transition-colors cursor-pointer"
              title="Set evaluation baseline date"
            >
              <Calendar className="w-3.5 h-3.5 text-[#71717a] stroke-[1.5]" />
              <span className="font-mono tabular-nums hidden sm:inline">
                {formatDateDisplay(referenceDate)}
              </span>
              <ChevronDown className="w-3 h-3 text-[#71717a]" />
            </button>

            {showDateSelector && (
              <div className="absolute right-0 mt-1.5 w-64 p-3 bg-[#19191b] rounded-xl shadow-2xl border border-white/[0.1] z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
                  <span className="text-[12px] font-medium text-[#ededed]">
                    Evaluation date
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDateSelector(false)}
                    className="text-[11px] text-[#71717a] hover:text-[#ededed] cursor-pointer"
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
                  className="w-full text-[12px] font-mono p-2 bg-[#141415] text-[#ededed] border border-white/[0.1] rounded-lg focus:outline-none focus:border-white/30"
                />
                <p className="text-[11px] text-[#71717a] mt-2 leading-relaxed">
                  Deadlines are tagged overdue, due today, or upcoming relative to this date.
                </p>
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowExportMenu((v) => !v);
                  setShowDateSelector(false);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-[#0f0f10] bg-[#ededed] hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-52 p-1.5 bg-[#19191b] rounded-xl shadow-2xl border border-white/[0.1] z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCsv();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-[#ededed] hover:bg-[#232325] rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-[#a1a1a6] stroke-[1.5]" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportExcel();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-[#ededed] hover:bg-[#232325] rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#a1a1a6] stroke-[1.5]" />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportIcs();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-[#ededed] hover:bg-[#232325] rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <CalendarDays className="w-4 h-4 text-[#a1a1a6] stroke-[1.5]" />
                    <span>Calendar file (.ics)</span>
                  </button>

                  <div className="border-t border-white/[0.08] my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onPrint();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-[#ededed] hover:bg-[#232325] rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#a1a1a6] stroke-[1.5]" />
                    <span>Print summary report</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-[#0f0f10] bg-[#ededed] hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
