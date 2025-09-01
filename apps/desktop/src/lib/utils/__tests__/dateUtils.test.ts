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
  ENTITY_FORMATION_DATES
} from '../dateUtils';

describe('Date Utilities', () => {
  describe('getCurrentFiscalYear', () => {
    it('aligns to calendar year (Jan 1 - Dec 31)', () => {
      expect(getCurrentFiscalYear(new Date('2025-02-15'))).toBe(2025);
      expect(getCurrentFiscalYear(new Date('2025-08-15'))).toBe(2025);
      expect(getCurrentFiscalYear(new Date('2026-01-01'))).toBe(2026);
    });
  });

  describe('getFiscalYearDates', () => {
    it('returns Jan 1 start and Dec 31 end for a given year', () => {
      const fy2026 = getFiscalYearDates(2026);
      expect(fy2026.start.toISOString().split('T')[0]).toBe('2026-01-01');
      expect(fy2026.end.toISOString().split('T')[0]).toBe('2026-12-31');
    });
  });

  describe('getCurrentFiscalQuarter', () => {
    it('returns Q1 for Jan-Mar', () => {
      expect(getCurrentFiscalQuarter(new Date('2026-01-01'))).toBe('Q1-2026');
      expect(getCurrentFiscalQuarter(new Date('2026-02-15'))).toBe('Q1-2026');
      expect(getCurrentFiscalQuarter(new Date('2026-03-31'))).toBe('Q1-2026');
    });

    it('returns Q2 for Apr-Jun', () => {
      expect(getCurrentFiscalQuarter(new Date('2026-04-01'))).toBe('Q2-2026');
      expect(getCurrentFiscalQuarter(new Date('2026-05-15'))).toBe('Q2-2026');
      expect(getCurrentFiscalQuarter(new Date('2026-06-30'))).toBe('Q2-2026');
    });

    it('returns Q3 for Jul-Sep', () => {
      expect(getCurrentFiscalQuarter(new Date('2025-07-15'))).toBe('Q3-2025');
      expect(getCurrentFiscalQuarter(new Date('2025-08-29'))).toBe('Q3-2025');
      expect(getCurrentFiscalQuarter(new Date('2025-09-30'))).toBe('Q3-2025');
    });

    it('returns Q4 for Oct-Dec', () => {
      expect(getCurrentFiscalQuarter(new Date('2025-10-01'))).toBe('Q4-2025');
      expect(getCurrentFiscalQuarter(new Date('2025-11-15'))).toBe('Q4-2025');
      expect(getCurrentFiscalQuarter(new Date('2025-12-31'))).toBe('Q4-2025');
    });
  });

  describe('isEntityActive', () => {
    it('returns false when formation date is unknown', () => {
      expect(isEntityActive('ngi-advisory')).toBe(false);
      expect(isEntityActive('creator-terminal')).toBe(false);
    });

    it('returns true only after formation date (when set)', () => {
      // Set a formation date for testing
      (ENTITY_FORMATION_DATES as any)['ngi-capital-llc'] = new Date('2024-01-15');
      expect(isEntityActive('ngi-capital-llc', new Date('2024-01-14'))).toBe(false);
      expect(isEntityActive('ngi-capital-llc', new Date('2024-01-15'))).toBe(true);
      expect(isEntityActive('ngi-capital-llc', new Date('2024-02-01'))).toBe(true);
      // Reset for cleanliness
      ;(ENTITY_FORMATION_DATES as any)['ngi-capital-llc'] = null;
    });
  });

  describe('getAvailablePeriods', () => {
    it('returns empty array when formation date unknown', () => {
      expect(getAvailablePeriods('ngi-advisory')).toEqual([]);
    });

    it('returns some periods once formation date is set', () => {
      (ENTITY_FORMATION_DATES as any)['ngi-capital-inc'] = new Date('2024-03-01');
      const periods = getAvailablePeriods('ngi-capital-inc');
      expect(Array.isArray(periods)).toBe(true);
      expect(periods.length).toBeGreaterThan(0);
      ;(ENTITY_FORMATION_DATES as any)['ngi-capital-inc'] = null;
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
    it('returns awaiting message when formation documents absent', () => {
      const status = getEntityStatusMessage('ngi-advisory');
      expect(status).toBe('Awaiting formation documents');
    });
  });
  describe('Constants', () => {
    it('exposes known entity keys (null until documents uploaded)', () => {
      expect(Object.prototype.hasOwnProperty.call(ENTITY_FORMATION_DATES, 'ngi-capital-llc')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(ENTITY_FORMATION_DATES, 'ngi-capital-inc')).toBe(true);
    });
  });
});
