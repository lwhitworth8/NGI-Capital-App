/**
 * Unit tests for date utilities
 */

import {
  getCurrentFiscalYear,
  getFiscalYearDates,
  getCurrentFiscalQuarter,
  isEntityActive,
  getAvailablePeriods,
  formatDate,
  getEntityStatusMessage,
  CURRENT_DATE,
  ENTITY_FORMATION_DATES
} from '../dateUtils';

describe('Date Utilities', () => {
  describe('getCurrentFiscalYear', () => {
    it('returns correct fiscal year for dates after July 1', () => {
      const august2025 = new Date('2025-08-15');
      expect(getCurrentFiscalYear(august2025)).toBe(2026);
    });

    it('returns correct fiscal year for dates before July 1', () => {
      const march2025 = new Date('2025-03-15');
      expect(getCurrentFiscalYear(march2025)).toBe(2025);
    });

    it('returns correct fiscal year for July 1 exactly', () => {
      const july1 = new Date('2025-07-01');
      expect(getCurrentFiscalYear(july1)).toBe(2026);
    });
  });

  describe('getFiscalYearDates', () => {
    it('returns correct start and end dates for fiscal year', () => {
      const fy2026 = getFiscalYearDates(2026);
      expect(fy2026.start.toISOString().split('T')[0]).toBe('2025-07-01');
      expect(fy2026.end.toISOString().split('T')[0]).toBe('2026-06-30');
    });
  });

  describe('getCurrentFiscalQuarter', () => {
    it('returns Q1 for July-September', () => {
      expect(getCurrentFiscalQuarter(new Date('2025-07-15'))).toBe('Q1-2026');
      expect(getCurrentFiscalQuarter(new Date('2025-08-29'))).toBe('Q1-2026');
      expect(getCurrentFiscalQuarter(new Date('2025-09-30'))).toBe('Q1-2026');
    });

    it('returns Q2 for October-December', () => {
      expect(getCurrentFiscalQuarter(new Date('2025-10-01'))).toBe('Q2-2026');
      expect(getCurrentFiscalQuarter(new Date('2025-11-15'))).toBe('Q2-2026');
      expect(getCurrentFiscalQuarter(new Date('2025-12-31'))).toBe('Q2-2026');
    });

    it('returns Q3 for January-March', () => {
      expect(getCurrentFiscalQuarter(new Date('2026-01-01'))).toBe('Q3-2026');
      expect(getCurrentFiscalQuarter(new Date('2026-02-15'))).toBe('Q3-2026');
      expect(getCurrentFiscalQuarter(new Date('2026-03-31'))).toBe('Q3-2026');
    });

    it('returns Q4 for April-June', () => {
      expect(getCurrentFiscalQuarter(new Date('2026-04-01'))).toBe('Q4-2026');
      expect(getCurrentFiscalQuarter(new Date('2026-05-15'))).toBe('Q4-2026');
      expect(getCurrentFiscalQuarter(new Date('2026-06-30'))).toBe('Q4-2026');
    });
  });

  describe('isEntityActive', () => {
    it('returns true for NGI Capital after formation date', () => {
      expect(isEntityActive('ngi-capital', new Date('2025-08-29'))).toBe(true);
      expect(isEntityActive('consolidated', new Date('2025-08-29'))).toBe(true);
    });

    it('returns false for NGI Capital before formation date', () => {
      expect(isEntityActive('ngi-capital', new Date('2025-06-30'))).toBe(false);
    });

    it('returns false for entities not yet formed', () => {
      expect(isEntityActive('ngi-advisory')).toBe(false);
      expect(isEntityActive('creator-terminal')).toBe(false);
    });
  });

  describe('getAvailablePeriods', () => {
    it('returns available periods for active entity', () => {
      const periods = getAvailablePeriods('ngi-capital');
      expect(periods).toContain('Q1-2026');
      expect(periods.length).toBeGreaterThan(0);
    });

    it('returns empty array for inactive entity', () => {
      const periods = getAvailablePeriods('ngi-advisory');
      expect(periods).toEqual([]);
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2025-07-01');
      const formatted = formatDate(date);
      expect(formatted).toContain('July');
      expect(formatted).toContain('2025');
    });
  });

  describe('getEntityStatusMessage', () => {
    it('returns active status for NGI Capital', () => {
      const status = getEntityStatusMessage('ngi-capital');
      expect(status).toContain('Active since');
      expect(status).toContain('July');
      expect(status).toContain('2025');
      expect(status).toContain('59 days'); // 59 days from July 1 to Aug 29
    });

    it('returns future formation message for inactive entities', () => {
      const status = getEntityStatusMessage('ngi-advisory');
      expect(status).toBe('Entity to be formed in September 2025');
    });
  });

  describe('Constants', () => {
    it('has correct current date', () => {
      expect(CURRENT_DATE.toISOString().split('T')[0]).toBe('2025-08-29');
    });

    it('has correct formation dates', () => {
      expect(ENTITY_FORMATION_DATES['ngi-capital']?.toISOString().split('T')[0]).toBe('2025-07-01');
      expect(ENTITY_FORMATION_DATES['consolidated']?.toISOString().split('T')[0]).toBe('2025-07-01');
      expect(ENTITY_FORMATION_DATES['ngi-advisory']).toBeNull();
      expect(ENTITY_FORMATION_DATES['creator-terminal']).toBeNull();
    });
  });
});