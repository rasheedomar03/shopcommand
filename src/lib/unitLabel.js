import { useData } from '@/contexts/DataContext'
import { unitLabelFor } from '@/lib/trucks'

/** The label for this shop's own vehicle number: "Truck #" or "Vehicle ID" (see unitLabelFor). */
export function useUnitLabel() {
  const { shops, customers, invoices } = useData()
  return unitLabelFor({ shops, customers, invoices })
}
