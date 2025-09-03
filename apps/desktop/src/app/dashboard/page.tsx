import dynamic from "next/dynamic";
const MetricsTicker = dynamic(() => import("@/components/metrics/MetricsTicker"), { ssr:false });

import { EntityOverview } from "@/components/home/EntityOverview";
import { ImportantModules } from "@/components/home/ImportantModules";
import { MVV } from "@/components/home/MVV";
import { Goals } from "@/components/home/Goals";
import { ProductsBoard } from "@/components/home/ProductsBoard";
import { RightRail } from "@/components/home/RightRail";
import { ComplianceSummary } from "@/components/home/ComplianceSummary";

export default function DashboardPage() {
  return (
      <main className="container max-w-7xl mx-auto px-4">
        <MetricsTicker className="sticky top-0 z-40 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40" />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <EntityOverview />
            <ComplianceSummary />
            <ImportantModules />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MVV />
              <Goals />
            </div>
            <ProductsBoard />
          </div>
          <RightRail />
        </section>
      </main>
  );
}
