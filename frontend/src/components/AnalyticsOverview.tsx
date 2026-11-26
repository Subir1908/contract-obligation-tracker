import React, { useMemo, useState } from 'react';
import type { ContractObligation, CurrencyCode } from '../types/obligation';
import {
  calculateUrgency,
  calculateRisk,
  formatCurrency,
  formatIndianCompactNotation,
} from '../utils/dateUtils';

interface AnalyticsOverviewProps {
  obligations: ContractObligation[];
  referenceDate: string;
  currency: CurrencyCode;
  conversionMultiplier: number;
}

interface TimelineBucket {
  key: string;
  label: string;
  shortDate: string;
  value: number;
  count: number;
  isCurrentOrRef: boolean;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  obligations,
  referenceDate,
  currency,
  conversionMultiplier,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

  const { totalValue, verifiedCount, verifiedPct, buckets, hasMonetary } = useMemo(() => {
    let total = 0;
    let verified = 0;
    const datedMap = new Map<string, { value: number; count: number }>();

    obligations.forEach((ob) => {
      const val = ob.monetaryValue || 0;
      total += val;
      if (ob.verificationStatus === 'VERIFIED') verified++;

      const dateKey = ob.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(ob.dueDate)
        ? ob.dueDate.slice(0, 7) // YYYY-MM grouping for clean macro curve
        : 'Unspecified';

      if (dateKey !== 'Unspecified') {
        const existing = datedMap.get(dateKey) || { value: 0, count: 0 };
        existing.value += val;
        existing.count += 1;
        datedMap.set(dateKey, existing);
      }
    });

    const sortedKeys = Array.from(datedMap.keys()).sort();
    const refMonth = referenceDate.slice(0, 7);

    // Build chronological buckets; if very few dates exist, include individual dates cleanly
    let computedBuckets: TimelineBucket[] = [];
    if (sortedKeys.length >= 2 && sortedKeys.length <= 4) {
      // Group by exact due date if few months so chart curve shows real resolution
      const exactMap = new Map<string, { value: number; count: number }>();
      obligations.forEach((ob) => {
        if (ob.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(ob.dueDate)) {
          const ex = exactMap.get(ob.dueDate) || { value: 0, count: 0 };
          ex.value += ob.monetaryValue || 0;
          ex.count += 1;
          exactMap.set(ob.dueDate, ex);
        }
      });
      const exactKeys = Array.from(exactMap.keys()).sort();
      if (exactKeys.length >= 2) {
        computedBuckets = exactKeys.slice(0, 12).map((d) => {
          const [y, m, day] = d.split('-').map(Number);
          const dt = new Date(y, m - 1, day);
          const item = exactMap.get(d)!;
          return {
            key: d,
            label: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            shortDate: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: item.value,
            count: item.count,
            isCurrentOrRef: d === referenceDate,
          };
        });
      }
    }

    if (computedBuckets.length === 0) {
      computedBuckets = sortedKeys.map((ym) => {
        const [y, m] = ym.split('-').map(Number);
        const dt = new Date(y, m - 1, 1);
        const item = datedMap.get(ym)!;
        return {
          key: ym,
          label: dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          shortDate: dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          value: item.value,
          count: item.count,
          isCurrentOrRef: ym === refMonth,
        };
      });
    }

    const pct = obligations.length > 0 ? Math.round((verified / obligations.length) * 100) : 0;
    return {
      totalValue: total,
      verifiedCount: verified,
      verifiedPct: pct,
      buckets: computedBuckets,
      hasMonetary: total > 0,
    };
  }, [obligations, referenceDate]);

  // Risk & Timeline distribution for the right card bars
  const statusRiskColumns = useMemo(() => {
    const groups = [
      { label: 'Overdue', low: 0, med: 0, high: 0 },
      { label: 'Due today', low: 0, med: 0, high: 0 },
      { label: '30 days', low: 0, med: 0, high: 0 },
      { label: 'Later', low: 0, med: 0, high: 0 },
      { label: 'Undated', low: 0, med: 0, high: 0 },
    ];

    obligations.forEach((ob) => {
      const u = calculateUrgency(ob.dueDate, referenceDate);
      const risk = ob.riskLevel || calculateRisk(ob.monetaryValue, ob.latePenalty, u.status).level;
      let targetIdx = 4;
      if (!ob.dueDate) {
        targetIdx = 4;
      } else if (u.status === 'OVERDUE') {
        targetIdx = 0;
      } else if (u.status === 'DUE_TODAY') {
        targetIdx = 1;
      } else if (u.daysDiff <= 30) {
        targetIdx = 2;
      } else {
        targetIdx = 3;
      }

      if (risk === 'HIGH') groups[targetIdx].high++;
      else if (risk === 'MEDIUM') groups[targetIdx].med++;
      else groups[targetIdx].low++;
    });

    const maxCount = Math.max(
      1,
      ...groups.map((g) => Math.max(g.low, g.med, g.high))
    );

    return { groups, maxCount };
  }, [obligations, referenceDate]);

  // SVG Chart Geometry
  const svgW = 720;
  const svgH = 210;
  const padL = 46;
  const padR = 16;
  const padT = 16;
  const padB = 18;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const seriesValues = buckets.map((b) => (hasMonetary ? b.value * conversionMultiplier : b.count));
  const maxY = Math.max(1, ...seriesValues) * 1.15;

  const points = buckets.map((b, i) => {
    const x =
      buckets.length === 1
        ? padL + plotW / 2
        : padL + (i / (buckets.length - 1)) * plotW;
    const rawY = hasMonetary ? b.value * conversionMultiplier : b.count;
    const y = padT + plotH - (rawY / maxY) * plotH;
    return { x, y, bucket: b };
  });

  // Smooth monotone/cubic path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const bottomY = padT + plotH;
    return `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [linePath, points, padT, plotH]);

  const defaultHighlightIdx = useMemo(() => {
    if (points.length === 0) return null;
    const refIdx = points.findIndex((p) => p.bucket.isCurrentOrRef);
    return refIdx >= 0 ? refIdx : Math.floor(points.length / 2);
  }, [points]);

  const activePointIdx = hoveredIdx !== null ? hoveredIdx : defaultHighlightIdx;
  const activePoint = activePointIdx !== null ? points[activePointIdx] : null;

  const formatAxisTick = (val: number) => {
    if (!hasMonetary) return `${Math.round(val)}`;
    if (currency === 'INR') {
      if (val >= 10000000) return `${(val / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
      if (val >= 100000) return `${(val / 100000).toFixed(1).replace(/\.0$/, '')}L`;
      if (val >= 1000) return `${Math.round(val / 1000)}k`;
      return `${Math.round(val)}`;
    }
    if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}k`;
    return `${Math.round(val)}`;
  };

  const formattedHeadlineValue =
    currency === 'INR' && totalValue * conversionMultiplier >= 100000
      ? formatIndianCompactNotation(totalValue, conversionMultiplier)
      : formatCurrency(totalValue, currency, conversionMultiplier);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 no-print">
      {/* Left 8 cols: Exposure Timeline Curve */}
      <div className="lg:col-span-8 bg-[#19191b] border border-white/[0.08] rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[13px] text-[#a1a1a6] font-normal">
              {hasMonetary ? 'Financial exposure timeline' : 'Scheduled obligations timeline'}
            </div>
            <div className="text-[28px] font-medium tracking-tight text-[#ededed] tabular-nums leading-tight mt-1">
              {hasMonetary ? formattedHeadlineValue : `${obligations.length} obligations`}
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#4cc38a] tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]"></span>
              {verifiedCount} of {obligations.length} verified
            </span>
          </div>
        </div>

        {points.length >= 2 ? (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-[210px] overflow-visible"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id="exposureFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ededed" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#ededed" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines & Y Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const y = padT + plotH * (1 - t);
                const tickVal = maxY * t;
                return (
                  <g key={i}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={svgW - padR}
                      y2={y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray={t === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-[#71717a] text-[10px] font-mono tabular-nums"
                    >
                      {formatAxisTick(tickVal)}
                    </text>
                  </g>
                );
              })}

              {/* Area + Curve */}
              <path d={areaPath} fill="url(#exposureFill)" />
              <path
                d={linePath}
                fill="none"
                stroke="#d4d4d8"
                strokeWidth="1.75"
                strokeLinecap="round"
              />

              {/* Active Crosshair & Floating Card */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    y1={padT}
                    x2={activePoint.x}
                    y2={padT + plotH}
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="4"
                    fill="#ededed"
                    stroke="#19191b"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* Invisible Hit Areas for Smooth Hover */}
              {points.map((pt, idx) => {
                const segW = plotW / points.length;
                return (
                  <rect
                    key={pt.bucket.key}
                    x={pt.x - segW / 2}
                    y={padT}
                    width={segW}
                    height={plotH}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredIdx(idx)}
                  />
                );
              })}
            </svg>

            {/* Floating Hover Readout matching reference tooltip */}
            {activePoint && (
              <div
                className="pointer-events-none absolute top-2 px-3 py-2 rounded-lg bg-[#232325] border border-white/[0.1] shadow-lg text-[12px] transition-opacity duration-150"
                style={{
                  left: `clamp(52px, ${(activePoint.x / svgW) * 100}%, calc(100% - 175px))`,
                }}
              >
                <div className="text-[#a1a1a6] text-[11px]">{activePoint.bucket.label}</div>
                <div className="flex items-center gap-2 mt-0.5 tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ededed]"></span>
                  <span className="text-[#a1a1a6]">
                    {hasMonetary ? 'Exposure' : 'Items'}
                  </span>
                  <span className="font-medium text-[#ededed]">
                    {hasMonetary
                      ? formatCurrency(activePoint.bucket.value, currency, conversionMultiplier)
                      : activePoint.bucket.count}
                  </span>
                </div>
                <div className="text-[11px] text-[#71717a] mt-0.5 tabular-nums">
                  {activePoint.bucket.count} {activePoint.bucket.count === 1 ? 'obligation' : 'obligations'}
                </div>
              </div>
            )}

            {/* X-Axis Dates with active white pill highlight */}
            <div className="flex items-center justify-between pl-10 pr-2 pt-2">
              {points.map((pt, idx) => {
                // Thin out labels if many buckets
                const showLabel =
                  points.length <= 7 ||
                  idx === 0 ||
                  idx === points.length - 1 ||
                  idx === activePointIdx ||
                  idx % Math.ceil(points.length / 6) === 0;
                if (!showLabel) return null;
                const isActive = idx === activePointIdx;
                return (
                  <button
                    key={pt.bucket.key}
                    type="button"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#ededed] text-[#0f0f10] font-medium'
                        : 'text-[#71717a] hover:text-[#ededed]'
                    }`}
                  >
                    {pt.bucket.shortDate}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-lg bg-[#141415]/60 text-center px-6">
            <p className="text-[13px] text-[#a1a1a6]">
              {obligations.length === 0
                ? 'Upload a contract to plot obligation exposure over time'
                : 'Add due dates to obligations in the table below to chart the schedule curve'}
            </p>
          </div>
        )}
      </div>

      {/* Right 4 cols: Verification & Risk Bar Breakdown */}
      <div className="lg:col-span-4 bg-[#19191b] border border-white/[0.08] rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#a1a1a6]">Verification rate</span>
            <span className="text-[12px] font-mono tabular-nums text-[#71717a]">
              {obligations.length} total
            </span>
          </div>

          <div className="flex items-baseline gap-2.5 mt-1.5">
            <span className="text-[28px] font-medium text-[#ededed] tabular-nums leading-none">
              {verifiedPct}%
            </span>
            <span className="text-[12px] text-[#4cc38a] tabular-nums">
              {verifiedCount} reviewed
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3 text-[11px] text-[#a1a1a6]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#ededed]"></span>
              High risk
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#71717a]"></span>
              Medium
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#3f3f46]"></span>
              Low
            </span>
          </div>
        </div>

        {/* Vertical Grouped Bars */}
        <div className="mt-5 pt-2">
          <div className="h-[136px] flex items-end justify-between gap-2 border-b border-white/[0.08] pb-2">
            {statusRiskColumns.groups.map((grp, idx) => {
              const highH = Math.max(grp.high > 0 ? 12 : 4, (grp.high / statusRiskColumns.maxCount) * 116);
              const medH = Math.max(grp.med > 0 ? 12 : 4, (grp.med / statusRiskColumns.maxCount) * 116);
              const lowH = Math.max(grp.low > 0 ? 12 : 4, (grp.low / statusRiskColumns.maxCount) * 116);
              const totalInBucket = grp.high + grp.med + grp.low;
              const isHovered = hoveredBarIdx === idx;

              return (
                <div
                  key={grp.label}
                  onMouseEnter={() => setHoveredBarIdx(idx)}
                  onMouseLeave={() => setHoveredBarIdx(null)}
                  className="flex-1 flex flex-col items-center gap-1 relative group cursor-default"
                  title={`${grp.label}: ${grp.high} High, ${grp.med} Medium, ${grp.low} Low`}
                >
                  {isHovered && totalInBucket > 0 && (
                    <div className="absolute -top-7 px-2 py-0.5 rounded bg-[#232325] border border-white/[0.1] text-[10px] font-mono tabular-nums text-[#ededed] whitespace-nowrap z-10">
                      {totalInBucket}
                    </div>
                  )}
                  <div className="w-full flex items-end justify-center gap-1 h-[120px]">
                    <div
                      style={{ height: `${highH}px` }}
                      className={`w-1.5 rounded-t-xs transition-opacity ${
                        grp.high > 0 ? 'bg-[#ededed]' : 'bg-white/[0.06]'
                      }`}
                    />
                    <div
                      style={{ height: `${medH}px` }}
                      className={`w-1.5 rounded-t-xs transition-opacity ${
                        grp.med > 0 ? 'bg-[#71717a]' : 'bg-white/[0.06]'
                      }`}
                    />
                    <div
                      style={{ height: `${lowH}px` }}
                      className={`w-1.5 rounded-t-xs transition-opacity ${
                        grp.low > 0 ? 'bg-[#3f3f46]' : 'bg-white/[0.06]'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            {statusRiskColumns.groups.map((grp) => (
              <div
                key={grp.label}
                className="flex-1 text-center text-[11px] text-[#71717a] truncate"
              >
                {grp.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
