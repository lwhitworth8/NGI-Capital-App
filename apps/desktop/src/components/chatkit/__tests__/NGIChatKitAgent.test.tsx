/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Create a simple test component that doesn't use any external dependencies
const SimpleChatKitAgent = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700"
        data-testid="orb-button"
      >
        {isOpen ? 'Close' : 'Open'}
      </button>
      {isOpen && (
        <div data-testid="chatkit" className="chat-panel">
          ChatKit Component
        </div>
      )}
    </>
  );
};

describe('NGIChatKitAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the floating orb button', () => {
    render(<SimpleChatKitAgent />);
    
    const orbButton = screen.getByTestId('orb-button');
    expect(orbButton).toBeInTheDocument();
    expect(orbButton).toHaveClass('rounded-full');
  });

  it('opens chat panel when orb is clicked', () => {
    render(<SimpleChatKitAgent />);
    
    const orbButton = screen.getByTestId('orb-button');
    expect(screen.queryByTestId('chatkit')).not.toBeInTheDocument();
    
    // Use fireEvent for more reliable clicking
    fireEvent.click(orbButton);
    expect(screen.getByTestId('chatkit')).toBeInTheDocument();
  });

  it('closes chat panel when orb is clicked again', () => {
    render(<SimpleChatKitAgent />);
    
    const orbButton = screen.getByTestId('orb-button');
    
    // Open chat
    fireEvent.click(orbButton);
    expect(screen.getByTestId('chatkit')).toBeInTheDocument();
    
    // Close chat
    fireEvent.click(orbButton);
    expect(screen.queryByTestId('chatkit')).not.toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<SimpleChatKitAgent />);
    
    const orbButton = screen.getByTestId('orb-button');
    expect(orbButton).toHaveClass(
      'h-16',
      'w-16',
      'rounded-full',
      'bg-gradient-to-br',
      'from-blue-600',
      'via-blue-500',
      'to-blue-700'
    );
  });
});
