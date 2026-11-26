import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  ArrowUpDown,
  Plus,
  Trash2,
  Copy,
  FileText,
  Calendar as CalendarIcon,
  X,
  ChevronUp,
  ChevronDown,
  Check
} from 'lucide-react';
import type { ContractObligation, TimelineStatus, CurrencyCode, RiskLevel } from '../types/obligation';
import {
  calculateUrgency,
  calculateRisk,
  formatCurrency,
  formatDateDisplay,
  formatIndianCompactNotation,
  normalizeDateString,
} from '../utils/dateUtils';
import { sanitizeMonetaryValue, sanitizeText } from '../utils/sanitize';

interface ObligationsTableProps {
  obligations: ContractObligation[];
  referenceDate: string;
  activeStatusFilter: 'ALL' | TimelineStatus;
  onStatusFilterChange: (status: 'ALL' | TimelineStatus) => void;
  activeRiskFilter?: 'ALL' | RiskLevel;
  onRiskFilterChange?: (risk: 'ALL' | RiskLevel) => void;
  onUpdateObligation: (id: string, updates: Partial<ContractObligation>) => void;
  onDeleteObligation: (id: string) => void;
  onDuplicateObligation: (id: string) => void;
  onAddObligation: () => void;
  currency?: CurrencyCode;
  conversionMultiplier?: number;
  onSelectClauseSnippet?: (id: string) => void;
  externalSearchQuery?: string;
  onExternalSearchChange?: (query: string) => void;
}

interface DateCellProps {
  id: string;
  dueDate: string | null | undefined;
  onUpdate: (id: string, updates: Partial<ContractObligation>) => void;
}

const DateCell: React.FC<DateCellProps> = ({ id, dueDate, onUpdate }) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleCalendarClick = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch {
          // fallback
        }
      }
      dateInputRef.current.focus();
      dateInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col gap-1 min-w-[144px]">
      <div className="relative flex items-center bg-[#141415] hover:bg-[#1e1e21] focus-within:bg-[#141415] rounded-lg border border-white/[0.08] hover:border-white/[0.16] focus-within:border-white/30 transition-colors">
        <input
          type="text"
          value={dueDate || ''}
          placeholder="YYYY-MM-DD"
          onChange={(e) => {
            onUpdate(id, { dueDate: e.target.value });
          }}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (!raw) return;
            const normalized = normalizeDateString(raw);
            if (normalized && normalized !== raw) {
              onUpdate(id, { dueDate: normalized });
            }
          }}
          className="text-[12px] font-mono tabular-nums text-[#ededed] placeholder-[#52525b] bg-transparent pl-2.5 pr-7 py-1.5 w-full focus:outline-none"
          title="Type date manually (YYYY-MM-DD or DD/MM/YYYY) or click calendar icon"
        />
        <button
          type="button"
          onClick={handleCalendarClick}
          className="absolute right-1 text-[#71717a] hover:text-[#ededed] p-1 cursor-pointer transition-colors"
          title="Open Calendar Picker"
          aria-label="Open calendar picker"
        >
          <CalendarIcon className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : ''}
          onChange={(e) => {
            if (e.target.value) {
              onUpdate(id, { dueDate: e.target.value });
            }
          }}
          className="absolute opacity-0 pointer-events-none w-0 h-0 bottom-0 right-0"
          tabIndex={-1}
        />
      </div>
      <span className="text-[11px] text-[#71717a] px-1 font-mono tabular-nums">
        {formatDateDisplay(dueDate || '')}
      </span>
    </div>
  );
};

export const ObligationsTable: React.FC<ObligationsTableProps> = ({
  obligations,
  referenceDate,
  activeStatusFilter,
  onStatusFilterChange,
  activeRiskFilter = 'ALL',
  onRiskFilterChange,
  onUpdateObligation,
  onDeleteObligation,
  onDuplicateObligation,
  onAddObligation,
  currency = 'INR',
  conversionMultiplier = 1,
  onSelectClauseSnippet,
  externalSearchQuery,
  onExternalSearchChange,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'dueDate' | 'monetaryValue' | 'responsibleParty' | 'risk'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearch;
  const setSearchQuery = (val: string) => {
    if (onExternalSearchChange) onExternalSearchChange(val);
    else setLocalSearch(val);
  };

  const uniqueParties = useMemo(() => {
    const set = new Set<string>();
    obligations.forEach((o) => {
      if (o.responsibleParty) set.add(o.responsibleParty.trim());
    });
    return Array.from(set).sort();
  }, [obligations]);

  const handleSortToggle = (field: 'dueDate' | 'monetaryValue' | 'responsibleParty' | 'risk') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'monetaryValue' || field === 'risk' ? 'desc' : 'asc');
    }
  };

  const filteredObligations = useMemo(() => {
    let result = [...obligations];

    if (activeStatusFilter !== 'ALL') {
      result = result.filter((ob) => {
        const urgency = calculateUrgency(ob.dueDate, referenceDate);
        return urgency.status === activeStatusFilter;
      });
    }

    if (activeRiskFilter !== 'ALL') {
      result = result.filter((ob) => {
        const urgency = calculateUrgency(ob.dueDate, referenceDate);
        const risk = calculateRisk(ob.monetaryValue, ob.latePenalty, urgency.status);
        return (ob.riskLevel || risk.level) === activeRiskFilter;
      });
    }

    if (partyFilter !== 'ALL') {
      result = result.filter((ob) => ob.responsibleParty.trim() === partyFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (ob) =>
          ob.description.toLowerCase().includes(q) ||
          ob.responsibleParty.toLowerCase().includes(q) ||
          ob.latePenalty.toLowerCase().includes(q) ||
          (ob.sourceClause && ob.sourceClause.toLowerCase().includes(q)) ||
          ob.id.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortField === 'dueDate') {
        const dateA = a.dueDate || '';
        const dateB = b.dueDate || '';
        const cmp = dateA.localeCompare(dateB);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'monetaryValue') {
        const valA = a.monetaryValue || 0;
        const valB = b.monetaryValue || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortField === 'responsibleParty') {
        const cmp = (a.responsibleParty || '').localeCompare(b.responsibleParty || '');
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'risk') {
        const urgencyA = calculateUrgency(a.dueDate, referenceDate);
        const urgencyB = calculateUrgency(b.dueDate, referenceDate);
        const scoreA = calculateRisk(a.monetaryValue, a.latePenalty, urgencyA.status).score;
        const scoreB = calculateRisk(b.monetaryValue, b.latePenalty, urgencyB.status).score;
        return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      }
      return 0;
    });

    return result;
  }, [
    obligations,
    activeStatusFilter,
    activeRiskFilter,
    partyFilter,
    searchQuery,
    sortField,
    sortOrder,
    referenceDate,
  ]);

  const filteredTotalValue = useMemo(() => {
    return filteredObligations.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);
  }, [filteredObligations]);

  const statusCounts = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;

    obligations.forEach((o) => {
      const u = calculateUrgency(o.dueDate, referenceDate);
      if (u.status === 'OVERDUE') overdue++;
      else if (u.status === 'DUE_TODAY') dueToday++;
      else upcoming++;
    });

    return { all: obligations.length, overdue, dueToday, upcoming };
  }, [obligations, referenceDate]);

  return (
    <div className="bg-[#19191b] rounded-xl border border-white/[0.08] overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Underline Navigation Tabs (matching reference table/card tabs) */}
          <div className="flex items-center gap-5 border-b border-white/[0.06] overflow-x-auto">
            {(
              [
                { key: 'ALL', label: 'All obligations', count: statusCounts.all },
                { key: 'OVERDUE', label: 'Overdue', count: statusCounts.overdue },
                { key: 'DUE_TODAY', label: 'Due today', count: statusCounts.dueToday },
                { key: 'UPCOMING', label: 'Upcoming', count: statusCounts.upcoming },
              ] as const
            ).map((tab) => {
              const isActive = activeStatusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.key)}
                  className={`pb-2.5 text-[13px] whitespace-nowrap inline-flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#ededed] text-[#ededed] font-medium'
                      : 'border-transparent text-[#71717a] hover:text-[#a1a1a6]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[11px] font-mono tabular-nums text-[#71717a]">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary Add Action */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              onClick={onAddObligation}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-[#0f0f10] bg-[#ededed] hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Add obligation</span>
            </button>
          </div>
        </div>

        {/* Search & Party Filter & Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search obligations, parties, clauses"
              className="w-full text-[13px] pl-8 pr-8 h-9 bg-[#141415] text-[#ededed] placeholder-[#71717a] rounded-lg border border-white/[0.08] focus:border-white/25 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#ededed] p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="h-9 text-[12px] bg-[#141415] border border-white/[0.08] rounded-lg px-2.5 text-[#a1a1a6] focus:border-white/25 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All parties ({uniqueParties.length})</option>
              {uniqueParties.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <div className="inline-flex items-center gap-0.5 bg-[#141415] rounded-lg p-0.5 border border-white/[0.08] h-9">
              {(
                [
                  { key: 'dueDate', label: 'Date' },
                  { key: 'monetaryValue', label: 'Value' },
                  { key: 'risk', label: 'Risk' },
                ] as const
              ).map((item) => {
                const isActive = sortField === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSortToggle(item.key)}
                    className={`px-2.5 h-7 rounded-md text-[12px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#232325] text-[#ededed] raised-highlight'
                        : 'text-[#71717a] hover:text-[#ededed]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive &&
                      (sortOrder === 'asc' ? (
                        <ChevronUp className="w-3 h-3 text-[#ededed]" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-[#ededed]" />
                      ))}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#141415]/60 border-b border-white/[0.08] text-[12px] font-medium text-[#71717a] select-none">
              <th className="py-3 px-3 w-10 text-center font-mono">#</th>
              <th className="py-3 px-4 min-w-[260px]">Obligation</th>
              <th className="py-3 px-3 min-w-[165px]">
                <button
                  type="button"
                  onClick={() => handleSortToggle('responsibleParty')}
                  className="inline-flex items-center gap-1.5 hover:text-[#ededed] cursor-pointer"
                >
                  <span>Party</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-3 px-3 min-w-[155px]">
                <button
                  type="button"
                  onClick={() => handleSortToggle('dueDate')}
                  className="inline-flex items-center gap-1.5 hover:text-[#ededed] cursor-pointer"
                >
                  <span>Due date</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-3 px-3 min-w-[140px]">Status</th>
              <th className="py-3 px-3 min-w-[115px]">
                <button
                  type="button"
                  onClick={() => handleSortToggle('risk')}
                  className="inline-flex items-center gap-1.5 hover:text-[#ededed] cursor-pointer"
                >
                  <span>Risk</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-3 px-3 min-w-[145px]">
                <button
                  type="button"
                  onClick={() => handleSortToggle('monetaryValue')}
                  className="inline-flex items-center gap-1.5 hover:text-[#ededed] cursor-pointer"
                >
                  <span>Value ({currency})</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </button>
              </th>
              <th className="py-3 px-3 min-w-[210px]">Penalty & source</th>
              <th className="py-3 px-3 w-20 text-right no-print">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.06] text-[13px]">
            {filteredObligations.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center">
                  <div className="max-w-md mx-auto space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#232325] border border-white/[0.08] text-[#71717a] flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <h4 className="text-[14px] font-medium text-[#ededed]">
                      No matching obligations found
                    </h4>
                    <p className="text-[12px] text-[#71717a]">
                      Upload a PDF or DOCX contract above to extract obligations, or adjust your search and filter criteria.
                    </p>
                    <div className="pt-2 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setPartyFilter('ALL');
                          onStatusFilterChange('ALL');
                          if (onRiskFilterChange) onRiskFilterChange('ALL');
                        }}
                        className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-[#232325] hover:bg-[#2c2c30] text-[#ededed] border border-white/[0.08] transition-colors cursor-pointer"
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredObligations.map((ob, idx) => {
                const urgency = calculateUrgency(ob.dueDate, referenceDate);
                const computedRisk = calculateRisk(ob.monetaryValue, ob.latePenalty, urgency.status);
                const riskLevel = ob.riskLevel || computedRisk.level;

                let dotColor = 'bg-[#4cc38a]';
                let statusTextColor = 'text-[#4cc38a]';
                if (urgency.status === 'OVERDUE') {
                  dotColor = 'bg-[#e5484d]';
                  statusTextColor = 'text-[#e5484d]';
                } else if (urgency.status === 'DUE_TODAY') {
                  dotColor = 'bg-[#eab308]';
                  statusTextColor = 'text-[#eab308]';
                } else if (!ob.dueDate) {
                  dotColor = 'bg-[#71717a]';
                  statusTextColor = 'text-[#a1a1a6]';
                }

                let riskColor = 'text-[#4cc38a]';
                let riskDot = 'bg-[#4cc38a]';
                if (riskLevel === 'HIGH') {
                  riskColor = 'text-[#e5484d]';
                  riskDot = 'bg-[#e5484d]';
                } else if (riskLevel === 'MEDIUM') {
                  riskColor = 'text-[#eab308]';
                  riskDot = 'bg-[#eab308]';
                }

                const isVerified = ob.verificationStatus === 'VERIFIED';

                return (
                  <tr
                    key={ob.id}
                    className="hover:bg-white/[0.02] transition-colors group align-top"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-3 text-center font-mono text-[12px] tabular-nums text-[#71717a]">
                      {idx + 1}
                    </td>

                    {/* Obligation Description */}
                    <td className="py-3 px-4">
                      <div className="space-y-1.5">
                        <textarea
                          rows={2}
                          value={ob.description}
                          onChange={(e) => onUpdateObligation(ob.id, { description: sanitizeText(e.target.value, 2000, false) })}
                          placeholder="Obligation description"
                          className="w-full text-[13px] text-[#ededed] bg-transparent hover:bg-[#141415]/80 focus:bg-[#141415] px-2 py-1 rounded-md border border-transparent hover:border-white/[0.08] focus:border-white/25 focus:outline-none transition-colors resize-none leading-snug"
                        />
                        <div className="px-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateObligation(ob.id, {
                                verificationStatus: isVerified ? 'UNVERIFIED' : 'VERIFIED',
                              })
                            }
                            className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                              isVerified
                                ? 'bg-[#4cc38a]/10 text-[#4cc38a] border-[#4cc38a]/25 hover:bg-[#4cc38a]/15'
                                : 'bg-[#141415] text-[#71717a] border-white/[0.08] hover:text-[#ededed]'
                            }`}
                            title="Toggle verification status"
                          >
                            <Check className="w-3 h-3 stroke-[1.75]" />
                            <span>{isVerified ? 'Verified' : 'Unverified'}</span>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Responsible Party */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={ob.responsibleParty}
                        onChange={(e) => onUpdateObligation(ob.id, { responsibleParty: sanitizeText(e.target.value, 255, false) })}
                        placeholder="Responsible party"
                        className="w-full text-[13px] font-medium text-[#ededed] bg-transparent hover:bg-[#141415]/80 focus:bg-[#141415] px-2 py-1.5 rounded-md border border-transparent hover:border-white/[0.08] focus:border-white/25 focus:outline-none transition-colors"
                      />
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-3">
                      <DateCell id={ob.id} dueDate={ob.dueDate} onUpdate={onUpdateObligation} />
                    </td>

                    {/* Timeline Status */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${statusTextColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}></span>
                          <span>{urgency.label}</span>
                        </span>
                        <span className="text-[11px] text-[#71717a] tabular-nums">
                          {urgency.formattedDelta}
                        </span>
                      </div>
                    </td>

                    {/* Risk Severity */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${riskColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${riskDot}`}></span>
                          <span>{riskLevel.charAt(0) + riskLevel.slice(1).toLowerCase()}</span>
                        </span>
                        <select
                          value={riskLevel}
                          onChange={(e) => onUpdateObligation(ob.id, { riskLevel: e.target.value as RiskLevel })}
                          className="text-[11px] bg-[#141415] border border-white/[0.08] rounded px-1.5 py-0.5 text-[#a1a1a6] hover:text-[#ededed] cursor-pointer focus:outline-none"
                          title="Override risk level"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </div>
                    </td>

                    {/* Monetary Value */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <span className="text-[#71717a] text-[12px] mr-1 font-mono">
                            {currency === 'INR' ? '₹' : '$'}
                          </span>
                          <input
                            type="number"
                            step={currency === 'INR' ? '1000' : '100'}
                            min="0"
                            value={ob.monetaryValue || ''}
                            onChange={(e) =>
                              onUpdateObligation(ob.id, {
                                monetaryValue: sanitizeMonetaryValue(e.target.value),
                              })
                            }
                            placeholder="0"
                            className="w-full text-[13px] font-mono tabular-nums font-medium text-[#ededed] bg-transparent hover:bg-[#141415]/80 focus:bg-[#141415] px-1.5 py-1 rounded-md border border-transparent hover:border-white/[0.08] focus:border-white/25 focus:outline-none transition-colors"
                          />
                        </div>
                        <div className="text-[11px] text-[#71717a] font-mono tabular-nums px-1">
                          {formatCurrency(ob.monetaryValue, currency, conversionMultiplier)}
                          {currency === 'INR' && ob.monetaryValue * conversionMultiplier >= 100000 && (
                            <span className="ml-1 text-[#a1a1a6]">
                              ({formatIndianCompactNotation(ob.monetaryValue, conversionMultiplier)})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Late Penalty & Source Snippet */}
                    <td className="py-3 px-3">
                      <div className="space-y-1.5">
                        <textarea
                          rows={2}
                          value={ob.latePenalty}
                          onChange={(e) => onUpdateObligation(ob.id, { latePenalty: sanitizeText(e.target.value, 1000, false) })}
                          placeholder="Late penalty terms"
                          className="w-full text-[12px] text-[#a1a1a6] bg-transparent hover:bg-[#141415]/80 focus:bg-[#141415] focus:text-[#ededed] px-2 py-1 rounded-md border border-transparent hover:border-white/[0.08] focus:border-white/25 focus:outline-none transition-colors resize-none leading-snug"
                        />
                        {ob.sourceClause && (
                          <button
                            type="button"
                            onClick={() => onSelectClauseSnippet && onSelectClauseSnippet(ob.id)}
                            className="w-full text-left text-[11px] text-[#71717a] hover:text-[#ededed] bg-[#141415]/70 hover:bg-[#232325] px-2 py-1 rounded border border-white/[0.06] flex items-center gap-1.5 cursor-pointer transition-colors"
                            title={ob.sourceClause}
                          >
                            <FileText className="w-3 h-3 flex-shrink-0 stroke-[1.5]" />
                            <span className="truncate">{ob.sourceClause}</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right no-print">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicateObligation(ob.id)}
                          title="Duplicate obligation"
                          className="p-1.5 text-[#71717a] hover:text-[#ededed] hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
                          aria-label="Duplicate obligation"
                        >
                          <Copy className="w-3.5 h-3.5 stroke-[1.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteObligation(ob.id)}
                          title="Delete obligation"
                          className="p-1.5 text-[#71717a] hover:text-[#e5484d] hover:bg-[#e5484d]/10 rounded-md transition-colors cursor-pointer"
                          aria-label="Delete obligation"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {filteredObligations.length > 0 && (
            <tfoot>
              <tr className="bg-[#141415]/80 border-t border-white/[0.08] text-[12px] text-[#a1a1a6]">
                <td colSpan={2} className="py-3 px-4 tabular-nums">
                  Showing {filteredObligations.length} of {obligations.length} obligations
                </td>
                <td colSpan={4} className="py-3 px-3 text-right text-[#71717a]">
                  Filtered exposure
                </td>
                <td className="py-3 px-3 font-mono font-medium text-[#ededed] tabular-nums">
                  {formatCurrency(filteredTotalValue, currency, conversionMultiplier)}
                  {currency === 'INR' && filteredTotalValue * conversionMultiplier >= 100000 && (
                    <span className="text-[11px] ml-1.5 text-[#71717a] font-normal">
                      ({formatIndianCompactNotation(filteredTotalValue, conversionMultiplier)})
                    </span>
                  )}
                </td>
                <td colSpan={2} className="py-3 px-3 text-right text-[11px] text-[#71717a] no-print">
                  Inline edits saved automatically
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
