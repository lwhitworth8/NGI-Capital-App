"use client"

import { useEntityContext } from "@/hooks/useEntityContext"
import { EntitySelector } from "@/components/accounting/EntitySelector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountingTabs } from "./components/AccountingTabs"

export default function AccountingPage() {
  const { selectedEntityId, setSelectedEntityId } = useEntityContext()

  if (!selectedEntityId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Select an Entity</CardTitle>
            <CardDescription>Choose an entity to view accounting</CardDescription>
          </CardHeader>
          <CardContent>
            <EntitySelector value={selectedEntityId} onChange={setSelectedEntityId} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground mt-1">Manage financials and reporting</p>
        </div>
        <EntitySelector value={selectedEntityId} onChange={setSelectedEntityId} />
      </div>

      {/* Tab Navigation */}
      <AccountingTabs />
    </div>
  )
}