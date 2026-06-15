export const TRANSIT_LINE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: '#0039A6', text: '#fff' }, C: { bg: '#0039A6', text: '#fff' },
  E: { bg: '#0039A6', text: '#fff' }, B: { bg: '#FF6319', text: '#fff' },
  D: { bg: '#FF6319', text: '#fff' }, F: { bg: '#FF6319', text: '#fff' },
  M: { bg: '#FF6319', text: '#fff' }, G: { bg: '#6CBE45', text: '#fff' },
  J: { bg: '#996633', text: '#fff' }, Z: { bg: '#996633', text: '#fff' },
  L: { bg: '#A7A9AC', text: '#fff' }, N: { bg: '#FCCC0A', text: '#000' },
  Q: { bg: '#FCCC0A', text: '#000' }, R: { bg: '#FCCC0A', text: '#000' },
  W: { bg: '#FCCC0A', text: '#000' }, '1': { bg: '#EE352E', text: '#fff' },
  '2': { bg: '#EE352E', text: '#fff' }, '3': { bg: '#EE352E', text: '#fff' },
  '4': { bg: '#00933C', text: '#fff' }, '5': { bg: '#00933C', text: '#fff' },
  '6': { bg: '#00933C', text: '#fff' }, '7': { bg: '#B933AD', text: '#fff' },
  S: { bg: '#808183', text: '#fff' }, SIR: { bg: '#1D6DC2', text: '#fff' },
};

export const COMMUTE_MODE_ICONS: Record<string, string> = {
  transit: '🚇',
  driving: '🚗',
  walking: '🚶',
  bicycling: '🚲',
};

export const COMMUTE_MODE_LABELS: Record<string, string> = {
  transit: 'Transit',
  driving: 'Driving',
  walking: 'Walking',
  bicycling: 'Biking',
};
