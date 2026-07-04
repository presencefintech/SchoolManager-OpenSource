'use client'

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import type { FeeScheduleLineDto } from '@/types/finance'
import type { FinanceCurrencyCode } from '@/lib/finance/currency'
import { createFeesTableColumns } from './fees-table.columns'

interface FeesTableProps {
  lines: FeeScheduleLineDto[]
  currency: FinanceCurrencyCode
}

export function FeesTable({ lines, currency }: FeesTableProps) {
  const columns = useMemo(() => createFeesTableColumns(currency), [currency])

  const table = useReactTable({
    data: lines,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200/60 bg-white px-6 py-12 text-center">
        <p className="text-sm text-zinc-500">Aucune ligne d&apos;échéancier pour cette session.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-zinc-100 bg-zinc-50/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-3.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
