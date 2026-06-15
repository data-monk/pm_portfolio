import React from 'react';

interface CommuteSliderProps {
  value: number; // in seconds
  onChange: (seconds: number) => void;
  min?: number; // in minutes, default 5
  max?: number; // in minutes, default 120
}

const CommuteSlider: React.FC<CommuteSliderProps> = ({
  value,
  onChange,
  min = 5,
  max = 120,
}) => {
  const currentMinutes = Math.round(value / 60);
  const step = 5;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mins = parseInt(e.target.value, 10);
    onChange(mins * 60);
  };

  // Calculate fill percentage for the track
  const fillPct = ((currentMinutes - min) / (max - min)) * 100;
  const trackStyle: React.CSSProperties = {
    background: `linear-gradient(to right, #00d4ff 0%, #a855f7 ${fillPct}%, #2a2a3e ${fillPct}%)`,
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Max commute time</span>
        <span className="text-2xl font-bold text-[#00d4ff]" aria-live="polite">
          {currentMinutes} min
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentMinutes}
        onChange={handleChange}
        style={trackStyle}
        aria-label={`Maximum commute time: ${currentMinutes} minutes`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={currentMinutes}
        aria-valuetext={`${currentMinutes} minutes`}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min} min</span>
        <span>{max} min</span>
      </div>
    </div>
  );
};

export default CommuteSlider;
