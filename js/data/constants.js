export const DURATION = 750;

export const TOOLTIP_OFFSET = {
  x: 10,
  y: 30
};

export const FIPS_TO_ABBR = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY"
};


export function pointTooltipHTML(d) {
  return `
    <strong>Year:</strong> ${d.YearStart}<br/>
    <strong>Value:</strong> ${d.Data_Value.toFixed(1)}%
  `;
}

export const ABOUT_TEXT = `
  <strong>About this dashboard</strong><br/>
  This dashboard explores CDC Behavioral Risk Factor Surveillance System (BRFSS)
  indicators related to Alzheimer’s Disease and Healthy Aging.<br/><br/>
  Select a question to compare trends over time and differences across
  demographics. Click charts or the map to filter all views.<br/><br/>
  <em>Source: CDC Alzheimer’s Disease and Healthy Aging Data (BRFSS).</em>
`;