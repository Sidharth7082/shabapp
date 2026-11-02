import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui/display'
import {
  CalculatorIcon,
  ChevronRightIcon,
  ClockIcon,
  ShieldIcon,
  WrenchIcon
} from '@/components/ui/icons'
import { rupees } from '@/domain/shared/money'

const TOOLS = [
  {
    to: '/estimates/gas',
    title: 'Gas suppression BOQ',
    body: 'Agent weight, cylinders, nozzles and hardware.',
    tag: 'NFPA 2001',
    icon: ShieldIcon
  },
  {
    to: '/estimates/fire-alarm',
    title: 'Fire alarm BOQ',
    body: 'Detector, MCP, hooter, module and cable quantities.',
    tag: 'NFPA 72',
    icon: WrenchIcon
  },
  {
    to: '/estimates/quotation',
    title: 'Quotation builder',
    body: 'Priced schedule with HSN codes and 18% GST.',
    tag: 'Priced',
    icon: CalculatorIcon
  },
  {
    to: '/estimates/amc',
    title: 'AMC / CMC quote',
    body: 'Maintenance scope by frequency plus rate card.',
    tag: 'Needs rates',
    icon: ClockIcon
  }
]

export function EstimateHub() {
  const estimates = useLiveQuery(
    () => db.estimates.orderBy('createdAt').reverse().limit(8).toArray(),
    []
  )

  return (
    <div className="space-y-5 px-4 pb-6 pt-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">Tools</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Estimates
        </h1>
        <p className="mt-1 text-[13px] text-ink-mute">
          Survey in the morning, quote in the afternoon. Works offline.
        </p>
      </header>

      <section className="grid gap-2.5">
        {TOOLS.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="group flex items-center gap-3.5 rounded-2xl border border-surface-line bg-white p-4 shadow-card transition active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <tool.icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[14px] font-bold tracking-tight text-ink">
                  {tool.title}
                </span>
                <Badge tone={tool.tag === 'Needs rates' ? 'warn' : 'brand'}>{tool.tag}</Badge>
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-ink-mute">{tool.body}</span>
            </span>
            <ChevronRightIcon
              size={16}
              className="shrink-0 text-ink-mute transition group-hover:translate-x-0.5 group-hover:text-brand-600"
            />
          </Link>
        ))}
      </section>

      <section>
        <SectionHeader title="Recent estimates" subtitle="Saved on this device" />
        {!estimates || estimates.length === 0 ? (
          <EmptyState title="No saved estimates" body="Any BOQ you save appears here for quick reuse." />
        ) : (
          <div className="space-y-2">
            {estimates.map((estimate) => (
              <Card key={estimate.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{estimate.title}</p>
                  <p className="text-[11px] text-ink-mute">
                    {estimate.kind.replace('-', ' ')} ·{' '}
                    {new Date(estimate.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-600">{rupees(estimate.total)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Delete "${estimate.title}"?`)) return
                      void db.estimates.delete(estimate.id)
                    }}
                    className="text-[11px] font-semibold text-danger"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="rounded-xl bg-white px-3 py-2.5 text-[11px] leading-5 text-ink-mute shadow-card">
        Catalog rates are the published Shabh selling rates. Every line is editable and saved with the estimate.
        All outputs are preliminary estimates, not final engineered BOQs.
      </p>
    </div>
  )
}
