import { coreApi }       from './core.api'
import { financeApi }    from './finance.api'
import { monitoringApi } from './monitoring.api'
import { authApi }       from './auth.api'
import { auditApi }      from './audit.api'
import { classesApi }    from './classes.api'
import { enrollmentApi } from './enrollment.api'
import { presenceApi }   from './presence.api'
import { studentsApi }   from './students.api'

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
