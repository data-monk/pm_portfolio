import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommuteTimeBadge from '../components/CommuteTimeBadge';

// Mock the lib/api module so useSaved doesn't need a real server
vi.mock('../lib/api', () => ({
  saveListing: vi.fn(() => Promise.resolve()),
  unsaveListing: vi.fn(() => Promise.resolve()),
}));

describe('CommuteTimeBadge', () => {
  it('shows green badge class for under 20 minutes (900s = 15 min)', () => {
    const { container } = render(<CommuteTimeBadge seconds={900} />);
    expect(screen.getByText('15 min')).toBeInTheDocument();
    const badge = container.querySelector('.cs-badge-green');
    expect(badge).toBeTruthy();
  });

  it('shows yellow badge class for 20-40 minutes (1800s = 30 min)', () => {
    const { container } = render(<CommuteTimeBadge seconds={1800} />);
    expect(screen.getByText('30 min')).toBeInTheDocument();
    const badge = container.querySelector('.cs-badge-yellow');
    expect(badge).toBeTruthy();
  });

  it('shows orange badge class for 40-60 minutes (2700s = 45 min)', () => {
    const { container } = render(<CommuteTimeBadge seconds={2700} />);
    expect(screen.getByText('45 min')).toBeInTheDocument();
    const badge = container.querySelector('.cs-badge-orange');
    expect(badge).toBeTruthy();
  });

  it('shows red badge class for over 60 minutes (4200s = 70 min)', () => {
    const { container } = render(<CommuteTimeBadge seconds={4200} />);
    expect(screen.getByText('70 min')).toBeInTheDocument();
    const badge = container.querySelector('.cs-badge-red');
    expect(badge).toBeTruthy();
  });

  it('shows exactly at 20-minute boundary as yellow (1200s = 20 min)', () => {
    const { container } = render(<CommuteTimeBadge seconds={1200} />);
    expect(screen.getByText('20 min')).toBeInTheDocument();
    const badge = container.querySelector('.cs-badge-yellow');
    expect(badge).toBeTruthy();
  });

  it('shows exactly at 60-minute boundary as red (3600s = 60 min)', () => {
    const { container } = render(<CommuteTimeBadge seconds={3600} />);
    expect(screen.getByText('60 min')).toBeInTheDocument();
    const badge = container.querySelector('.cs-badge-red');
    expect(badge).toBeTruthy();
  });

  it('shows skeleton when pending=true', () => {
    const { container } = render(<CommuteTimeBadge seconds={null} pending />);
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
    expect(container.querySelector('.cs-skeleton')).toBeTruthy();
  });

  it('shows skeleton when pending=true even with seconds provided', () => {
    const { container } = render(<CommuteTimeBadge seconds={1800} pending />);
    // Pending takes priority
    expect(container.querySelector('.cs-skeleton')).toBeTruthy();
  });

  it('shows em-dash when seconds is null and not pending', () => {
    render(<CommuteTimeBadge seconds={null} />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('shows em-dash when seconds is undefined and not pending', () => {
    render(<CommuteTimeBadge seconds={undefined} />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('formats 90 minutes correctly (5400s)', () => {
    render(<CommuteTimeBadge seconds={5400} />);
    expect(screen.getByText('90 min')).toBeInTheDocument();
  });

  it('formats 10 minutes correctly (600s)', () => {
    render(<CommuteTimeBadge seconds={600} />);
    expect(screen.getByText('10 min')).toBeInTheDocument();
  });

  it('has aria-label when showing time', () => {
    render(<CommuteTimeBadge seconds={1800} />);
    const badge = screen.getByLabelText(/30 min commute/i);
    expect(badge).toBeInTheDocument();
  });

  it('has aria-label when pending', () => {
    render(<CommuteTimeBadge seconds={null} pending />);
    const skeleton = screen.getByLabelText(/loading/i);
    expect(skeleton).toBeInTheDocument();
  });

  it('has aria-label when unavailable', () => {
    render(<CommuteTimeBadge seconds={null} />);
    const badge = screen.getByLabelText(/unavailable/i);
    expect(badge).toBeInTheDocument();
  });

  it('renders sm size class', () => {
    const { container } = render(<CommuteTimeBadge seconds={900} size="sm" />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-xs');
  });

  it('renders lg size class', () => {
    const { container } = render(<CommuteTimeBadge seconds={900} size="lg" />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-base');
  });
});
