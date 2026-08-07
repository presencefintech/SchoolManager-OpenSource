import { coreApi }       from './core.api'
import { financeApi }    from './finance.api'
import { monitoringApi } from './monitoring.api'
import { authApi }       from './auth.api'
import { auditApi }      from './audit.api'
import { classesApi }    from './classes.api'
import { enrollmentApi } from './enrollment.api'
import { presenceApi }   from './presence.api'
import { studentsApi }   from './students.api'

export { exportApi }       from './export.api'
export { securityApi }     from './security.api'
export { feesApi }         from './fees.api'
export { invitationsApi }  from './invitations.api'
export { usersApi }        from './users.api'
export { notificationsApi } from './notifications.api'
export { bankApi }         from './bank.api'
export { pdfApi }          from './pdf.api'
export { qrcodeApi }       from './qrcode.api'
export { filesApi }        from './files.api'
export { fraudApi }        from './fraud.api'
export { anomaliesApi }    from './anomalies.api'
export { emailsApi }       from './emails.api'
export { schoolNetworkApi, adminNetworkApi } from './school-network.api'
export type { SchoolNetworkGroup, SchoolNetworkMember, SchoolNetworkOption } from './school-network.api'

export const superAdminApi = {
  ...financeApi,
  ...monitoringApi,
  ...authApi,
  ...auditApi,
  ...classesApi,
  ...enrollmentApi,
  ...presenceApi,
  ...studentsApi,
  // coreApi spread last: its `reconcilePayment` (POST /superadmin/core/reconcile/{id}) is the
  // generic payment reconciliation the audit page expects — must win over monitoringApi's
  // mobile-money-specific `reconcilePayment` (POST /superadmin/mm/reconcile/{id}), which callers
  // needing MM semantics import directly from monitoringApi instead of through superAdminApi.
  ...coreApi,
}
