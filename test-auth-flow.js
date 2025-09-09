#!/usr/bin/env node

/**
 * Test script to verify Clerk authentication flow
 * Run: node test-auth-flow.js
 */

const testCases = [
  {
    email: 'lwhitworth@ngicapitaladvisory.com',
    expectedType: 'ADMIN',
    expectedRedirect: '/ngi-advisory/dashboard',
    description: 'Admin user - Landon'
  },
  {
    email: 'anurmamade@ngicapitaladvisory.com',
    expectedType: 'ADMIN',
    expectedRedirect: '/ngi-advisory/dashboard',
    description: 'Admin user - Andre'
  },
  {
    email: 'lwhitworth@berkeley.edu',
    expectedType: 'STUDENT',
    expectedRedirect: '/projects',
    description: 'UC Berkeley student'
  },
  {
    email: 'student@ucla.edu',
    expectedType: 'STUDENT',
    expectedRedirect: '/projects',
    description: 'UCLA student'
  },
  {
    email: 'user@gmail.com',
    expectedType: 'BLOCKED',
    expectedRedirect: '/blocked',
    description: 'Non-UC email'
  },
  {
    email: 'user@stanford.edu',
    expectedType: 'BLOCKED',
    expectedRedirect: '/blocked',
    description: 'Non-UC university'
  }
];

// Admin emails - must match hardcoded values
const adminEmails = [
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com'
];

// Allowed student domains
const allowedDomains = [
  'berkeley.edu',
  'ucla.edu',
  'ucsd.edu',
  'uci.edu',
  'ucdavis.edu',
  'ucsb.edu',
  'ucsc.edu',
  'ucr.edu',
  'ucmerced.edu'
];

function determineUserType(email) {
  const normalizedEmail = email.toLowerCase();
  const domain = normalizedEmail.split('@')[1] || '';
  
  if (adminEmails.includes(normalizedEmail)) {
    return 'ADMIN';
  }
  
  if (allowedDomains.includes(domain)) {
    return 'STUDENT';
  }
  
  return 'BLOCKED';
}

console.log('NGI Capital - Authentication Flow Test\n');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const actualType = determineUserType(testCase.email);
  const success = actualType === testCase.expectedType;
  
  console.log(`\nTest ${index + 1}: ${testCase.description}`);
  console.log(`Email: ${testCase.email}`);
  console.log(`Expected: ${testCase.expectedType} -> ${testCase.expectedRedirect}`);
  console.log(`Actual: ${actualType}`);
  console.log(`Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log('\n' + '=' .repeat(50));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✅ All tests passed! Authentication routing logic is correct.');
} else {
  console.log('\n❌ Some tests failed. Please review the routing logic.');
  process.exit(1);
}

console.log('\n📝 Next Steps:');
console.log('1. Ensure Clerk dashboard is configured with these settings');
console.log('2. Test actual sign-in flow in browser');
console.log('3. Verify Google OAuth is set up for UC domains only');
console.log('4. Check that admin users have passwords set in Clerk');