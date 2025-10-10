"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  series: { date: string; value: number }[];
};

export function MetricModal({ open, onClose, title, series }: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title={title}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer>
          <LineChart data={series}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} hide={true} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip />
            <Line type="monotone" dataKey="value" strokeWidth={2} stroke="currentColor" className="text-foreground" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4">
        <a href="#" onClick={(e)=>{e.preventDefault(); const a=document.createElement('a'); a.href=`/api/metrics/spx/history.csv?range=5y`; a.click();}}>Download CSV</a>
      </div>
    </Modal>
  );
}

export default MetricModal;


