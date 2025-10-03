# Test Plan — NGI Learning Module
**Last Updated:** October 2, 2025  
**Testing:** pytest 8.3.4+, Jest, Playwright, OWASP ZAP  
**Coverage Target:** 80%+ backend, 70%+ frontend

## Testing Strategy

Comprehensive testing across unit, integration, E2E, security, performance, and accessibility.

---

## 1) Backend Unit Tests (pytest)

**Database Models:**
```python
def test_learning_company_creation(db_session):
    company = LearningCompany(ticker='TSLA', company_name='Tesla, Inc.')
    db_session.add(company)
    db_session.commit()
    assert company.id is not None

def test_streak_calculation(db_session, test_user):
    progress = LearningProgress(user_id=test_user.id, current_streak_days=5)
    progress.increment_streak()
    assert progress.current_streak_days == 6
```

**Excel Generation:**
```python
def test_generate_excel_package(test_company_data, tmp_path):
    generator = LearningExcelPackage(test_company_data)
    filename = generator.generate()
    assert filename == 'TSLA_2025_Model_v1.xlsx'
```

**Validators:**
```python
def test_balance_sheet_validator_pass(sample_workbook):
    validator = BalanceSheetValidator(sample_workbook)
    errors = validator.validate_bs_balance()
    assert len(errors) == 0

def test_revenue_driver_validator():
    driver = RevenueDriverCheck(quantity=100, price=50, reported_revenue=5000)
    assert driver.is_valid is True
```

---

## 2) Integration Tests

**API Endpoints:**
```python
def test_get_companies_list(test_auth_header):
    response = client.get('/api/learning/companies', headers=test_auth_header)
    assert response.status_code == 200
    assert len(response.json()['companies']) == 10

async def test_submit_activity(test_client, test_excel_file):
    response = await test_client.post(
        '/api/learning/submit',
        files={'file': test_excel_file},
        data={'company_id': 1, 'activity_id': 'a1_drivers_map'}
    )
    assert response.status_code == 200
```

---

## 3) E2E Tests (Playwright)

```typescript
test('complete learning flow', async ({ page }) => {
  await page.goto('/sign-in');
  await page.fill('input[name="email"]', 'test@student.com');
  await page.click('button[type="submit"]');
  
  await page.goto('/learning');
  await page.click('text=Tesla (TSLA)');
  
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Download Excel Package")')
  ]);
  
  expect(download.suggestedFilename()).toBe('TSLA_2025_Model_v1.xlsx');
});
```

---

## 4) Security Tests

**SQL Injection:**
```python
@pytest.mark.parametrize('malicious_input', [
    "' OR '1'='1",
    "'; DROP TABLE students;--"
])
def test_sql_injection(test_client, malicious_input):
    response = test_client.get(f'/api/learning/companies/search?q={malicious_input}')
    assert response.status_code in [200, 400]
```

**XSS:**
```python
def test_xss_sanitization(test_client, test_auth_header):
    response = test_client.post(
        '/api/learning/submissions',
        headers=test_auth_header,
        json={'submission_notes': '<script>alert("XSS")</script>'}
    )
    data = test_client.get(f'/api/learning/submissions/{response.json()["id"]}').json()
    assert '<script>' not in data['submission_notes']
```

**OWASP ZAP Scan:**
```bash
docker run owasp/zap2docker-stable zap.sh -daemon -quickurl http://localhost:8000/api/learning
```

---

## 5) Performance Tests (Locust)

```python
class LearningModuleUser(HttpUser):
    @task(3)
    def view_companies(self):
        self.client.get('/api/learning/companies', headers=self.headers)
    
    @task(1)
    def request_ai_coach(self):
        self.client.post('/api/learning/ai-coach', json={'query': 'How do I calculate WACC?'})
```

Target: 100 concurrent users, <2s response time for 95th percentile

---

## 6) Accessibility Tests (WCAG 2.1 AA)

```typescript
test('no accessibility violations', async ({ page }) => {
  await page.goto('/learning');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('keyboard navigation', async ({ page }) => {
  await page.goto('/learning');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Select Company');
});
```

---

## Coverage Requirements

| Component | Target |
|-----------|--------|
| Database Models | 90% |
| API Endpoints | 85% |
| Validators | 95% |
| Excel Generation | 80% |
| Frontend Components | 70% |

---

**Comprehensive testing ensures production-ready quality!**

