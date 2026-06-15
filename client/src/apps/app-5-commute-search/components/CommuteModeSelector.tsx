import React from 'react';
import type { CommuteMode } from '../lib/types';
import { COMMUTE_MODE_ICONS, COMMUTE_MODE_LABELS } from '../constants/transitLines';

interface CommuteModesSelectorProps {
  value: CommuteMode;
  onChange: (mode: CommuteMode) => void;
}

const MODES: CommuteMode[] = ['transit', 'driving', 'bicycling', 'walking'];

const CommuteModeSelector: React.FC<CommuteModesSelectorProps> = ({ value, onChange }) => {
  return (
    <div
      className="grid grid-cols-2 md:flex md:flex-row gap-2"
      role="group"
      aria-label="Commute mode"
    >
      {MODES.map((mode) => {
        const isActive = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={isActive}
            aria-label={`${COMMUTE_MODE_LABELS[mode]} commute mode`}
            className={`
              flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
              transition-all duration-150 min-h-[44px] cursor-pointer
              ${isActive
                ? 'border-2 border-[#00d4ff] bg-[rgba(0,212,255,0.1)] text-[#00d4ff]'
                : 'border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-slate-400 hover:bg-[rgba(255,255,255,0.08)] hover:text-slate-200'
              }
            `}
          >
            <span className="text-base" aria-hidden="true">{COMMUTE_MODE_ICONS[mode]}</span>
            <span>{COMMUTE_MODE_LABELS[mode]}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CommuteModeSelector;
