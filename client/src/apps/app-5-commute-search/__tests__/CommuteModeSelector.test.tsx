import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommuteModeSelector from '../components/CommuteModeSelector';
import type { CommuteMode } from '../lib/types';

vi.mock('../lib/api', () => ({
  saveListing: vi.fn(() => Promise.resolve()),
  unsaveListing: vi.fn(() => Promise.resolve()),
}));

describe('CommuteModeSelector', () => {
  const defaultProps = {
    value: 'transit' as CommuteMode,
    onChange: vi.fn(),
  };

  it('renders all 4 mode buttons', () => {
    render(<CommuteModeSelector {...defaultProps} />);
    expect(screen.getByText('Transit')).toBeInTheDocument();
    expect(screen.getByText('Driving')).toBeInTheDocument();
    expect(screen.getByText('Biking')).toBeInTheDocument();
    expect(screen.getByText('Walking')).toBeInTheDocument();
  });

  it('marks the active mode with aria-pressed=true', () => {
    render(<CommuteModeSelector value="transit" onChange={vi.fn()} />);
    const transitBtn = screen.getByLabelText(/transit commute mode/i);
    expect(transitBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks inactive modes with aria-pressed=false', () => {
    render(<CommuteModeSelector value="transit" onChange={vi.fn()} />);
    const drivingBtn = screen.getByLabelText(/driving commute mode/i);
    expect(drivingBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with "driving" when Driving button is clicked', async () => {
    const onChange = vi.fn();
    render(<CommuteModeSelector value="transit" onChange={onChange} />);
    await userEvent.click(screen.getByText('Driving'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('driving');
  });

  it('calls onChange with "walking" when Walking button is clicked', async () => {
    const onChange = vi.fn();
    render(<CommuteModeSelector value="transit" onChange={onChange} />);
    await userEvent.click(screen.getByText('Walking'));
    expect(onChange).toHaveBeenCalledWith('walking');
  });

  it('calls onChange with "bicycling" when Biking button is clicked', async () => {
    const onChange = vi.fn();
    render(<CommuteModeSelector value="transit" onChange={onChange} />);
    await userEvent.click(screen.getByText('Biking'));
    expect(onChange).toHaveBeenCalledWith('bicycling');
  });

  it('calls onChange even when active mode is clicked again', async () => {
    const onChange = vi.fn();
    render(<CommuteModeSelector value="transit" onChange={onChange} />);
    await userEvent.click(screen.getByText('Transit'));
    // The component always calls onChange (no deduplication guard)
    expect(onChange).toHaveBeenCalledWith('transit');
  });

  it('renders with driving as the active mode', () => {
    render(<CommuteModeSelector value="driving" onChange={vi.fn()} />);
    const drivingBtn = screen.getByLabelText(/driving commute mode/i);
    expect(drivingBtn).toHaveAttribute('aria-pressed', 'true');
    const transitBtn = screen.getByLabelText(/transit commute mode/i);
    expect(transitBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders with walking as the active mode', () => {
    render(<CommuteModeSelector value="walking" onChange={vi.fn()} />);
    const walkBtn = screen.getByLabelText(/walking commute mode/i);
    expect(walkBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders with bicycling as the active mode', () => {
    render(<CommuteModeSelector value="bicycling" onChange={vi.fn()} />);
    const bikeBtn = screen.getByLabelText(/bicycling commute mode/i);
    expect(bikeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('all buttons have minimum touch target height (min-h-[44px])', () => {
    const { container } = render(<CommuteModeSelector value="transit" onChange={vi.fn()} />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.className).toContain('min-h-');
    });
  });

  it('renders a role=group element for accessibility', () => {
    render(<CommuteModeSelector value="transit" onChange={vi.fn()} />);
    const group = screen.getByRole('group', { name: /commute mode/i });
    expect(group).toBeInTheDocument();
  });
});
