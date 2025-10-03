import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import FileUpload from '../FileUpload';
import { learningAPI } from '@/lib/api/learning';

jest.mock('@clerk/nextjs');
jest.mock('@/lib/api/learning');

const mockGetToken = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('FileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      getToken: mockGetToken,
    } as any);
    mockGetToken.mockResolvedValue('mock-token');
  });

  it('renders upload area', () => {
    render(<FileUpload companyId={1} activityId="a1_drivers_map" onUploadSuccess={jest.fn()} />);
    
    expect(screen.getByText(/Click to upload/)).toBeInTheDocument();
    expect(screen.getByText(/drag and drop/)).toBeInTheDocument();
  });

  it('accepts Excel files', async () => {
    const onUploadSuccess = jest.fn();
    
    render(<FileUpload companyId={1} activityId="a1_drivers_map" onUploadSuccess={onUploadSuccess} />);
    
    const file = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    const input = screen.getByRole('button', { hidden: true }).querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });
  });

  it('rejects invalid file types', async () => {
    render(<FileUpload companyId={1} activityId="a1_drivers_map" onUploadSuccess={jest.fn()} />);
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/)).toBeInTheDocument();
    });
  });

  it('uploads file successfully', async () => {
    const onUploadSuccess = jest.fn();
    (learningAPI.uploadSubmission as jest.Mock).mockResolvedValue({ id: 123 });
    
    render(<FileUpload companyId={1} activityId="a1_drivers_map" onUploadSuccess={onUploadSuccess} />);
    
    const file = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByText('Upload Submission');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(learningAPI.uploadSubmission).toHaveBeenCalled();
      expect(onUploadSuccess).toHaveBeenCalledWith(123);
    });
  });

  it('handles upload errors', async () => {
    (learningAPI.uploadSubmission as jest.Mock).mockRejectedValue(new Error('Upload failed'));
    
    render(<FileUpload companyId={1} activityId="a1_drivers_map" onUploadSuccess={jest.fn()} />);
    
    const file = new File(['content'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [file],
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByText('Upload Submission');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
    });
  });
});

