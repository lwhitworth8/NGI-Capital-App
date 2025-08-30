'use client';

import { useState } from 'react';

type HealthResult = { status?: number; data?: any; error?: string }
type LoginResult = { status?: number; data?: any; success?: boolean; error?: string; stack?: string }
type Results = { health?: HealthResult; login?: LoginResult }

export default function ApiTestPage() {
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState(false);

  const testHealthCheck = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/health` : '/api/health');
      const data = await response.json();
      setResults((prev: Results) => ({ ...prev, health: { status: response.status, data } }));
    } catch (error: any) {
      setResults((prev: Results) => ({ ...prev, health: { error: error.message } }));
    }
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      console.log('Attempting login to', process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login` : '/api/auth/login');
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login` : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'lwhitworth@ngicapitaladvisory.com',
          password: 'TempPassword123!'
        })
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      setResults((prev: Results) => ({ 
        ...prev, 
        login: { 
          status: response.status, 
          data,
          success: response.ok 
        } 
      }));
    } catch (error: any) {
      console.error('Login error:', error);
      setResults((prev: Results) => ({ 
        ...prev, 
        login: { 
          error: error.message,
          stack: error.stack 
        } 
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Connection Test</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={testHealthCheck}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Health Check
          </button>
          
          <button
            onClick={testLogin}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Login'}
          </button>
        </div>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Results:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <p className="text-sm">
            <strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'via Next proxy (/api)'}<br/>
            <strong>Test Account:</strong> lwhitworth@ngicapitaladvisory.com<br/>
            <strong>Check Console:</strong> Press F12 to see detailed logs
          </p>
        </div>
      </div>
    </div>
  );
}
