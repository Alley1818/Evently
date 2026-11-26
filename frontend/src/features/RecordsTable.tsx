import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, FilterX, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button, Input, Select } from '@/components/shared/ui'
import './records.css'

interface RecordsTableProps<T> {
  label: string
  rows: T[]
  getRowId: (row: T) => string
  columns: ColumnDef<T>[]
  empty: ReactNode
  toolbar?: ReactNode
  initialSorting?: SortingState
  pageSize?: number
}

export function RecordsTable<T>({
  label,
  rows,
  getRowId,
  columns,
  empty,
  toolbar,
  initialSorting = [],
  pageSize = 15,
}: RecordsTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const table = useReactTable({
    data: rows,
    getRowId,
    columns,
    enableMultiSort: false,
    state: { sorting },
    initialState: { pagination: { pageIndex: 0, pageSize } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const displayRows = table.getRowModel().rows
  const { pageIndex } = table.getState().pagination
  const first = pageIndex * pageSize + 1

  return (
    <section className="records-panel" aria-label={label}>
      {toolbar && <div className="records-toolbar">{toolbar}</div>}
      <div className="records-scroll" tabIndex={0} role="region" aria-label={`${label} table`}>
        <table className="records-table">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sort = header.column.getIsSorted()
                  const SortIcon = sort === 'asc' ? ArrowUp : sort === 'desc' ? ArrowDown : ArrowUpDown
                  const title = flexRender(header.column.columnDef.header, header.getContext())
                  return (
                    <th key={header.id} scope="col" aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}>
                      {header.column.getCanSort() ? (
                        <button type="button" className="records-sort" onClick={header.column.getToggleSortingHandler()}>
                          {title}
                          <SortIcon size={13} aria-hidden="true" />
                        </button>
                      ) : title}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {displayRows.length ? (
        <div className="records-footer">
          <span aria-live="polite">{first}–{first + displayRows.length - 1} of {rows.length.toLocaleString()}</span>
          <div className="records-pagination">
            <Button variant="ghost" size="icon" aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      ) : empty}
    </section>
  )
}

export function RecordsSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="records-search">
      <Search size={16} aria-hidden="true" />
      <Input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function ClearFilters({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <FilterX size={15} aria-hidden="true" />
      Clear filters
    </Button>
  )
}

const timePeriods = {
  hour: { label: 'Last hour', duration: 60 * 60 * 1000 },
  day: { label: 'Last 24 hours', duration: 24 * 60 * 60 * 1000 },
  week: { label: 'Last 7 days', duration: 7 * 24 * 60 * 60 * 1000 },
  month: { label: 'Last 30 days', duration: 30 * 24 * 60 * 60 * 1000 },
}

export type TimePeriod = keyof typeof timePeriods | 'all'

export function TimeFilter({ value, onChange }: { value: TimePeriod; onChange: (value: TimePeriod) => void }) {
  return (
    <Select className="records-select" aria-label="Created during" value={value} onChange={(event) => onChange(event.target.value as TimePeriod)}>
      <option value="all">Any time</option>
      {Object.entries(timePeriods).map(([key, period]) => <option key={key} value={key}>{period.label}</option>)}
    </Select>
  )
}

export function inTimePeriod(timestamp: string, period: TimePeriod, now: number) {
  if (period === 'all') return true
  const time = Date.parse(timestamp)
  return time >= now - timePeriods[period].duration && time <= now
}
