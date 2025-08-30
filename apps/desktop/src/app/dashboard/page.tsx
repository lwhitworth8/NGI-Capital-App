'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  FileText,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';

const API_URL = 'http://localhost:8001';

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userName = localStorage.getItem('user_name');
    const userEmail = localStorage.getItem('user_email');
    
    if (!token) {
      router.push('/login');
      return;
    }

    setUserData({
      name: userName,
      email: userEmail,
    });

    fetchMetrics(token);
  }, [router]);

  const fetchMetrics = async (token: string) => {
    try {
      console.log('Fetching dashboard metrics with token:', token);
      
      const response = await fetch(`${API_URL}/api/dashboard/metrics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Dashboard response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard data received:', data);
        setMetrics(data);
      } else {
        console.error('Dashboard fetch failed with status:', response.status);
        // Set some default metrics so the page still loads
        setMetrics({
          total_assets: 0,
          monthly_revenue: 0,
          entity_count: 0,
          recent_activity: []
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch metrics:', error);
      // Set default metrics even on error
      setMetrics({
        total_assets: 0,
        monthly_revenue: 0,
        entity_count: 0,
        recent_activity: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 animate-fadeIn">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back{userData?.name ? `, ${userData.name}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your financial operations
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Assets Card */}
        <div className="card-modern p-6 hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <ArrowUpRight className="h-3 w-3" />
              0%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Assets</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              ${metrics?.total_assets?.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        {/* Monthly Revenue Card */}
        <div className="card-modern p-6 hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-success/10">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <ArrowUpRight className="h-3 w-3" />
              0%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Revenue</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              ${metrics?.monthly_revenue?.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        {/* Monthly Expenses Card */}
        <div className="card-modern p-6 hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-warning/10">
              <CreditCard className="h-6 w-6 text-warning" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ArrowDownRight className="h-3 w-3" />
              0%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Expenses</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              ${metrics?.monthly_expenses?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            
            {metrics?.recent_activity?.length > 0 ? (
              <div className="space-y-3">
                {metrics.recent_activity.map((activity: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                    <span className="badge badge-info">
                      {activity.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground mb-1">No activity yet</p>
                <p className="text-sm text-muted-foreground">
                  Activities will appear here as you use the system
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Compliance Status - Takes 1 column */}
        <div className="card-modern p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Compliance</h3>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">Big 4 Audit Ready</span>
              </div>
              <span className="text-xs font-medium text-warning">Setup Required</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-foreground">Audit Trail</span>
              </div>
              <span className="text-xs font-medium text-success">Active</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/20">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">Document Retention</span>
              </div>
              <span className="text-xs font-medium text-warning">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="btn-secondary text-sm py-3 rounded-xl hover:scale-[1.02] transition-all">
            New Transaction
          </button>
          <button className="btn-secondary text-sm py-3 rounded-xl hover:scale-[1.02] transition-all">
            Create Invoice
          </button>
          <button className="btn-secondary text-sm py-3 rounded-xl hover:scale-[1.02] transition-all">
            Run Report
          </button>
          <button className="btn-secondary text-sm py-3 rounded-xl hover:scale-[1.02] transition-all">
            Add Entity
          </button>
        </div>
      </div>
    </div>
  );
}