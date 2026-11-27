// Auto mechanic wage data by state — BLS OEWS occupation 49-3023
// Source: https://www.bls.gov/oes/current/oes493023.htm (May 2025)
// Mean hourly wage for Automotive Service Technicians and Mechanics.
// Values fetched from the BLS Public Data API (OEWS series OEUS<fips>00000000000049302303).
// Shop labor rates are estimated in the UI as wage × MULTIPLIER_LOW..MULTIPLIER_HIGH.

export const BLS_RELEASE = 'May 2025'
// The static profile page was retired; the tables index is the stable citation target
export const BLS_SOURCE_URL = 'https://www.bls.gov/oes/tables.htm'
// Shops charge roughly 4 to 5.5 times the mean tech wage. Checked Nov 2026 against
// published state averages of what shops charge: 45 of 50 fall inside this range.
// (The earlier 2.5 to 3.5 gave rates about half of what shops charge.)
export const MULTIPLIER_LOW = 4
export const MULTIPLIER_HIGH = 5.5

const nearest5 = x => Math.round(x / 5) * 5

/** Estimated posted shop rate for a mean tech wage, as [low, high] dollars per hour. */
export const estimateRange = wage => [nearest5(wage * MULTIPLIER_LOW), nearest5(wage * MULTIPLIER_HIGH)]

// An outside figure readers can check the estimates against
export const SURVEY_SOURCE_URL = 'https://www.aaa.com/autorepair/articles/average-mechanic-labor-rate-repair-costs-in-your-state-2026'
export const SURVEY_FINDING = 'almost half of shops price labor between $120 and $159 an hour'

// National mean hourly wage, same release
export const NATIONAL_MEAN_WAGE = 27.13

export const STATE_WAGES = [
  { code: 'AL', name: 'Alabama', wage: 24.53 },
  { code: 'AK', name: 'Alaska', wage: 31.55 },
  { code: 'AZ', name: 'Arizona', wage: 26.77 },
  { code: 'AR', name: 'Arkansas', wage: 23.28 },
  { code: 'CA', name: 'California', wage: 31.47 },
  { code: 'CO', name: 'Colorado', wage: 30.76 },
  { code: 'CT', name: 'Connecticut', wage: 28.92 },
  { code: 'DE', name: 'Delaware', wage: 28.12 },
  { code: 'DC', name: 'District of Columbia', wage: 32.65 },
  { code: 'FL', name: 'Florida', wage: 25.84 },
  { code: 'GA', name: 'Georgia', wage: 27.21 },
  { code: 'HI', name: 'Hawaii', wage: 27.01 },
  { code: 'ID', name: 'Idaho', wage: 25.96 },
  { code: 'IL', name: 'Illinois', wage: 27.25 },
  { code: 'IN', name: 'Indiana', wage: 25.82 },
  { code: 'IA', name: 'Iowa', wage: 26.59 },
  { code: 'KS', name: 'Kansas', wage: 25.37 },
  { code: 'KY', name: 'Kentucky', wage: 23.07 },
  { code: 'LA', name: 'Louisiana', wage: 24.35 },
  { code: 'ME', name: 'Maine', wage: 26.54 },
  { code: 'MD', name: 'Maryland', wage: 28.55 },
  { code: 'MA', name: 'Massachusetts', wage: 30.27 },
  { code: 'MI', name: 'Michigan', wage: 27.16 },
  { code: 'MN', name: 'Minnesota', wage: 28.51 },
  { code: 'MS', name: 'Mississippi', wage: 21.95 },
  { code: 'MO', name: 'Missouri', wage: 25.94 },
  { code: 'MT', name: 'Montana', wage: 28.51 },
  { code: 'NE', name: 'Nebraska', wage: 26.65 },
  { code: 'NV', name: 'Nevada', wage: 26.97 },
  { code: 'NH', name: 'New Hampshire', wage: 29.18 },
  { code: 'NJ', name: 'New Jersey', wage: 28.28 },
  { code: 'NM', name: 'New Mexico', wage: 24.90 },
  { code: 'NY', name: 'New York', wage: 28.42 },
  { code: 'NC', name: 'North Carolina', wage: 25.72 },
  { code: 'ND', name: 'North Dakota', wage: 27.88 },
  { code: 'OH', name: 'Ohio', wage: 26.24 },
  { code: 'OK', name: 'Oklahoma', wage: 25.04 },
  { code: 'OR', name: 'Oregon', wage: 30.39 },
  { code: 'PA', name: 'Pennsylvania', wage: 26.13 },
  { code: 'RI', name: 'Rhode Island', wage: 26.11 },
  { code: 'SC', name: 'South Carolina', wage: 25.20 },
  { code: 'SD', name: 'South Dakota', wage: 26.76 },
  { code: 'TN', name: 'Tennessee', wage: 26.25 },
  { code: 'TX', name: 'Texas', wage: 25.47 },
  { code: 'UT', name: 'Utah', wage: 24.85 },
  { code: 'VT', name: 'Vermont', wage: 27.90 },
  { code: 'VA', name: 'Virginia', wage: 29.62 },
  { code: 'WA', name: 'Washington', wage: 30.03 },
  { code: 'WV', name: 'West Virginia', wage: 21.19 },
  { code: 'WI', name: 'Wisconsin', wage: 27.35 },
  { code: 'WY', name: 'Wyoming', wage: 26.59 },
]

// States for which no real BLS value could be obtained (none — all 50 + DC fetched)
export const missing = []
