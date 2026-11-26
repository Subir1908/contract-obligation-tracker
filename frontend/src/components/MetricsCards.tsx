import React from 'react';
import type { ContractObligation, TimelineStatus, CurrencyCode, RiskLevel } from '../types/obligation';
import {
  calculateUrgency,
  calculateRisk,
  formatCurrency,
  formatIndianCompactNotation,
} from '../utils/dateUtils';

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
  let overdueCount = 0;
  let overdueValue = 0;
  let dueTodayCount = 0;
  let dueTodayValue = 0;
  let upcomingCount = 0;
  let totalValue = 0;
  let highRiskCount = 0;
  let highRiskValue = 0;

  obligations.forEach((ob) => {
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
    }
  });

  const formatVal = (val: number) => {
    if (currency === 'INR' && val * conversionMultiplier >= 100000) {
      return formatIndianCompactNotation(val, conversionMultiplier);
    }
    return formatCurrency(val, currency, conversionMultiplier);
  };

  const overdueShare =
    obligations.length > 0 ? Math.round((overdueCount / obligations.length) * 100) : 0;
  const highRiskShare =
    obligations.length > 0 ? Math.round((highRiskCount / obligations.length) * 100) : 0;

  const isAllActive = activeStatusFilter === 'ALL' && activeRiskFilter === 'ALL';

  return (
    <div className="space-y-2.5 no-print">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Obligations */}
        <button
          type="button"
          onClick={() => {
            onSelectFilter('ALL');
            if (onSelectRiskFilter) onSelectRiskFilter('ALL');
          }}
          className={`text-left p-5 rounded-xl border transition-colors cursor-pointer ${
            isAllActive
              ? 'bg-[#202023] border-white/[0.18] raised-highlight'
              : 'bg-[#19191b] hover:bg-[#1e1e21] border-white/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-[#a1a1a6]">Total obligations</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#4cc38a] tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]"></span>
              {upcomingCount} on track
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mt-3">
            <span className="text-[28px] font-medium text-[#ededed] tabular-nums leading-none">
              {obligations.length}
            </span>
            <span className="text-[12px] text-[#71717a] tabular-nums truncate">
              {formatVal(totalValue)} total value
            </span>
          </div>
        </button>

        {/* Card 2: Overdue */}
        <button
          type="button"
          onClick={() => {
            onSelectFilter(activeStatusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE');
            if (onSelectRiskFilter) onSelectRiskFilter('ALL');
          }}
          className={`text-left p-5 rounded-xl border transition-colors cursor-pointer ${
            activeStatusFilter === 'OVERDUE'
              ? 'bg-[#232325] border-[#e5484d]/50 raised-highlight'
              : 'bg-[#19191b] hover:bg-[#1e1e21] border-white/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-[#a1a1a6]">Overdue</span>
            <span
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums ${
                overdueCount > 0 ? 'text-[#e5484d]' : 'text-[#71717a]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  overdueCount > 0 ? 'bg-[#e5484d]' : 'bg-[#71717a]'
                }`}
              ></span>
              {overdueShare}% share
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mt-3">
            <span className="text-[28px] font-medium text-[#ededed] tabular-nums leading-none">
              {overdueCount}
            </span>
            <span className="text-[12px] text-[#71717a] tabular-nums truncate">
              {formatVal(overdueValue)} at risk
            </span>
          </div>
        </button>

        {/* Card 3: Due Today */}
        <button
          type="button"
          onClick={() => {
            onSelectFilter(activeStatusFilter === 'DUE_TODAY' ? 'ALL' : 'DUE_TODAY');
            if (onSelectRiskFilter) onSelectRiskFilter('ALL');
          }}
          className={`text-left p-5 rounded-xl border transition-colors cursor-pointer ${
            activeStatusFilter === 'DUE_TODAY'
              ? 'bg-[#232325] border-[#eab308]/50 raised-highlight'
              : 'bg-[#19191b] hover:bg-[#1e1e21] border-white/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-[#a1a1a6]">Due today</span>
            <span
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums ${
                dueTodayCount > 0 ? 'text-[#eab308]' : 'text-[#71717a]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dueTodayCount > 0 ? 'bg-[#eab308]' : 'bg-[#71717a]'
                }`}
              ></span>
              {dueTodayCount > 0 ? 'Immediate' : 'Clear'}
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mt-3">
            <span className="text-[28px] font-medium text-[#ededed] tabular-nums leading-none">
              {dueTodayCount}
            </span>
            <span className="text-[12px] text-[#71717a] tabular-nums truncate">
              {formatVal(dueTodayValue)} exposure
            </span>
          </div>
        </button>

        {/* Card 4: High Risk */}
        <button
          type="button"
          onClick={() => {
            if (onSelectRiskFilter) {
              onSelectRiskFilter(activeRiskFilter === 'HIGH' ? 'ALL' : 'HIGH');
              onSelectFilter('ALL');
            }
          }}
          className={`text-left p-5 rounded-xl border transition-colors cursor-pointer ${
            activeRiskFilter === 'HIGH'
              ? 'bg-[#232325] border-[#e5484d]/50 raised-highlight'
              : 'bg-[#19191b] hover:bg-[#1e1e21] border-white/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-[#a1a1a6]">High risk</span>
            <span
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums ${
                highRiskCount > 0 ? 'text-[#e5484d]' : 'text-[#71717a]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  highRiskCount > 0 ? 'bg-[#e5484d]' : 'bg-[#71717a]'
                }`}
              ></span>
              {highRiskShare}% critical
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mt-3">
            <span className="text-[28px] font-medium text-[#ededed] tabular-nums leading-none">
              {highRiskCount}
            </span>
            <span className="text-[12px] text-[#71717a] tabular-nums truncate">
              {formatVal(highRiskValue)} critical
            </span>
          </div>
        </button>
      </div>

      {!isAllActive && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              onSelectFilter('ALL');
              if (onSelectRiskFilter) onSelectRiskFilter('ALL');
            }}
            className="text-[12px] text-[#a1a1a6] hover:text-[#ededed] transition-colors cursor-pointer"
          >
            Clear active filter
          </button>
        </div>
      )}
    </div>
  );
};
