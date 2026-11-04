'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { parentApi, type ParentStudent } from '@/lib/parent/api'

const SELECTED_KEY = 'parent_selected_student'

export const parentKeys = {
  dashboard: ['parent', 'dashboard'] as const,
  students: ['parent', 'students'] as const,
  notifications: ['parent', 'notifications'] as const,
  announcements: ['parent', 'announcements'] as const,
  securityLogs: ['parent', 'security-logs'] as const,
  methods: ['parent', 'payment-methods'] as const,
  attendance: (id: number) => ['parent', 'attendance', id] as const,
  pass: (id: number) => ['parent', 'pass', id] as const,
  finances: (id: number) => ['parent', 'finances', id] as const,
  feeStructures: (id: number) => ['parent', 'fee-structures', id] as const,
  feeSchedule: (id: number) => ['parent', 'fee-schedule', id] as const,
  feePeriods: (id: number, fee: number) => ['parent', 'fee-periods', id, fee] as const,
  moratorium: (id: number) => ['parent', 'moratorium', id] as const,
  payment: (id: number | string) => ['parent', 'payment', id] as const,
  assignments: (id: number) => ['parent', 'assignments', id] as const,
  quizzes: (id: number) => ['parent', 'quizzes', id] as const,
  aiSessions: (id: number) => ['parent', 'ai-sessions', id] as const,
  aiSession: (id: number, session: number | string) => ['parent', 'ai-session', id, session] as const,
  schoolCircle: ['parent', 'school-circle'] as const,
  pickupAdults: (id: number) => ['parent', 'pickup-adults', id] as const,
}

export function useParentStudents() {
  return useQuery({ queryKey: parentKeys.students, queryFn: parentApi.students, staleTime: 60_000 })
}

export function useParentDashboard() {
  return useQuery({ queryKey: parentKeys.dashboard, queryFn: parentApi.dashboard, staleTime: 30_000 })
}

interface SelectedStudentValue {
  students: ParentStudent[]
  student: ParentStudent | null
  studentId: number | null
  select: (id: number) => void
  isLoading: boolean
}

const SelectedStudentContext = createContext<SelectedStudentValue | null>(null)

/** Enfant actif — persisté localement, comme le sélecteur d'enfant de l'app mobile. */
export function SelectedStudentProvider({ children }: { children: React.ReactNode }) {
  const { data: students = [], isLoading } = useParentStudents()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SELECTED_KEY)
      if (raw) setSelectedId(Number(raw))
    } catch {
      /* stockage indisponible */
    }
  }, [])

  const select = useCallback((id: number) => {
    setSelectedId(id)
    try {
      localStorage.setItem(SELECTED_KEY, String(id))
    } catch {
      /* ignoré */
    }
  }, [])

  const value = useMemo<SelectedStudentValue>(() => {
    const student = students.find((s) => s.id === selectedId) ?? students[0] ?? null
    return { students, student, studentId: student?.id ?? null, select, isLoading }
  }, [students, selectedId, select, isLoading])

  return <SelectedStudentContext.Provider value={value}>{children}</SelectedStudentContext.Provider>
}

export function useSelectedStudent(): SelectedStudentValue {
  const ctx = useContext(SelectedStudentContext)
  if (!ctx) throw new Error('useSelectedStudent doit être utilisé dans <SelectedStudentProvider>')
  return ctx
}

/** Applique le paramètre `?student=` (liens depuis le tableau de bord) à l'enfant actif. À monter sous <Suspense>. */
export function StudentParamSync() {
  const params = useSearchParams()
  const { students, select } = useSelectedStudent()
  const wanted = Number(params.get('student'))
  useEffect(() => {
    if (wanted && students.some((s) => s.id === wanted)) select(wanted)
  }, [wanted, students, select])
  return null
}
