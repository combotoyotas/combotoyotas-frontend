'use client'

import Link from 'next/link'

type Props = {
  eyebrow?: string
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
}

/** Cabecera uniforme para vistas dentro del shell. */
export default function PageHeader({
  eyebrow = 'Módulo',
  title,
  description,
  backHref,
  backLabel = 'Volver',
  actions,
}: Props) {
  return (
    <header className="mb-6 pb-4 border-b border-slate-200/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between min-w-0">
        <div className="min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-2"
            >
              ← {backLabel}
            </Link>
          )}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {eyebrow}
          </p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-slate-900 mt-1 break-words">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
