'use client'

import { Card } from '@/components/ui/card'
import { useEntity } from '@/lib/context/UnifiedEntityContext'

export function EntityOverview() {
  const { selectedEntity } = useEntity()
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Entity Overview</h3>
      
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground mb-1">Legal Name</dt>
          <dd className="font-medium">{selectedEntity?.entity_name || '-'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground mb-1">Type</dt>
          <dd className="font-medium">{selectedEntity?.entity_type || '-'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground mb-1">EIN</dt>
          <dd className="font-medium">{selectedEntity?.ein || '-'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground mb-1">Status</dt>
          <dd className="font-medium capitalize">{selectedEntity?.entity_status || '-'}</dd>
        </div>
      </dl>
    </Card>
  )
}

