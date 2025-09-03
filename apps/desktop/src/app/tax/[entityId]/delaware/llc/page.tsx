'use client';

import React from 'react';

export default function DelawareLLCTaxPage({ params }: { params: { entityId: string } }) {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Delaware LLC Filing</h1>
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-2">Filing Checklist</h2>
        <p className="text-sm text-muted-foreground">No items.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-2">Required Documents</h2>
        <p className="text-sm text-muted-foreground">No documents linked.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-2">Status & Tasks</h2>
        <p className="text-sm text-muted-foreground">No tasks.</p>
      </div>
      <button className="px-4 py-2 rounded-md bg-blue-600 text-white">Prepare return</button>
    </div>
  );
}

