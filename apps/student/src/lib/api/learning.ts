/**
 * API Client for NGI Learning Module
 * Handles all backend communication for learning endpoints
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Company {
  id: number;
  ticker: string;
  company_name: string;
  industry: string;
  description: string;
  revenue_model_type: string;
  data_quality_score: number;
  is_active: boolean;
}

interface Progress {
  id: number;
  user_id: string;
  selected_company_id: number | null;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
  activities_completed: string[];
}

interface Submission {
  id: number;
  user_id: string;
  company_id: number;
  activity_id: string;
  version: number;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  validator_status: string;
  submitted_at: string;
}

interface Feedback {
  id: number;
  submission_id: number;
  feedback_text: string;
  rubric_score: number;
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  model_used: string;
  tokens_used: number;
  created_at: string;
}

interface Leaderboard {
  company_id: number;
  ticker: string;
  company_name: string;
  total_submissions: number;
  price_targets: number[];
  statistics: {
    min: number;
    max: number;
    median: number;
    mean: number;
    count: number;
  };
}

class LearningAPI {
  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async getCompanies(token: string): Promise<Company[]> {
    const response = await fetch(`${API_BASE}/api/learning/companies`, {
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch companies');
    }
    
    const data = await response.json();
    return data.companies;
  }

  async getCompany(companyId: number, token: string): Promise<Company> {
    const response = await fetch(`${API_BASE}/api/learning/companies/${companyId}`, {
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch company');
    }
    
    return response.json();
  }

  async getProgress(token: string): Promise<Progress> {
    const response = await fetch(`${API_BASE}/api/learning/progress`, {
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch progress');
    }
    
    return response.json();
  }

  async selectCompany(companyId: number, token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/learning/progress/select-company`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ company_id: companyId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to select company');
    }
  }

  async updateStreak(token: string): Promise<{ current_streak: number; milestone_achieved: boolean }> {
    const response = await fetch(`${API_BASE}/api/learning/progress/update-streak`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update streak');
    }
    
    return response.json();
  }

  async generatePackage(companyId: number, token: string): Promise<{ file_path: string; version: number }> {
    const response = await fetch(`${API_BASE}/api/learning/packages/generate/${companyId}`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate package');
    }
    
    return response.json();
  }

  async uploadSubmission(
    file: File,
    companyId: number,
    activityId: string,
    notes: string | null,
    token: string
  ): Promise<Submission> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId.toString());
    formData.append('activity_id', activityId);
    if (notes) {
      formData.append('notes', notes);
    }

    const response = await fetch(`${API_BASE}/api/learning/submissions/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload submission');
    }
    
    return response.json();
  }

  async getMySubmissions(token: string): Promise<Submission[]> {
    const response = await fetch(`${API_BASE}/api/learning/submissions/user/me`, {
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch submissions');
    }
    
    const data = await response.json();
    return data.submissions;
  }

  async validateSubmission(submissionId: number, token: string): Promise<{
    validation_status: string;
    passed: boolean;
    errors: any[];
    warnings: any[];
  }> {
    const response = await fetch(`${API_BASE}/api/learning/submissions/${submissionId}/validate`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to validate submission');
    }
    
    return response.json();
  }

  async generateFeedback(submissionId: number, token: string, forceRegenerate = false): Promise<{
    feedback_id: number;
    overall_score: number;
  }> {
    const url = `${API_BASE}/api/learning/submissions/${submissionId}/feedback${forceRegenerate ? '?force_regenerate=true' : ''}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate feedback');
    }
    
    return response.json();
  }

  async getFeedback(submissionId: number, token: string): Promise<Feedback> {
    const response = await fetch(`${API_BASE}/api/learning/submissions/${submissionId}/feedback`, {
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch feedback');
    }
    
    return response.json();
  }

  async getLeaderboard(companyId: number, token: string): Promise<Leaderboard> {
    const response = await fetch(`${API_BASE}/api/learning/leaderboard/${companyId}`, {
      headers: this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }
    
    return response.json();
  }

  async submitToLeaderboard(companyId: number, priceTarget: number, token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/learning/leaderboard/submit`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ company_id: companyId, price_target: priceTarget }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit to leaderboard');
    }
  }
}

export const learningAPI = new LearningAPI();

export type {
  Company,
  Progress,
  Submission,
  Feedback,
  Leaderboard,
};

