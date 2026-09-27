import { apiClient } from '@/lib/api/client'

export type BudgetCategory = {
  id: number
  schoolId: number
  name: string
  isActive: boolean
}

export type BudgetGridLine = {
  monthYear: string
  plannedAmount: number
}

export type BudgetGridCategory = {
  id: number
  name: string
  lines: BudgetGridLine[]
}

export type BudgetGrid = {
  sessionId: number
  sessionLabel: string
  months: string[]
  categories: BudgetGridCategory[]
}

export type BudgetVarianceLine = {
  monthYear: string
  planned: number
  actual: number
  variance: number
}

export type BudgetVarianceCategory = {
  categoryId: number
  categoryName: string
  lines: BudgetVarianceLine[]
  totalPlanned: number
  totalActual: number
  totalVariance: number
}

export type BudgetVariance = {
  sessionId: number
  sessionLabel: string
  months: string[]
  categories: BudgetVarianceCategory[]
  unbudgetedActual: number
}

export const financeBudgetApi = {
  listCategories: () =>
    apiClient
      .get<{ success: boolean; data: BudgetCategory[] }>('/admin/finance/budget-categories')
      .then((r) => r.data.data),

  createCategory: (name: string) =>
    apiClient
      .post<{ success: boolean; data: BudgetCategory }>('/admin/finance/budget-categories', { name })
      .then((r) => r.data.data),

  setCategoryActive: (id: number, isActive: boolean) =>
    apiClient
      .patch<{ success: boolean; data: BudgetCategory }>(`/admin/finance/budget-categories/${id}`, { isActive })
      .then((r) => r.data.data),

  getBudget: (sessionId: number) =>
    apiClient
      .get<{ success: boolean; data: BudgetGrid }>('/admin/finance/budget', { params: { sessionId } })
      .then((r) => r.data.data),

  upsertLines: (sessionId: number, lines: Array<{ categoryId: number; monthYear: string; plannedAmount: number }>) =>
    apiClient
      .put<{ success: boolean; data: { count: number } }>('/admin/finance/budget', { sessionId, lines })
      .then((r) => r.data.data),

  getVariance: (sessionId: number) =>
    apiClient
      .get<{ success: boolean; data: BudgetVariance }>('/admin/finance/budget/variance', { params: { sessionId } })
      .then((r) => r.data.data),
}
