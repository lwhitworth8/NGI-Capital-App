import React from 'react';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full">
      {children}
    </div>
  );
}