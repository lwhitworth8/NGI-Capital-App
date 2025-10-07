"use client";

interface BalanceSheetData {
  assets: {
    current_assets: Record<string, { balance: number }>;
    non_current_assets: Record<string, { balance: number }>;
    total_assets: number;
  };
  liabilities: {
    current_liabilities: Record<string, { balance: number }>;
    non_current_liabilities: Record<string, { balance: number }>;
    total_liabilities: number;
  };
  equity: {
    stockholders_equity: Record<string, { balance: number }>;
    total_equity: number;
  };
}

interface BalanceSheetViewProps {
  data: BalanceSheetData;
}

export function BalanceSheetView({ data }: BalanceSheetViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Assets */}
      <div>
        <h3 className="text-lg font-bold mb-3 bg-muted px-4 py-2 rounded">ASSETS</h3>
        
        {/* Current Assets */}
        <div className="ml-4 space-y-2">
          <p className="font-semibold mt-2">Current Assets</p>
          {Object.entries(data.assets.current_assets).map(([name, details]) => (
            <div key={name} className="flex justify-between ml-4 text-sm">
              <span>{name}</span>
              <span className="font-mono">{formatCurrency(details.balance)}</span>
            </div>
          ))}
        </div>

        {/* Non-Current Assets */}
        {Object.keys(data.assets.non_current_assets).length > 0 && (
          <div className="ml-4 space-y-2 mt-3">
            <p className="font-semibold mt-2">Non-Current Assets</p>
            {Object.entries(data.assets.non_current_assets).map(([name, details]) => (
              <div key={name} className="flex justify-between ml-4 text-sm">
                <span>{name}</span>
                <span className="font-mono">{formatCurrency(details.balance)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t-2 border-gray-800">
          <span>TOTAL ASSETS</span>
          <span className="font-mono">{formatCurrency(data.assets.total_assets)}</span>
        </div>
      </div>

      {/* Liabilities & Equity */}
      <div className="mt-6">
        <h3 className="text-lg font-bold mb-3 bg-muted px-4 py-2 rounded">
          LIABILITIES AND STOCKHOLDERS EQUITY
        </h3>
        
        {/* Current Liabilities */}
        <div className="ml-4 space-y-2">
          <p className="font-semibold mt-2">Current Liabilities</p>
          {Object.entries(data.liabilities.current_liabilities).map(([name, details]) => (
            <div key={name} className="flex justify-between ml-4 text-sm">
              <span>{name}</span>
              <span className="font-mono">{formatCurrency(details.balance)}</span>
            </div>
          ))}
        </div>

        {/* Stockholders Equity */}
        <div className="ml-4 space-y-2 mt-4">
          <p className="font-semibold mt-2">Stockholders Equity</p>
          {Object.entries(data.equity.stockholders_equity).map(([name, details]) => (
            <div key={name} className="flex justify-between ml-4 text-sm">
              <span>{name}</span>
              <span className="font-mono">{formatCurrency(details.balance)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t-2 border-gray-800">
          <span>TOTAL LIABILITIES AND EQUITY</span>
          <span className="font-mono">
            {formatCurrency(data.liabilities.total_liabilities + data.equity.total_equity)}
          </span>
        </div>
      </div>
    </div>
  );
}

