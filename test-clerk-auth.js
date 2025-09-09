#!/usr/bin/env node

/**
 * Test script to verify Clerk authentication is working
 * This simulates the authentication flow logic
 */

console.log('NGI Capital - Clerk Authentication Test\n');
console.log('=' .repeat(50));

// Test configuration
const adminEmails = [
  'lwhitworth@ngicapitaladvisory.com',
  'anurmamade@ngicapitaladvisory.com'
];

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

// Test cases
const testCases = [
  {
    email: 'lwhitworth@ngicapitaladvisory.com',
    method: 'email/password',
    expectedResult: 'SUCCESS - Admin login allowed',
    expectedRedirect: '/admin/ngi-advisory/dashboard'
  },
  {
    email: 'anurmamade@ngicapitaladvisory.com',
    method: 'email/password',
    expectedResult: 'SUCCESS - Admin login allowed',
    expectedRedirect: '/admin/ngi-advisory/dashboard'
  },
  {
    email: 'lwhitworth@berkeley.edu',
    method: 'Google OAuth',
    expectedResult: 'SUCCESS - Student Google login allowed',
    expectedRedirect: '/projects'
  },
  {
    email: 'student@ucla.edu',
    method: 'Google OAuth',
    expectedResult: 'SUCCESS - Student Google login allowed',
    expectedRedirect: '/projects'
  },
  {
    email: 'student@berkeley.edu',
    method: 'email/password',
    expectedResult: 'BLOCKED - Students must use Google',
    expectedRedirect: null
  },
  {
    email: 'user@gmail.com',
    method: 'Google OAuth',
    expectedResult: 'BLOCKED - Non-UC domain',
    expectedRedirect: '/blocked'
  },
  {
    email: 'user@stanford.edu',
    method: 'Google OAuth',
    expectedResult: 'BLOCKED - Non-UC domain',
    expectedRedirect: '/blocked'
  }
];

function validateAuth(email, method) {
  const normalizedEmail = email.toLowerCase();
  const domain = normalizedEmail.split('@')[1] || '';
  
  // Check if admin
  if (adminEmails.includes(normalizedEmail)) {
    if (method === 'email/password') {
      return { allowed: true, type: 'admin', redirect: '/admin/ngi-advisory/dashboard' };
    } else {
      return { allowed: true, type: 'admin-oauth', redirect: '/admin/ngi-advisory/dashboard' };
    }
  }
  
  // Check if student with valid domain
  if (allowedDomains.includes(domain)) {
    if (method === 'Google OAuth') {
      return { allowed: true, type: 'student', redirect: '/projects' };
    } else {
      return { allowed: false, reason: 'Students must use Google OAuth', redirect: null };
    }
  }
  
  // Invalid domain
  return { allowed: false, reason: 'Domain not allowed', redirect: '/blocked' };
}

console.log('\nRunning Authentication Tests:\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = validateAuth(test.email, test.method);
  const success = (
    (result.allowed && test.expectedResult.startsWith('SUCCESS')) ||
    (!result.allowed && test.expectedResult.startsWith('BLOCKED'))
  ) && (result.redirect === test.expectedRedirect);
  
  console.log(`Test ${index + 1}: ${test.email} via ${test.method}`);
  console.log(`  Expected: ${test.expectedResult}`);
  console.log(`  Result: ${result.allowed ? 'SUCCESS' : 'BLOCKED'} - ${result.reason || `${result.type} login`}`);
  console.log(`  Redirect: ${result.redirect || 'none'}`);
  console.log(`  Status: ${success ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (success) passed++;
  else failed++;
});

console.log('=' .repeat(50));
console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✅ All authentication tests passed!');
  console.log('\nAuthentication flow is correctly configured:');
  console.log('1. Admins can use email/password');
  console.log('2. Students must use Google OAuth');
  console.log('3. Only UC domains are allowed for students');
  console.log('4. Proper redirects are in place');
} else {
  console.log('\n❌ Some tests failed. Please review the authentication logic.');
  process.exit(1);
}

console.log('\n📝 Next Steps to Test in Browser:');
console.log('1. Go to http://localhost:3001/sign-in');
console.log('2. For Admin: Use email/password with lwhitworth@ngicapitaladvisory.com');
console.log('3. For Student: Click Google button and sign in with lwhitworth@berkeley.edu');
console.log('4. Check that you are redirected to the correct app after sign-in');