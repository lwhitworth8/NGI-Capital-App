/**
 * API Client for NGI Learning Module
 * Handles all backend communication for learning endpoints
 */

// Use the same URL resolution strategy as the main API
function getApiBase(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URLs
    return '';
  } else {
    // Server-side: use absolute URLs
    const origin = process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8001';
    return origin.replace(/\/$/, '');
  }
}

const API_BASE = getApiBase();

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

// Learning content items (from /api/learning/content)
export interface LearningContentItem {
  id: number;
  module_id: string;
  unit_id?: string | null;
  lesson_id?: string | null;
  title: string;
  content_type: string;
  content_markdown?: string | null;
  content_url?: string | null;
  estimated_duration_minutes?: number | null;
  difficulty_level?: string | null;
  sort_order: number;
  prerequisites: string[];
  animation_id?: string | null;
  interactive_tool_id?: string | null;
  author?: string | null;
  tags: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

class LearningAPI {
  private async getHeaders(token?: string): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Try to get Clerk token if not provided
    if (!token && typeof window !== 'undefined') {
      try {
        const anyWin: any = window as any;
        const clerk = anyWin?.Clerk;
        if (clerk?.session?.getToken) {
          try { 
            token = await clerk.session.getToken({ template: 'backend' });
          } catch {
            try { 
              token = await clerk.session.getToken(); 
            } catch {}
          }
        }
      } catch {}
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async getCompanies(token?: string): Promise<Company[]> {
    const response = await fetch(`${API_BASE}/api/learning/companies`, {
      headers: await this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch companies');
    }
    
    const data = await response.json();
    return data.companies;
  }

  async getCompany(companyId: number, token?: string): Promise<Company> {
    const response = await fetch(`${API_BASE}/api/learning/companies/${companyId}`, {
      headers: await this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch company');
    }
    
    return response.json();
  }

  async getProgress(token?: string): Promise<Progress> {
    const url = `${API_BASE}/api/learning/progress`;
    const headers = await this.getHeaders(token);
    
    console.log('Learning API - getProgress:', { url, headers });
    
    const response = await fetch(url, { headers });
    
    console.log('Learning API - getProgress response:', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Learning API - getProgress error:', errorText);
      throw new Error(`Failed to fetch progress: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  }

  async selectCompany(companyId: number, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/learning/progress/select-company`, {
      method: 'POST',
      headers: await this.getHeaders(token),
      body: JSON.stringify({ company_id: companyId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to select company');
    }
  }

  async updateStreak(token?: string): Promise<{ current_streak: number; milestone_achieved: boolean }> {
    const response = await fetch(`${API_BASE}/api/learning/progress/update-streak`, {
      method: 'POST',
      headers: await this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update streak');
    }
    
    return response.json();
  }

  async generatePackage(companyId: number, token?: string): Promise<{ file_path: string; version: number }> {
    const response = await fetch(`${API_BASE}/api/learning/packages/generate/${companyId}`, {
      method: 'POST',
      headers: await this.getHeaders(token),
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
    token?: string
  ): Promise<Submission> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId.toString());
    formData.append('activity_id', activityId);
    if (notes) {
      formData.append('notes', notes);
    }

    const headers = await this.getHeaders(token);
    const response = await fetch(`${API_BASE}/api/learning/submissions/upload`, {
      method: 'POST',
      headers: {
        ...headers,
        // Remove Content-Type for FormData
        'Content-Type': undefined,
      } as any,
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload submission');
    }
    
    return response.json();
  }

  async getMySubmissions(token?: string): Promise<Submission[]> {
    const response = await fetch(`${API_BASE}/api/learning/submissions/user/me`, {
      headers: await this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch submissions');
    }
    
    const data = await response.json();
    return data.submissions;
  }

  async validateSubmission(submissionId: number, token?: string): Promise<{
    validation_status: string;
    passed: boolean;
    errors: any[];
    warnings: any[];
  }> {
    const response = await fetch(`${API_BASE}/api/learning/submissions/${submissionId}/validate`, {
      method: 'POST',
      headers: await this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to validate submission');
    }
    
    return response.json();
  }

  async generateFeedback(submissionId: number, token?: string, forceRegenerate = false): Promise<{
    feedback_id: number;
    overall_score: number;
  }> {
    const url = `${API_BASE}/api/learning/submissions/${submissionId}/feedback${forceRegenerate ? '?force_regenerate=true' : ''}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: await this.getHeaders(token),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate feedback');
    }
    
    return response.json();
  }

  async getFeedback(submissionId: number, token?: string): Promise<Feedback> {
    const response = await fetch(`${API_BASE}/api/learning/submissions/${submissionId}/feedback`, {
      headers: await this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch feedback');
    }
    
    return response.json();
  }

  async getLeaderboard(companyId: number, token?: string): Promise<Leaderboard> {
    const response = await fetch(`${API_BASE}/api/learning/leaderboard/${companyId}`, {
      headers: await this.getHeaders(token),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }
    
    return response.json();
  }

  async submitToLeaderboard(companyId: number, priceTarget: number, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/learning/leaderboard/submit`, {
      method: 'POST',
      headers: await this.getHeaders(token),
      body: JSON.stringify({ company_id: companyId, price_target: priceTarget }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit to leaderboard');
    }
  }

  // Learning content APIs
  async getModuleContent(moduleId: string, token?: string): Promise<LearningContentItem[]> {
    const url = `${API_BASE}/api/learning/content/modules/${moduleId}?include_units=true&include_lessons=true`;
    const response = await fetch(url, { headers: await this.getHeaders(token) });
    if (!response.ok) {
      throw new Error('Failed to fetch module content');
    }
    return response.json();
  }

  async markLessonComplete(
    lessonId: string,
    payload: { module_id?: string; unit_id?: string; time_spent_minutes?: number; score?: number },
    token?: string
  ): Promise<any> {
    const url = `${API_BASE}/api/learning/enhanced/content/${lessonId}/complete`;
    const response = await fetch(url, {
      method: 'POST',
      headers: await this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to mark lesson complete');
    }
    return response.json();
  }

  // Animation render queue APIs
  async queueAnimationRender(sceneName: string, token?: string): Promise<{ job_id: string; estimated_duration_seconds?: number }> {
    const url = `${API_BASE}/api/learning/animations/render`;
    const response = await fetch(url, {
      method: 'POST',
      headers: await this.getHeaders(token),
      body: JSON.stringify({ scene_name: sceneName, params: {} }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to queue animation render');
    }
    return response.json();
  }

  async getRenderStatus(jobId: string, token?: string): Promise<{
    job_id: string;
    scene_name: string;
    status: string;
    progress: number;
    created_at: string;
    completed_at?: string;
    output_file?: string;
    error_message?: string;
  }> {
    const url = `${API_BASE}/api/learning/animations/status/${jobId}`;
    const response = await fetch(url, { headers: await this.getHeaders(token) });
    if (!response.ok) {
      throw new Error('Failed to get render status');
    }
    return response.json();
  }

  getAnimationVideoUrl(animationId: string): string {
    return `${API_BASE}/api/learning/animations/${animationId}/video`;
  }

  getAnimationThumbnailUrl(animationId: string): string {
    return `${API_BASE}/api/learning/animations/${animationId}/thumbnail`;
  }

  async deleteAnimation(animationId: string, token?: string): Promise<void> {
    const url = `${API_BASE}/api/learning/animations/${animationId}`;
    const response = await fetch(url, { method: 'DELETE', headers: await this.getHeaders(token) });
    if (!response.ok) {
      throw new Error('Failed to delete animation');
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
  LearningContentItem,
};

