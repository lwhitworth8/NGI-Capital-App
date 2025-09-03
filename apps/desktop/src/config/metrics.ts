export type Metric = {
  id:string; label:string; unit?:string;
  source:'FRED'|'YAHOO'; sourceId:string;
  frequency:'intraday'|'daily'|'weekly'|'monthly'|'quarterly';
  goodWhenHigher?:boolean; transform?:'level'|'pct_yoy'|'pct_mom';
  category?:'Rates'|'Spreads'|'Inflation'|'Growth'|'Labor'|'Markets'|'Credit'|'Housing'|'Liquidity'|'Sentiment';
};

export const METRICS: Metric[] = [
  { id:'fed_funds', label:'Fed Funds', unit:'%', source:'FRED', sourceId:'FEDFUNDS', frequency:'monthly', goodWhenHigher:false },
  { id:'ust_2y', label:'UST 2Y', unit:'%', source:'FRED', sourceId:'DGS2', frequency:'daily' },
  { id:'ust_10y', label:'UST 10Y', unit:'%', source:'FRED', sourceId:'DGS10', frequency:'daily' },
  { id:'curve_2s10s', label:'2s10s', unit:'bp', source:'FRED', sourceId:'T10Y2Y', frequency:'daily' },
  { id:'cpi_yoy', label:'CPI YoY', unit:'%', source:'FRED', sourceId:'CPIAUCSL', frequency:'monthly', transform:'pct_yoy', goodWhenHigher:false },
  { id:'core_pce_yoy', label:'Core PCE YoY', unit:'%', source:'FRED', sourceId:'PCEPILFE', frequency:'monthly', transform:'pct_yoy', goodWhenHigher:false },
  { id:'unemp', label:'Unemployment', unit:'%', source:'FRED', sourceId:'UNRATE', frequency:'monthly', goodWhenHigher:false },
  { id:'real_gdp_yoy', label:'Real GDP YoY', unit:'%', source:'FRED', sourceId:'GDPC1', frequency:'quarterly', transform:'pct_yoy', goodWhenHigher:true },
  { id:'spx', label:'S&P 500', source:'YAHOO', sourceId:'^GSPC', frequency:'intraday', goodWhenHigher:true, category:'Markets' },
  { id:'vix', label:'VIX', source:'YAHOO', sourceId:'^VIX', frequency:'intraday', goodWhenHigher:false, category:'Markets' },
  { id:'wti', label:'WTI', unit:'$/bbl', source:'YAHOO', sourceId:'CL=F', frequency:'intraday', category:'Markets' },
  { id:'dxy', label:'DXY', source:'YAHOO', sourceId:'DX-Y.NYB', frequency:'intraday', category:'Markets' },
  { id:'hy_oas', label:'HY OAS', unit:'bp', source:'FRED', sourceId:'BAMLH0A0HYM2', frequency:'daily', goodWhenHigher:false, category:'Credit' },
  { id:'nfcix', label:'Adj. NFCI', unit:'idx', source:'FRED', sourceId:'ANFCI', frequency:'weekly', goodWhenHigher:false, category:'Liquidity' },
];

