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
export { notificationsApi } from './notifications.api'
export { bankApi }         from './bank.api'
export { pdfApi }          from './pdf.api'
export { qrcodeApi }       from './qrcode.api'
export { filesApi }        from './files.api'
export { fraudApi }        from './fraud.api'
export { anomaliesApi }    from './anomalies.api'

export const superAdminApi = {
  ...coreApi,
  ...financeApi,
  ...monitoringApi,
  ...authApi,
  ...auditApi,
  ...classesApi,
  ...enrollmentApi,
  ...presenceApi,
  ...studentsApi,
}
