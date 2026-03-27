/**
 * University seed data — school colors for alma mater branding.
 *
 * Maps institution names (lowercased) to primary/secondary brand colors.
 * Used by EducationCard to apply school-specific accents instead of
 * the generic org purple.
 *
 * Coverage: Top 100 US universities + major international schools.
 * Add entries as needed — the lookup is case-insensitive substring match.
 */

const UNIVERSITY_COLORS = {
  // Ivy League
  harvard: { primary: '#A51C30', secondary: '#1E1E1E' },
  yale: { primary: '#00356B', secondary: '#ADB3C1' },
  princeton: { primary: '#E77500', secondary: '#000000' },
  columbia: { primary: '#B9D9EB', secondary: '#002B7F' },
  brown: { primary: '#4E3629', secondary: '#ED1C24' },
  dartmouth: { primary: '#00693E', secondary: '#FFFFFF' },
  cornell: { primary: '#B31B1B', secondary: '#FFFFFF' },
  upenn: { primary: '#011F5B', secondary: '#990000' },
  'university of pennsylvania': { primary: '#011F5B', secondary: '#990000' },

  // Big Ten
  michigan: { primary: '#00274C', secondary: '#FFCB05' },
  'university of michigan': { primary: '#00274C', secondary: '#FFCB05' },
  'ohio state': { primary: '#BB0000', secondary: '#666666' },
  'penn state': { primary: '#041E42', secondary: '#FFFFFF' },
  wisconsin: { primary: '#C5050C', secondary: '#FFFFFF' },
  purdue: { primary: '#CEB888', secondary: '#000000' },
  illinois: { primary: '#E84A27', secondary: '#13294B' },
  indiana: { primary: '#990000', secondary: '#FFFFFF' },
  iowa: { primary: '#FFCD00', secondary: '#000000' },
  minnesota: { primary: '#7A0019', secondary: '#FFCC33' },
  northwestern: { primary: '#4E2A84', secondary: '#FFFFFF' },
  'michigan state': { primary: '#18453B', secondary: '#FFFFFF' },
  rutgers: { primary: '#CC0033', secondary: '#5F6B6D' },
  maryland: { primary: '#E03A3E', secondary: '#FFD520' },
  nebraska: { primary: '#E41C38', secondary: '#FFFFFF' },

  // SEC
  alabama: { primary: '#9E1B32', secondary: '#FFFFFF' },
  auburn: { primary: '#0C2340', secondary: '#E87722' },
  florida: { primary: '#0021A5', secondary: '#FA4616' },
  'university of florida': { primary: '#0021A5', secondary: '#FA4616' },
  georgia: { primary: '#BA0C2F', secondary: '#000000' },
  lsu: { primary: '#461D7C', secondary: '#FDD023' },
  tennessee: { primary: '#FF8200', secondary: '#FFFFFF' },
  'texas a&m': { primary: '#500000', secondary: '#FFFFFF' },
  vanderbilt: { primary: '#866D4B', secondary: '#000000' },
  kentucky: { primary: '#0033A0', secondary: '#FFFFFF' },
  mississippi: { primary: '#CE1126', secondary: '#14213D' },
  'south carolina': { primary: '#73000A', secondary: '#000000' },
  arkansas: { primary: '#9D2235', secondary: '#FFFFFF' },
  missouri: { primary: '#F1B82D', secondary: '#000000' },

  // Pac-12 / Big 12
  stanford: { primary: '#8C1515', secondary: '#FFFFFF' },
  usc: { primary: '#990000', secondary: '#FFC72C' },
  ucla: { primary: '#2774AE', secondary: '#FFD100' },
  cal: { primary: '#003262', secondary: '#FDB515' },
  'uc berkeley': { primary: '#003262', secondary: '#FDB515' },
  'university of california': { primary: '#003262', secondary: '#FDB515' },
  oregon: { primary: '#154733', secondary: '#FEE123' },
  washington: { primary: '#4B2E83', secondary: '#B7A57A' },
  colorado: { primary: '#CFB87C', secondary: '#000000' },
  arizona: { primary: '#CC0033', secondary: '#003366' },
  'arizona state': { primary: '#8C1D40', secondary: '#FFC627' },
  utah: { primary: '#CC0000', secondary: '#FFFFFF' },
  texas: { primary: '#BF5700', secondary: '#FFFFFF' },
  'university of texas': { primary: '#BF5700', secondary: '#FFFFFF' },
  oklahoma: { primary: '#841617', secondary: '#FFFFFF' },
  baylor: { primary: '#154734', secondary: '#FFB81C' },
  tcu: { primary: '#4D1979', secondary: '#FFFFFF' },

  // ACC
  duke: { primary: '#003087', secondary: '#FFFFFF' },
  unc: { primary: '#7BAFD4', secondary: '#FFFFFF' },
  'north carolina': { primary: '#7BAFD4', secondary: '#FFFFFF' },
  virginia: { primary: '#232D4B', secondary: '#F84C1E' },
  'virginia tech': { primary: '#861F41', secondary: '#E5751F' },
  clemson: { primary: '#F56600', secondary: '#522D80' },
  'florida state': { primary: '#782F40', secondary: '#CEB888' },
  fsu: { primary: '#782F40', secondary: '#CEB888' },
  'georgia tech': { primary: '#B3A369', secondary: '#003057' },
  miami: { primary: '#F47321', secondary: '#005030' },
  'nc state': { primary: '#CC0000', secondary: '#FFFFFF' },
  pittsburgh: { primary: '#003594', secondary: '#FFB81C' },
  syracuse: { primary: '#F76900', secondary: '#FFFFFF' },
  'wake forest': { primary: '#9E7E38', secondary: '#000000' },
  'notre dame': { primary: '#0C2340', secondary: '#C99700' },
  'boston college': { primary: '#98002E', secondary: '#BC9B6A' },

  // Top Tech / Research
  mit: { primary: '#A31F34', secondary: '#8A8B8C' },
  'massachusetts institute of technology': { primary: '#A31F34', secondary: '#8A8B8C' },
  caltech: { primary: '#FF6C0C', secondary: '#FFFFFF' },
  'carnegie mellon': { primary: '#C41230', secondary: '#000000' },
  'georgia institute of technology': { primary: '#B3A369', secondary: '#003057' },
  rice: { primary: '#00205B', secondary: '#5E6062' },
  'johns hopkins': { primary: '#002D72', secondary: '#CF4520' },
  rochester: { primary: '#003B71', secondary: '#FFD100' },
  rpi: { primary: '#D6001C', secondary: '#FFFFFF' },
  'case western': { primary: '#0A304E', secondary: '#FFFFFF' },

  // Other Major US
  nyu: { primary: '#57068C', secondary: '#FFFFFF' },
  'new york university': { primary: '#57068C', secondary: '#FFFFFF' },
  georgetown: { primary: '#041E42', secondary: '#63666A' },
  emory: { primary: '#012169', secondary: '#B58500' },
  tufts: { primary: '#3E8EDE', secondary: '#62261B' },
  'boston university': { primary: '#CC0000', secondary: '#FFFFFF' },
  drexel: { primary: '#07294D', secondary: '#FFC600' },

  // UC System
  'uc davis': { primary: '#022851', secondary: '#DAAA00' },
  'uc san diego': { primary: '#182B49', secondary: '#C69214' },
  ucsd: { primary: '#182B49', secondary: '#C69214' },
  'uc irvine': { primary: '#0064A4', secondary: '#FFD200' },
  'uc santa barbara': { primary: '#003660', secondary: '#FEBC11' },
  ucsb: { primary: '#003660', secondary: '#FEBC11' },
  'uc santa cruz': { primary: '#003C6C', secondary: '#FDC700' },

  // International
  oxford: { primary: '#002147', secondary: '#FFFFFF' },
  'university of oxford': { primary: '#002147', secondary: '#FFFFFF' },
  cambridge: { primary: '#A3C1AD', secondary: '#000000' },
  'university of cambridge': { primary: '#A3C1AD', secondary: '#000000' },
  'imperial college': { primary: '#003E74', secondary: '#D4EFFC' },
  'eth zurich': { primary: '#1F407A', secondary: '#FFFFFF' },
  'university of toronto': { primary: '#002A5C', secondary: '#FFFFFF' },
  mcgill: { primary: '#ED1B2F', secondary: '#FFFFFF' },
  waterloo: { primary: '#000000', secondary: '#FFD54F' },
  'university of waterloo': { primary: '#000000', secondary: '#FFD54F' },
  ubc: { primary: '#002145', secondary: '#97D4E9' },
  'university of british columbia': { primary: '#002145', secondary: '#97D4E9' },
  tsinghua: { primary: '#660874', secondary: '#FFFFFF' },
  peking: { primary: '#8B0000', secondary: '#FFFFFF' },
  'national university of singapore': { primary: '#003D7C', secondary: '#EF7C00' },
  nus: { primary: '#003D7C', secondary: '#EF7C00' },
  'university of tokyo': { primary: '#002855', secondary: '#FFFFFF' },
  kaist: { primary: '#004B87', secondary: '#FFFFFF' },
  'university of melbourne': { primary: '#094183', secondary: '#FFFFFF' },
  'university of sydney': { primary: '#E64626', secondary: '#0C1939' },
};

/**
 * Look up school colors for an institution name.
 * Tries exact match first, then substring match on known keys.
 * Returns { primary, secondary } or null.
 */
export function getUniversityColors(institutionName) {
  if (!institutionName) return null;
  const lower = institutionName.toLowerCase().trim();

  // Exact match
  if (UNIVERSITY_COLORS[lower]) return UNIVERSITY_COLORS[lower];

  // Substring match — check if any known key is contained in the institution name
  for (const [key, colors] of Object.entries(UNIVERSITY_COLORS)) {
    if (lower.includes(key) || key.includes(lower)) return colors;
  }

  return null;
}

export default UNIVERSITY_COLORS;
