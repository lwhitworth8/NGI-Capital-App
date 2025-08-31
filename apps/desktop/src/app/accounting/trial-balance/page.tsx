"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";

export default function TrialBalancePage() {
  const [entityId, setEntityId] = useState<number>(1);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const tb = await apiClient.getTrialBalance(entityId, asOfDate);
      setData(tb);
    } catch (e) {
      setData(null);
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
      <Card className="p-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-sm">Entity ID</label>
            <input className="input" type="number" value={entityId} onChange={(e)=> setEntityId(parseInt(e.target.value||"1",10))} />
          </div>
          <div>
            <label className="text-sm">As of Date</label>
            <input className="input" type="date" value={asOfDate} onChange={(e)=> setAsOfDate(e.target.value)} />
          </div>
          <Button onClick={load} disabled={loading}>{loading?"Loading...":"Run"}</Button>
        </div>
      </Card>

      <Card className="p-4 overflow-auto">
        <h2 className="font-semibold mb-3">Trial Balance</h2>
        {data?.lines?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4">Account</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4 text-right">Debit</th>
                <th className="py-2 pr-4 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l:any, idx:number)=> (
                <tr key={idx} className="border-t">
                  <td className="py-1 pr-4">{l.account_code}</td>
                  <td className="py-1 pr-4">{l.account_name}</td>
                  <td className="py-1 pr-4 text-right">{Number(l.debit).toLocaleString()}</td>
                  <td className="py-1 pr-4 text-right">{Number(l.credit).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold">
                <td className="py-2 pr-4" colSpan={2}>Totals</td>
                <td className="py-2 pr-4 text-right">{Number(data.total_debits||0).toLocaleString()}</td>
                <td className="py-2 pr-4 text-right">{Number(data.total_credits||0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        ): (
          <div className="text-sm text-muted-foreground">No data</div>
        )}
      </Card>
    </div>
  );
}

