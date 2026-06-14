import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@treaty/shared'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  [ProjectStatus.DRAFT]:             { label: 'Draft',              className: 'bg-zinc-100 text-zinc-700' },
  [ProjectStatus.PREVIEW_SHARED]:    { label: 'Shared with Client', className: 'bg-blue-100 text-blue-700' },
  [ProjectStatus.AWAITING_PAYMENT]:  { label: 'Awaiting Payment',   className: 'bg-yellow-100 text-yellow-700' },
  [ProjectStatus.PAID]:              { label: 'Paid',               className: 'bg-green-100 text-green-700' },
  [ProjectStatus.DELIVERED]:         { label: 'Delivered',          className: 'bg-emerald-100 text-emerald-700' },
  [ProjectStatus.EXPIRED]:           { label: 'Expired',            className: 'bg-red-100 text-red-700' },
}

interface StatusBadgeProps {
  status: ProjectStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status] ?? { label: status, className: '' }
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
