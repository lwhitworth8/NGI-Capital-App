"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";

export default function UnpostedEntriesPage() {
  const [entityId, setEntityId] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [entries, setEntries] = useState<{ id: number; entry_number: string; entry_date: string; description: string }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getUnpostedEntries(entityId);
      setEntries(list);
    } finally {
      setLoading(false);
    }
  };

  const postAll = async () => {
    setLoading(true);
    try {
      await apiClient.postBatchEntries({ entity_id: entityId });
      await load();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Card className="p-4 flex items-end gap-3">
        <div>
          <label className="text-sm">Entity ID</label>
          <input className="input" type="number" value={entityId} onChange={(e)=> setEntityId(parseInt(e.target.value||"1",10))} />
        </div>
        <Button onClick={load} disabled={loading}>{loading?"Loading...":"Refresh"}</Button>
        <Button onClick={postAll} disabled={loading || entries.length===0}>
          {loading?"Posting...":"Post All Approved"}
        </Button>
      </Card>

      <Card className="p-4 overflow-auto">
        <h2 className="font-semibold mb-3">Unposted Approved Entries</h2>
        {entries.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4">Entry #</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e)=> (
                <tr key={e.id} className="border-t">
                  <td className="py-1 pr-4">{e.entry_number}</td>
                  <td className="py-1 pr-4">{e.entry_date}</td>
                  <td className="py-1 pr-4">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ): (
          <div className="text-sm text-muted-foreground">No unposted entries</div>
        )}
      </Card>
    </div>
  );
}

