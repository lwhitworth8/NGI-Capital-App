/**
 * Date utilities for NGI Capital financial reporting
 * Handles fiscal year (July 1 - June 30) and entity formation dates
 * ALL entity data comes from uploaded documents - no hardcoded values
 */

// Entity formation dates will be populated from uploaded formation documents
// This is just the structure - actual data comes from database/documents
export const ENTITY_FORMATION_DATES: Record<string, Date | null> = {
  'ngi-capital-llc': null, // Original LLC - will be set from uploaded Operating Agreement
  'ngi-capital-inc': null, // C-Corp conversion - will be set when conversion docs uploaded
  'ngi-advisory': null, // New LLC subsidiary - will be set from formation docs
  'creator-terminal': null, // New C-Corp - will be set from formation docs
};

// Entity status tracking for conversion period
export const ENTITY_STATUS: Record<string, string> = {
  'ngi-capital-llc': 'active', // Currently active LLC
  'ngi-capital-inc': 'converting', // In process of conversion from LLC
  'ngi-advisory': 'pre-formation', // Preparing formation documents
  'creator-terminal': 'pre-formation', // Preparing formation documents
};

// Always use actual current date
export const CURRENT_DATE = new Date();

/**
 * Get the current fiscal year based on date
 * Fiscal year runs July 1 - June 30
 */
export function getCurrentFiscalYear(date: Date = CURRENT_DATE): number {
  const month = date.getMonth();
  const year = date.getFullYear();
  // If we're in July-December, we're in FY of next year
  // If we're in Jan-June, we're in FY of current year
  return month >= 6 ? year + 1 : year; // month is 0-indexed, so June = 5, July = 6
}

/**
 * Get fiscal year start and end dates
 */
export function getFiscalYearDates(fiscalYear: number): { start: Date; end: Date } {
  return {
    start: new Date(fiscalYear - 1, 6, 1), // July 1 of previous calendar year
    end: new Date(fiscalYear, 5, 30) // June 30 of fiscal year
  };
}

/**
 * Get current fiscal quarter
 */
export function getCurrentFiscalQuarter(date: Date = CURRENT_DATE): string {
  const month = date.getMonth();
  const fiscalYear = getCurrentFiscalYear(date);
  
  // Q1: July - September (months 6-8)
  // Q2: October - December (months 9-11)
  // Q3: January - March (months 0-2)
  // Q4: April - June (months 3-5)
  
  if (month >= 6 && month <= 8) return `Q1-${fiscalYear}`;
  if (month >= 9 && month <= 11) return `Q2-${fiscalYear}`;
  if (month >= 0 && month <= 2) return `Q3-${fiscalYear}`;
  return `Q4-${fiscalYear}`;
}

/**
 * Check if an entity exists at a given date
 * This should check against actual formation date from documents
 */
export function isEntityActive(entityId: string, date: Date = CURRENT_DATE): boolean {
  // In production, this would query the database for actual formation date
  // For now, return false unless we have actual formation documents
  const formationDate = ENTITY_FORMATION_DATES[entityId as keyof typeof ENTITY_FORMATION_DATES];
  if (!formationDate) return false;
  return date >= formationDate;
}

/**
 * Get available periods for an entity
 * Based on actual formation date from uploaded documents
 */
export function getAvailablePeriods(entityId: string): string[] {
  const formationDate = ENTITY_FORMATION_DATES[entityId as keyof typeof ENTITY_FORMATION_DATES];
  if (!formationDate) return [];
  
  const periods: string[] = [];
  const currentFY = getCurrentFiscalYear();
  const formationFY = getCurrentFiscalYear(formationDate);
  
  // Add fiscal years from formation to current
  for (let fy = formationFY; fy <= currentFY; fy++) {
    // Check each quarter
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    for (const q of quarters) {
      const periodStr = `${q}-${fy}`;
      // Only add if the period has started
      if (isPeriodStarted(periodStr, formationDate)) {
        periods.push(periodStr);
      }
    }
    // Add full fiscal year if complete
    if (fy < currentFY || (fy === currentFY && CURRENT_DATE.getMonth() >= 6)) {
      periods.push(`FY-${fy}`);
    }
  }
  
  return periods.reverse(); // Most recent first
}

/**
 * Check if a period has started relative to formation date
 */
function isPeriodStarted(period: string, formationDate: Date): boolean {
  const [quarterOrFY, year] = period.split('-');
  const fiscalYear = parseInt(year);
  
  if (quarterOrFY === 'FY') {
    const fyDates = getFiscalYearDates(fiscalYear);
    return formationDate <= fyDates.start && CURRENT_DATE >= fyDates.start;
  }
  
  // Quarter logic
  const quarterStarts: Record<string, Date> = {
    'Q1': new Date(fiscalYear - 1, 6, 1), // July 1
    'Q2': new Date(fiscalYear - 1, 9, 1), // October 1
    'Q3': new Date(fiscalYear, 0, 1), // January 1
    'Q4': new Date(fiscalYear, 3, 1), // April 1
  };
  
  const quarterStart = quarterStarts[quarterOrFY];
  return quarterStart && formationDate <= quarterStart && CURRENT_DATE >= quarterStart;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get entity status message
 * Will be populated from actual documents
 */
export function getEntityStatusMessage(entityId: string): string {
  const formationDate = ENTITY_FORMATION_DATES[entityId as keyof typeof ENTITY_FORMATION_DATES];
  
  if (!formationDate) {
    return 'Awaiting formation documents';
  }
  
  const today = new Date();
  const daysActive = Math.floor((today.getTime() - formationDate.getTime()) / (1000 * 60 * 60 * 24));
  return `Active since ${formatDate(formationDate)} (${daysActive} days)`;
}

/**
 * Get all available fiscal periods based on current date
 * This doesn't require entity formation - just shows what periods exist
 */
export function getAllAvailablePeriods(): string[] {
  const currentDate = new Date();
  const currentFY = getCurrentFiscalYear(currentDate);
  const currentQuarter = getCurrentFiscalQuarter(currentDate);
  
  const periods: string[] = [];
  
  // Add current quarter
  periods.push(currentQuarter);
  
  // Add previous quarters in current FY
  const currentQ = parseInt(currentQuarter.split('-')[0].charAt(1));
  for (let q = currentQ - 1; q >= 1; q--) {
    periods.push(`Q${q}-${currentFY}`);
  }
  
  // Add previous fiscal year quarters if we're past Q1
  if (currentQ > 1 || currentDate.getMonth() < 6) {
    const prevFY = currentFY - 1;
    for (let q = 4; q >= 1; q--) {
      periods.push(`Q${q}-${prevFY}`);
    }
    periods.push(`FY-${prevFY}`);
  }
  
  // Add YTD and MTD
  periods.push('YTD');
  periods.push('MTD');
  
  return periods;
}