import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Plus, 
  Trash2, 
  Copy, 
  AlertCircle, 
  Clock, 
  CalendarCheck, 
  DollarSign, 
  Building2, 
  FileText, 
  Calendar as CalendarIcon, 
  ShieldAlert, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  IndianRupee, 
  Check 
} from 'lucide-react';
import type { ContractObligation, TimelineStatus, CurrencyCode, RiskLevel } from '../types/obligation';
import { calculateUrgency, calculateRisk, formatCurrency, formatDateDisplay, formatIndianCompactNotation } from '../utils/dateUtils';

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
  onLoadDemoContract: () => void;
  currency?: CurrencyCode;
  conversionMultiplier?: number;
  onSelectClauseSnippet?: (id: string) => void;
}

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
  onLoadDemoContract,
  currency = 'INR',
  conversionMultiplier = 1,
  onSelectClauseSnippet,
}) => {
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [partyFilter, setPartyFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'dueDate' | 'monetaryValue' | 'responsibleParty' | 'risk'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Unique parties list for party filter dropdown
  const uniqueParties = useMemo(() => {
    const set = new Set<string>();
    obligations.forEach(o => {
      if (o.responsibleParty) set.add(o.responsibleParty.trim());
    });
    return Array.from(set).sort();
  }, [obligations]);

  // Handle sorting toggle
  const handleSortToggle = (field: 'dueDate' | 'monetaryValue' | 'responsibleParty' | 'risk') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'monetaryValue' || field === 'risk' ? 'desc' : 'asc');
    }
  };

  // Filter and sort obligations
  const filteredObligations = useMemo(() => {
    let result = [...obligations];

    // 1. Status Filter (FR-5.3)
    if (activeStatusFilter !== 'ALL') {
      result = result.filter(ob => {
        const urgency = calculateUrgency(ob.dueDate, referenceDate);
        return urgency.status === activeStatusFilter;
      });
    }

    // 2. Risk Filter (FR-7.2)
    if (activeRiskFilter !== 'ALL') {
      result = result.filter(ob => {
        const urgency = calculateUrgency(ob.dueDate, referenceDate);
        const risk = calculateRisk(ob.monetaryValue, ob.latePenalty, urgency.status);
        return (ob.riskLevel || risk.level) === activeRiskFilter;
      });
    }

    // 3. Party Filter
    if (partyFilter !== 'ALL') {
      result = result.filter(ob => ob.responsibleParty.trim() === partyFilter);
    }

    // 4. Search Query (full text across description, party, penalty, source clause, id)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(ob => 
        ob.description.toLowerCase().includes(q) ||
        ob.responsibleParty.toLowerCase().includes(q) ||
        ob.latePenalty.toLowerCase().includes(q) ||
        (ob.sourceClause && ob.sourceClause.toLowerCase().includes(q)) ||
        ob.id.toLowerCase().includes(q)
      );
    }

    // 5. Sorting
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
  }, [obligations, activeStatusFilter, activeRiskFilter, partyFilter, searchQuery, sortField, sortOrder, referenceDate]);

  // Aggregate monetary value for filtered list
  const filteredTotalValue = useMemo(() => {
    return filteredObligations.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);
  }, [filteredObligations]);

  // Counts by status for tabs
  const statusCounts = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;

    obligations.forEach(o => {
      const u = calculateUrgency(o.dueDate, referenceDate);
      if (u.status === 'OVERDUE') overdue++;
      else if (u.status === 'DUE_TODAY') dueToday++;
      else upcoming++;
    });

    return { all: obligations.length, overdue, dueToday, upcoming };
  }, [obligations, referenceDate]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      
      {/* TABLE TOOLBAR & CONTROLS (FR-4) */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 space-y-3.5 no-print">
        
        {/* Row 1: Search, Filter Tabs & Add Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 overflow-x-auto">
            <button
              type="button"
              onClick={() => onStatusFilterChange('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeStatusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Obligations</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700">
                {statusCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onStatusFilterChange('OVERDUE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeStatusFilter === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Overdue</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                activeStatusFilter === 'OVERDUE' ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-800'
              }`}>
                {statusCounts.overdue}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onStatusFilterChange('DUE_TODAY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeStatusFilter === 'DUE_TODAY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Due Today</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                activeStatusFilter === 'DUE_TODAY' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-800'
              }`}>
                {statusCounts.dueToday}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onStatusFilterChange('UPCOMING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeStatusFilter === 'UPCOMING'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Upcoming</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                activeStatusFilter === 'UPCOMING' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {statusCounts.upcoming}
              </span>
            </button>
          </div>

          {/* Add New Obligation Action (FR-4.3) */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              onClick={onAddObligation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Obligation</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Input & Party Filter & Sort Controls (FR-4.4) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search obligations, parties, penalties, source clauses, or IDs..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Party and Sort Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Party Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium cursor-pointer"
              >
                <option value="ALL">All Parties ({uniqueParties.length})</option>
                {uniqueParties.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Quick Sort Controls */}
            <div className="flex items-center gap-1 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/70 text-xs">
              <button
                type="button"
                onClick={() => handleSortToggle('dueDate')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  sortField === 'dueDate'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Date</span>
                {sortField === 'dueDate' && (
                  sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSortToggle('monetaryValue')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  sortField === 'monetaryValue'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Value</span>
                {sortField === 'monetaryValue' && (
                  sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSortToggle('risk')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  sortField === 'risk'
                    ? 'bg-white text-purple-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Risk</span>
                {sortField === 'risk' && (
                  sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-purple-600" /> : <ChevronDown className="w-3 h-3 text-purple-600" />
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* DATA TABLE SECTION */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
              
              <th className="py-3 px-3 w-10 text-center text-slate-400 font-mono">
                #
              </th>

              <th className="py-3 px-4 min-w-[260px]">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Obligation / Deliverable Description</span>
                </div>
              </th>

              <th className="py-3 px-3 min-w-[170px]">
                <button
                  type="button"
                  onClick={() => handleSortToggle('responsibleParty')}
                  className="flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Responsible Party</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </button>
              </th>

              <th className="py-3 px-3 min-w-[155px]">
                <button
                  type="button"
                  onClick={() => handleSortToggle('dueDate')}
                  className="flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due Date</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </button>
              </th>

              <th className="py-3 px-3 min-w-[145px]">
                <span>Timeline Status (FR-5)</span>
              </th>

              <th className="py-3 px-3 min-w-[130px]">
                <button
                  type="button"
                  onClick={() => handleSortToggle('risk')}
                  className="flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  <span>Risk (FR-7)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </button>
              </th>

              <th className="py-3 px-3 min-w-[155px]">
                <button
                  type="button"
                  onClick={() => handleSortToggle('monetaryValue')}
                  className="flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                >
                  {currency === 'INR' ? (
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Value ({currency === 'INR' ? '₹ INR' : '$ USD'})</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </button>
              </th>

              <th className="py-3 px-3 min-w-[210px]">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  <span>Late Penalty & Source Clause</span>
                </div>
              </th>

              <th className="py-3 px-3 w-24 text-right no-print">
                <span>Actions</span>
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredObligations.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">
                      No matching obligations found
                    </h4>
                    <p className="text-xs text-slate-500">
                      Try clearing filters, searching different keywords, or load the preset demo contract to preview populated extraction tables.
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setPartyFilter('ALL');
                          onStatusFilterChange('ALL');
                          if (onRiskFilterChange) onRiskFilterChange('ALL');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        Clear Filters
                      </button>
                      <button
                        type="button"
                        onClick={onLoadDemoContract}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Load Demo Data
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

                // Timeline Urgency Badge styling per FR-5.2
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/90';
                let dotClass = 'bg-emerald-500';
                let icon = <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />;

                if (urgency.status === 'OVERDUE') {
                  badgeClass = 'bg-rose-50 text-rose-700 border-rose-200/90';
                  dotClass = 'bg-rose-500';
                  icon = <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
                } else if (urgency.status === 'DUE_TODAY') {
                  badgeClass = 'bg-amber-50 text-amber-800 border-amber-200/90';
                  dotClass = 'bg-amber-500 animate-ping';
                  icon = <Clock className="w-3.5 h-3.5 text-amber-600" />;
                }

                // Risk Badge Styling per FR-7.1
                let riskBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (riskLevel === 'HIGH') {
                  riskBadgeClass = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
                } else if (riskLevel === 'MEDIUM') {
                  riskBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
                } else {
                  riskBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                }

                return (
                  <tr 
                    key={ob.id} 
                    className={`hover:bg-blue-50/25 transition-colors group relative ${
                      riskLevel === 'HIGH' ? 'bg-purple-50/20' : ''
                    }`}
                  >
                    {/* Index / ID */}
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Obligation Description (In-Place Editable - FR-4.2) */}
                    <td className="py-2.5 px-4">
                      <div className="relative">
                        <textarea
                          rows={2}
                          value={ob.description}
                          onChange={(e) => onUpdateObligation(ob.id, { description: e.target.value })}
                          placeholder="Enter obligation or deliverable description..."
                          className="w-full text-xs text-slate-800 font-medium bg-transparent hover:bg-white focus:bg-white p-1.5 -m-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all resize-none leading-relaxed"
                        />
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-blue-600 font-bold bg-blue-50 px-1 rounded">
                            {ob.id}
                          </span>
                          
                          {/* FR-4.2 Verification Checkbox */}
                          <button
                            type="button"
                            onClick={() => onUpdateObligation(ob.id, { 
                              verificationStatus: ob.verificationStatus === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED' 
                            })}
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded font-medium transition-colors cursor-pointer ${
                              ob.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Toggle Human Verification Status (FR-4.2)"
                          >
                            <Check className={`w-3 h-3 ${ob.verificationStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>{ob.verificationStatus || 'VERIFIED'}</span>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Responsible Party (In-Place Editable - FR-4.2) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={ob.responsibleParty}
                        onChange={(e) => onUpdateObligation(ob.id, { responsibleParty: e.target.value })}
                        placeholder="Responsible party..."
                        className="w-full text-xs font-semibold text-slate-900 bg-transparent hover:bg-white focus:bg-white p-1.5 -m-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all"
                      />
                    </td>

                    {/* Milestone / Due Date (Normalized YYYY-MM-DD Date Picker - FR-3.2) */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1">
                        <input
                          type="date"
                          value={ob.dueDate}
                          onChange={(e) => onUpdateObligation(ob.id, { dueDate: e.target.value })}
                          className="text-xs font-mono font-medium text-slate-800 bg-slate-50 hover:bg-white focus:bg-white px-2 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all w-full"
                        />
                        <span className="text-[10px] text-slate-400 px-1 font-mono">
                          {formatDateDisplay(ob.dueDate)}
                        </span>
                      </div>
                    </td>

                    {/* Dynamic Urgency Status Badge (FR-5.1 & FR-5.2) */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-2xs ${badgeClass}`}>
                          <span className="relative flex h-2 w-2">
                            {urgency.status === 'DUE_TODAY' && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span>
                          </span>
                          {icon}
                          <span>{urgency.label}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium px-1">
                          {urgency.formattedDelta}
                        </span>
                      </div>
                    </td>

                    {/* FR-7: Risk Severity Level Scoring */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${riskBadgeClass}`}>
                          <ShieldAlert className="w-3 h-3" />
                          <span>{riskLevel} RISK</span>
                        </span>
                        <select
                          value={riskLevel}
                          onChange={(e) => onUpdateObligation(ob.id, { riskLevel: e.target.value as RiskLevel })}
                          className="text-[10px] bg-transparent border-0 text-slate-500 hover:text-slate-800 cursor-pointer focus:outline-hidden"
                          title="Override automated risk level"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </div>
                    </td>

                    {/* Monetary Value (In-Place Editable Currency - FR-3.4) */}
                    <td className="py-2.5 px-3">
                      <div className="relative">
                        <div className="flex items-center">
                          <span className="text-slate-400 text-xs mr-1 font-mono font-semibold">
                            {currency === 'INR' ? '₹' : '$'}
                          </span>
                          <input
                            type="number"
                            step={currency === 'INR' ? '1000' : '100'}
                            min="0"
                            value={ob.monetaryValue || ''}
                            onChange={(e) => onUpdateObligation(ob.id, { monetaryValue: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full text-xs font-mono font-semibold text-slate-900 bg-transparent hover:bg-white focus:bg-white p-1.5 -m-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all"
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {formatCurrency(ob.monetaryValue, currency, conversionMultiplier)}
                          {currency === 'INR' && ob.monetaryValue * conversionMultiplier >= 100000 && (
                            <span className="ml-1 text-emerald-700 font-medium">
                              ({formatIndianCompactNotation(ob.monetaryValue, conversionMultiplier)})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Late Penalty Clause & FR-3.3 Verbatim Snippet */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <textarea
                          rows={2}
                          value={ob.latePenalty}
                          onChange={(e) => onUpdateObligation(ob.id, { latePenalty: e.target.value })}
                          placeholder="Late penalty terms..."
                          className="w-full text-xs text-slate-700 bg-transparent hover:bg-white focus:bg-white p-1 -m-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-all resize-none leading-tight"
                        />
                        {ob.sourceClause && (
                          <div 
                            onClick={() => onSelectClauseSnippet && onSelectClauseSnippet(ob.id)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50/60 p-1 rounded flex items-center gap-1 cursor-pointer truncate"
                            title={ob.sourceClause}
                          >
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate italic">Snippet: "{ob.sourceClause}"</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions (FR-4.2) */}
                    <td className="py-2.5 px-3 text-right no-print">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onDuplicateObligation(ob.id)}
                          title="Duplicate obligation row"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          aria-label="Duplicate obligation"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteObligation(ob.id)}
                          title="Delete obligation row"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          aria-label="Delete obligation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>

          {/* TABLE FOOTER SUMMARY */}
          {filteredObligations.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50/90 border-t-2 border-slate-200/80 font-semibold text-xs text-slate-700">
                <td colSpan={2} className="py-3 px-4">
                  <span>Showing {filteredObligations.length} of {obligations.length} total obligations</span>
                </td>
                <td colSpan={4} className="py-3 px-3 text-right text-slate-500 text-[11px] uppercase tracking-wider">
                  Filtered Total Exposure:
                </td>
                <td className="py-3 px-3 font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(filteredTotalValue, currency, conversionMultiplier)}
                  {currency === 'INR' && filteredTotalValue * conversionMultiplier >= 100000 && (
                    <span className="text-xs ml-1 text-emerald-700 font-normal">
                      ({formatIndianCompactNotation(filteredTotalValue, conversionMultiplier)})
                    </span>
                  )}
                </td>
                <td colSpan={2} className="py-3 px-3 text-right text-slate-400 text-[11px] no-print">
                  All edits auto-saved in memory
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
};
