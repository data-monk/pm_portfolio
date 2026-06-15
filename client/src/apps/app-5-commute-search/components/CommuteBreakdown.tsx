import React from 'react';
import type { CommuteData, RouteStep } from '../lib/types';
import { formatDuration } from '../lib/utils';
import { COMMUTE_MODE_ICONS, COMMUTE_MODE_LABELS } from '../constants/transitLines';

interface CommuteBreakdownProps {
  commute: CommuteData;
  destinationLabel: string;
}

function ModeIcon({ step }: { step: RouteStep }): React.ReactElement {
  if (step.mode === 'walking') {
    return <span className="text-slate-400" aria-hidden="true">🚶</span>;
  }
  if (step.transit_line) {
    return (
      <span
        className={`cs-line-${step.transit_line} inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0`}
        aria-label={`${step.transit_line} train`}
      >
        {step.transit_line}
      </span>
    );
  }
  return <span className="text-slate-400" aria-hidden="true">🔄</span>;
}

function StepRow({ step, isLast }: { step: RouteStep; isLast: boolean }): React.ReactElement {
  const isWalking = step.mode === 'walking';
  const isTransit = step.mode === 'transit' && Boolean(step.transit_line);
  const isTransfer = step.mode === 'walking' && step.instruction.toLowerCase().includes('transfer');

  return (
    <div className="flex gap-3">
      {/* Icon + connector line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="flex items-center justify-center w-6 h-6 mt-0.5">
          <ModeIcon step={step} />
        </div>
        {!isLast && (
          <div className="cs-route-connector flex-1 min-h-4 mt-1" aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className={`pb-4 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
        {isTransit ? (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-200">
                {step.transit_line} train
              </span>
              <span className="text-xs text-slate-500">
                {formatDuration(step.duration_seconds)}
              </span>
            </div>
            {step.departure_stop && step.arrival_stop && (
              <p className="text-xs text-slate-400 mt-0.5">
                {step.departure_stop}
                <span aria-hidden="true"> → </span>
                <span className="sr-only">to </span>
                {step.arrival_stop}
              </p>
            )}
          </div>
        ) : isTransfer ? (
          <p className="text-sm italic text-slate-400">
            Transfer · {formatDuration(step.duration_seconds)}
          </p>
        ) : isWalking ? (
          <div>
            <p className="text-sm text-slate-300">{step.instruction}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Walk · {formatDuration(step.duration_seconds)}
              {step.distance_meters > 0 && ` · ${Math.round(step.distance_meters / 1.609 / 1000 * 10) / 10} mi`}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-300">{step.instruction}</p>
            <p className="text-xs text-slate-500">{formatDuration(step.duration_seconds)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const CommuteBreakdown: React.FC<CommuteBreakdownProps> = ({
  commute,
  destinationLabel,
}) => {
  const totalMins = Math.round(commute.commute_time_seconds / 60);
  const distanceMiles =
    commute.distance_meters > 0
      ? (commute.distance_meters / 1609.34).toFixed(1)
      : null;
  const modeIcon = COMMUTE_MODE_ICONS[commute.commute_mode] ?? '🚇';
  const modeLabel = COMMUTE_MODE_LABELS[commute.commute_mode] ?? commute.commute_mode;

  const hasSteps = commute.route_steps && commute.route_steps.length > 0;

  return (
    <div className="bg-[#1a1a2a] rounded-xl border border-[rgba(255,255,255,0.08)] p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl" aria-hidden="true">{modeIcon}</span>
        <div>
          <h3 className="text-xl font-bold text-slate-100">
            {totalMins} <span className="font-normal text-base text-slate-300">minutes</span>
          </h3>
          <p className="text-sm text-slate-400">
            by {modeLabel}
            {commute.peak_time_used && ' · Peak · Mon 8:00 AM'}
          </p>
        </div>
      </div>

      {/* Sub-header */}
      <div className="flex items-center gap-4 mb-5 text-sm text-slate-400">
        {commute.num_transfers !== null && (
          <span>
            <span className="font-medium text-slate-300">
              {commute.num_transfers === 0 ? 'Direct' : `${commute.num_transfers} transfer${commute.num_transfers > 1 ? 's' : ''}`}
            </span>
          </span>
        )}
        {distanceMiles && (
          <span>{distanceMiles} miles</span>
        )}
        {commute.route_summary && !hasSteps && (
          <span className="text-slate-400">{commute.route_summary}</span>
        )}
      </div>

      {/* Route Steps */}
      {hasSteps ? (
        <div className="mt-2">
          {commute.route_steps.map((step, i) => (
            <StepRow
              key={step.step_index}
              step={step}
              isLast={i === commute.route_steps.length - 1}
            />
          ))}
        </div>
      ) : commute.route_summary ? (
        <div className="px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.04)] text-sm text-slate-300">
          {commute.route_summary}
        </div>
      ) : null}

      {/* Destination */}
      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <span aria-hidden="true">📍</span>
          <span>To: {destinationLabel}</span>
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Calculated for Mon 8:30 AM departure (peak hour)
        </p>
      </div>
    </div>
  );
};

export default CommuteBreakdown;
