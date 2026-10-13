import { redirect } from 'next/navigation'

/**
 * Alias produit `/admin/attendance` → registre quotidien existant `/admin/presences`.
 */
export default function AdminAttendanceAliasPage() {
  redirect('/admin/presences?tab=sheets')
}
