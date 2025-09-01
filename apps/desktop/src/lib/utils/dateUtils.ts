/**
 * Date utilities for NGI Capital financial reporting
 * Handles fiscal year (Jan 1 - Dec 31) and entity formation dates
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
 * Fiscal year is aligned to calendar year (Jan 1 - Dec 31)
 */
export function getCurrentFiscalYear(date: Date = CURRENT_DATE): number {
  // Use UTC to avoid timezone off-by-one around midnight UTC
  return date.getUTCFullYear();
}

/**
 * Get fiscal year start and end dates
 */
export function getFiscalYearDates(fiscalYear: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(fiscalYear, 0, 1)), // Jan 1 (UTC)
    end: new Date(Date.UTC(fiscalYear, 11, 31)), // Dec 31 (UTC)
  };
}

/**
 * Get current fiscal quarter
 */
export function getCurrentFiscalQuarter(date: Date = CURRENT_DATE): string {
  const month = date.getUTCMonth();
  const fiscalYear = getCurrentFiscalYear(date);

  // Q1: Jan - Mar (months 0-2)
  // Q2: Apr - Jun (months 3-5)
  // Q3: Jul - Sep (months 6-8)
  // Q4: Oct - Dec (months 9-11)
  if (month >= 0 && month <= 2) return `Q1-${fiscalYear}`;
  if (month >= 3 && month <= 5) return `Q2-${fiscalYear}`;
  if (month >= 6 && month <= 8) return `Q3-${fiscalYear}`;
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

  // Quarter logic for calendar fiscal year
  const quarterStarts: Record<string, Date> = {
    'Q1': new Date(Date.UTC(fiscalYear, 0, 1)),  // Jan 1 (UTC)
    'Q2': new Date(Date.UTC(fiscalYear, 3, 1)),  // Apr 1 (UTC)
    'Q3': new Date(Date.UTC(fiscalYear, 6, 1)),  // Jul 1 (UTC)
    'Q4': new Date(Date.UTC(fiscalYear, 9, 1)),  // Oct 1 (UTC)
  };

  const quarterStart = quarterStarts[quarterOrFY];
  return quarterStart && formationDate <= quarterStart && CURRENT_DATE >= quarterStart;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  // Format in UTC for deterministic output across timezones
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
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

  // Add previous fiscal year quarters and FY
  const prevFY = currentFY - 1;
  for (let q = 4; q >= 1; q--) {
    periods.push(`Q${q}-${prevFY}`);
  }
  periods.push(`FY-${prevFY}`);
  
  // Add YTD and MTD
  periods.push('YTD');
  periods.push('MTD');
  
  return periods;
}
