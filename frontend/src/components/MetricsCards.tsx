import React from 'react';
import {
  AlertCircle,
  Clock,
  CalendarCheck,
  Layers,
  ShieldAlert,
  Flame
} from 'lucide-react';
import type { ContractObligation, TimelineStatus, CurrencyCode, RiskLevel } from '../types/obligation';
import { calculateUrgency, calculateRisk, formatCurrency, formatIndianCompactNotation } from '../utils/dateUtils';

interface MetricsCardsProps {
  obligations: ContractObligation[];
  referenceDate: string;
  activeStatusFilter: 'ALL' | TimelineStatus;
  onSelectFilter: (status: 'ALL' | TimelineStatus) => void;
  activeRiskFilter?: 'ALL' | RiskLevel;
  onSelectRiskFilter?: (risk: 'ALL' | RiskLevel) => void;
  currency?: CurrencyCode;
  conversionMultiplier?: number;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  obligations,
  referenceDate,
  activeStatusFilter,
  onSelectFilter,
  activeRiskFilter = 'ALL',
  onSelectRiskFilter,
  currency = 'INR',
  conversionMultiplier = 1,
}) => {
  // Aggregate counts and values
  let overdueCount = 0;
  let overdueValue = 0;
  let dueTodayCount = 0;
  let dueTodayValue = 0;
  let upcomingCount = 0;
  let upcomingValue = 0;
  let totalValue = 0;
  let highRiskCount = 0;
  let highRiskValue = 0;
  let next7DaysCount = 0;

  obligations.forEach(ob => {
    const val = ob.monetaryValue || 0;
    totalValue += val;
    const urgency = calculateUrgency(ob.dueDate, referenceDate);
    const risk = calculateRisk(val, ob.latePenalty, urgency.status);

    if (risk.level === 'HIGH' || ob.riskLevel === 'HIGH') {
      highRiskCount++;
      highRiskValue += val;
    }

    if (urgency.status === 'OVERDUE') {
      overdueCount++;
      overdueValue += val;
    } else if (urgency.status === 'DUE_TODAY') {
      dueTodayCount++;
      dueTodayValue += val;
    } else {
      upcomingCount++;
      upcomingValue += val;
      if (urgency.daysDiff > 0 && urgency.daysDiff <= 7) {
        next7DaysCount++;
      }
    }
  });

  const formatVal = (val: number) => {
    const formatted = formatCurrency(val, currency, conversionMultiplier);
    if (currency === 'INR' && val * conversionMultiplier >= 100000) {
      const compact = formatIndianCompactNotation(val, conversionMultiplier);
      return `${formatted} • ${compact}`;
    }
    return formatted;
  };

  return (
    <div className="space-y-3 no-print">
      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Obligations */}
        <div
          onClick={() => onSelectFilter('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden bg-white hover:bg-slate-50/80 ${
            activeStatusFilter === 'ALL' && activeRiskFilter === 'ALL'
              ? 'ring-2 ring-slate-900 shadow-md border-slate-900'
              : 'border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Obligations</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{obligations.length}</span>
            <span className="text-xs text-slate-500">records</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-600 truncate">
            {formatVal(totalValue)}
          </div>
        </div>

        {/* Overdue Milestones (FR-5) */}
        <div
          onClick={() => onSelectFilter('OVERDUE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            overdueCount > 0 ? 'bg-rose-50/40 hover:bg-rose-50/70 border-rose-200' : 'bg-white hover:bg-slate-50/80 border-slate-200/90'
          } ${
            activeStatusFilter === 'OVERDUE'
              ? 'ring-2 ring-rose-600 shadow-md shadow-rose-500/10'
              : 'shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600">{overdueCount}</span>
            <span className="text-xs text-rose-600 font-medium">breached</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-rose-700 truncate">
            {formatVal(overdueValue)} exposure
          </div>
        </div>

        {/* Due Today (FR-5) */}
        <div
          onClick={() => onSelectFilter('DUE_TODAY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            dueTodayCount > 0 ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200' : 'bg-white hover:bg-slate-50/80 border-slate-200/90'
          } ${
            activeStatusFilter === 'DUE_TODAY'
              ? 'ring-2 ring-amber-600 shadow-md shadow-amber-500/10'
              : 'shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Due Today</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700">{dueTodayCount}</span>
            <span className="text-xs text-amber-700 font-medium">immediate</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-amber-800 truncate">
            {formatVal(dueTodayValue)}
          </div>
        </div>

        {/* FR-7: High Risk Severity Scoring */}
        <div
          onClick={() => onSelectRiskFilter && onSelectRiskFilter(activeRiskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            highRiskCount > 0 ? 'bg-purple-50/50 hover:bg-purple-50/80 border-purple-200' : 'bg-white hover:bg-slate-50/80 border-slate-200/90'
          } ${
            activeRiskFilter === 'HIGH'
              ? 'ring-2 ring-purple-600 shadow-md shadow-purple-500/10'
              : 'shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider">High Risk</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-200 text-purple-800 font-bold">FR-7</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-900">{highRiskCount}</span>
            <span className="text-xs text-purple-700 font-medium">critical clauses</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-purple-800 truncate">
            {formatVal(highRiskValue)}
          </div>
        </div>

      </div>

      {/* Quick-Filter Shortcuts (FR-5.3 & FR-7.2) */}
      <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
        <span className="text-slate-500 font-medium text-[11px] mr-1">Quick Filters (FR-5.3):</span>
        
        <button
          type="button"
          onClick={() => {
            onSelectFilter('OVERDUE');
            if (onSelectRiskFilter) onSelectRiskFilter('ALL');
          }}
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeStatusFilter === 'OVERDUE'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Show Overdue Only ({overdueCount})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectFilter('UPCOMING');
            if (onSelectRiskFilter) onSelectRiskFilter('ALL');
          }}
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeStatusFilter === 'UPCOMING'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Show Upcoming Next 7 Days ({next7DaysCount})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onSelectRiskFilter) onSelectRiskFilter('HIGH');
            onSelectFilter('ALL');
          }}
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeRiskFilter === 'HIGH'
              ? 'bg-purple-700 text-white border-purple-700'
              : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Show High-Risk Exposure (FR-7.2)</span>
        </button>

        {(activeStatusFilter !== 'ALL' || activeRiskFilter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              onSelectFilter('ALL');
              if (onSelectRiskFilter) onSelectRiskFilter('ALL');
            }}
            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};
