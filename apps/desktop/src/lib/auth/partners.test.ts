describe('partners helpers', () => {
  beforeAll(() => {
    process.env.PARTNER_EMAILS = 'lwhitworth@ngicapitaladvisory.com,anurmamade@ngicapitaladvisory.com'
  })

  test('partner detection', async () => {
    jest.isolateModules(() => {
      const mod = require('./partners') as typeof import('./partners')
      expect(mod.isPartner('lwhitworth@ngicapitaladvisory.com')).toBe(true)
      expect(mod.isPartner('someone@uni.edu')).toBe(false)
    })
  })

  test('destination routing', async () => {
    jest.isolateModules(() => {
      const mod = require('./partners') as typeof import('./partners')
      expect(mod.destinationForEmail('anurmamade@ngicapitaladvisory.com')).toBe('/admin')
      expect(mod.destinationForEmail('student@uc.edu')).toBe('/projects')
    })
  })
})
