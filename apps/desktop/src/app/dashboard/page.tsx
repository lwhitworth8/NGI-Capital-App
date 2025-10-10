import dynamic from "next/dynamic";
const MetricsTicker = dynamic(() => import("@/components/metrics/MetricsTicker"), { loading: () => <div className="h-12" /> });

import { EntityOverview } from "@/components/home/EntityOverview";
import { ImportantModules } from "@/components/home/ImportantModules";
import { MVV } from "@/components/home/MVV";
import { Goals } from "@/components/home/Goals";
import { ProductsBoard } from "@/components/home/ProductsBoard";
import { RightRail } from "@/components/home/RightRail";
import { ComplianceSummary } from "@/components/home/ComplianceSummary";
import { EntitySelector } from "@/components/common/EntitySelector";
import { ModuleHeader } from "@ngi/ui/components/layout";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header - consistent with Finance module */}
      <ModuleHeader 
        title="Dashboard" 
        subtitle="Overview and key metrics for your selected entity"
        rightContent={<EntitySelector />}
      />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <main className="container max-w-7xl mx-auto px-4">
          <MetricsTicker className="mt-4 mb-6" />

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
}
