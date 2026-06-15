import React from 'react';
import { formatDuration, getCommuteBadgeClass } from '../lib/utils';

interface CommuteTimeBadgeProps {
  seconds: number | null | undefined;
  pending?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base font-semibold',
};

const CommuteTimeBadge: React.FC<CommuteTimeBadgeProps> = ({
  seconds,
  pending = false,
  size = 'md',
}) => {
  const sizeClass = sizeClasses[size];

  if (pending) {
    return (
      <span
        className={`inline-block rounded-full ${sizeClass} cs-skeleton`}
        style={{ minWidth: size === 'sm' ? 48 : size === 'md' ? 64 : 80 }}
        aria-label="Commute time loading"
      >
        &nbsp;
      </span>
    );
  }

  if (seconds === null || seconds === undefined) {
    return (
      <span
        className={`inline-block rounded-full ${sizeClass} font-medium`}
        style={{ background: 'rgba(100,116,139,0.15)', color: '#64748b', border: '1px solid rgba(100,116,139,0.3)' }}
        aria-label="Commute time unavailable"
      >
        –
      </span>
    );
  }

  const badgeClass = getCommuteBadgeClass(seconds);
  const label = formatDuration(seconds);

  return (
    <span
      className={`inline-block rounded-full ${sizeClass} font-medium ${badgeClass}`}
      aria-label={`${label} commute`}
    >
      {label}
    </span>
  );
};

export default CommuteTimeBadge;
