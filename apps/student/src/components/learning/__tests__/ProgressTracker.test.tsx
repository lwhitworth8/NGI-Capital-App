import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import ProgressTracker from '../ProgressTracker';
import { learningAPI } from '@/lib/api/learning';

jest.mock('@clerk/nextjs');
jest.mock('@/lib/api/learning');

const mockGetToken = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockProgress = {
  id: 1,
  user_id: 'user-123',
  selected_company_id: 1,
  current_streak_days: 5,
  longest_streak_days: 10,
  last_activity_date: '2025-10-02',
  activities_completed: ['a1_drivers_map'],
};

describe('ProgressTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      getToken: mockGetToken,
    } as any);
    mockGetToken.mockResolvedValue('mock-token');
  });

  it('displays current streak', async () => {
    (learningAPI.getProgress as jest.Mock).mockResolvedValue(mockProgress);
    
    render(<ProgressTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('days')).toBeInTheDocument();
    });
  });

  it('displays longest streak', async () => {
    (learningAPI.getProgress as jest.Mock).mockResolvedValue(mockProgress);
    
    render(<ProgressTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Longest Streak')).toBeInTheDocument();
    });
  });

  it('updates streak on button click', async () => {
    (learningAPI.getProgress as jest.Mock).mockResolvedValue(mockProgress);
    (learningAPI.updateStreak as jest.Mock).mockResolvedValue({
      current_streak: 6,
      milestone_achieved: false,
    });
    
    render(<ProgressTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Log Today\'s Activity')).toBeInTheDocument();
    });
    
    const button = screen.getByText('Log Today\'s Activity');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(learningAPI.updateStreak).toHaveBeenCalledWith('mock-token');
    });
  });

  it('shows milestone alert when achieved', async () => {
    (learningAPI.getProgress as jest.Mock).mockResolvedValue(mockProgress);
    (learningAPI.updateStreak as jest.Mock).mockResolvedValue({
      current_streak: 7,
      milestone_achieved: true,
    });
    
    window.alert = jest.fn();
    
    render(<ProgressTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Log Today\'s Activity')).toBeInTheDocument();
    });
    
    const button = screen.getByText('Log Today\'s Activity');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Milestone achieved'));
    });
  });

  it('displays completed activities', async () => {
    (learningAPI.getProgress as jest.Mock).mockResolvedValue(mockProgress);
    
    render(<ProgressTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Completed Activities')).toBeInTheDocument();
      expect(screen.getByText('a1_drivers_map')).toBeInTheDocument();
    });
  });
});

