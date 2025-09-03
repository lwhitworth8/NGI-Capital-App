import { KPI } from '@/lib/investors/schemas'

describe('Investor schemas', () => {
  it('parses KPI shape', () => {
    const parsed = KPI.parse({
      total: 3,
      inPipeline: 2,
      won: 1,
      activeThis30d: 2,
      lastContactAvgDays: 7.5,
      daysToQuarterEnd: 10,
      daysToNextReport: 15,
    })
    expect(parsed.total).toBe(3)
  })
})

