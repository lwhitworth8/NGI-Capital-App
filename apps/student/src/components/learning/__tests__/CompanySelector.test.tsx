import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import CompanySelector from '../CompanySelector';
import { learningAPI } from '@/lib/api/learning';

// Mock dependencies
jest.mock('@clerk/nextjs');
jest.mock('@/lib/api/learning');

const mockGetToken = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockCompanies = [
  {
    id: 1,
    ticker: 'TSLA',
    company_name: 'Tesla, Inc.',
    industry: 'Automotive',
    description: 'Electric vehicle manufacturer',
    revenue_model_type: 'QxP',
    data_quality_score: 10,
    is_active: true,
  },
  {
    id: 2,
    ticker: 'COST',
    company_name: 'Costco Wholesale Corporation',
    industry: 'Retail',
    description: 'Wholesale retail chain',
    revenue_model_type: 'QxP',
    data_quality_score: 10,
    is_active: true,
  },
];

describe('CompanySelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      getToken: mockGetToken,
    } as any);
    mockGetToken.mockResolvedValue('mock-token');
  });

  it('renders loading state initially', () => {
    (learningAPI.getCompanies as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<CompanySelector onCompanySelected={jest.fn()} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders companies after loading', async () => {
    (learningAPI.getCompanies as jest.Mock).mockResolvedValue(mockCompanies);
    
    render(<CompanySelector onCompanySelected={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.getByText('Tesla, Inc.')).toBeInTheDocument();
      expect(screen.getByText('COST')).toBeInTheDocument();
      expect(screen.getByText('Costco Wholesale Corporation')).toBeInTheDocument();
    });
  });

  it('calls onCompanySelected when company is clicked', async () => {
    (learningAPI.getCompanies as jest.Mock).mockResolvedValue(mockCompanies);
    (learningAPI.selectCompany as jest.Mock).mockResolvedValue(undefined);
    
    const onCompanySelected = jest.fn();
    
    render(<CompanySelector onCompanySelected={onCompanySelected} />);
    
    await waitFor(() => {
      expect(screen.getByText('TSLA')).toBeInTheDocument();
    });
    
    const teslaButton = screen.getByText('Tesla, Inc.').closest('button');
    fireEvent.click(teslaButton!);
    
    await waitFor(() => {
      expect(learningAPI.selectCompany).toHaveBeenCalledWith(1, 'mock-token');
      expect(onCompanySelected).toHaveBeenCalledWith(1);
    });
  });

  it('highlights selected company', async () => {
    (learningAPI.getCompanies as jest.Mock).mockResolvedValue(mockCompanies);
    
    render(<CompanySelector onCompanySelected={jest.fn()} selectedCompanyId={1} />);
    
    await waitFor(() => {
      const teslaButton = screen.getByText('Tesla, Inc.').closest('button');
      expect(teslaButton).toHaveClass('border-green-500');
    });
  });

  it('displays error message on load failure', async () => {
    (learningAPI.getCompanies as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<CompanySelector onCompanySelected={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    (learningAPI.getCompanies as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockCompanies);
    
    render(<CompanySelector onCompanySelected={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
    
    const retryButton = screen.getByText('Try again');
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(screen.getByText('TSLA')).toBeInTheDocument();
    });
  });
});

