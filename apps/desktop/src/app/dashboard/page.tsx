import { MVV } from "@/components/home/MVV";
import { ProductsBoard } from "@/components/home/ProductsBoard";
import { RightRail } from "@/components/home/RightRail";
import { ModuleHeader } from "@ngi/ui/components/layout";
import QuoteBanner from "@/components/home/QuoteBanner";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header - consistent with Finance module */}
      <ModuleHeader title="Dashboard" />
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <main className="container max-w-7xl mx-auto px-4">
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-0">
                <QuoteBanner connectedBelow />
                <MVV />
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
