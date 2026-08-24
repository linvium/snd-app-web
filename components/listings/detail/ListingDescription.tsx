'use client'

import { useState } from 'react'
import { FileTextIcon, InfoIcon } from 'lucide-react'

import { prepareDescription } from '@/lib/listings'

/**
 * Description (doc 04 §6).
 *
 * Rendered as plain text with line breaks preserved and nothing linkified —
 * phone numbers and addresses arrive already masked, and turning URLs into
 * links would hand back the escape route the masking closes.
 */
export default function ListingDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false)
  const { text, preview, isTruncated, hasMaskedContact } = prepareDescription(description)

  if (!text) return null

  return (
    <section>
      <div className="mt-0 mb-3 flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-9 flex-none place-items-center rounded-lg bg-muted text-zinc-500"
        >
          <FileTextIcon className="size-[18px]" strokeWidth={1.8} />
        </span>
        <h2 className="m-0 text-base font-semibold text-card-foreground">Opis</h2>
      </div>

      <p className="m-0 text-base leading-7 whitespace-pre-wrap text-foreground">
        {expanded || !isTruncated ? text : `${preview}…`}
      </p>

      {isTruncated ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-brand-700 underline underline-offset-2"
        >
          {expanded ? 'Prikaži manje' : 'Prikaži više'}
        </button>
      ) : null}

      {hasMaskedContact ? (
        <p className="mt-3 mb-0 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 flex-none" strokeWidth={1.8} aria-hidden />
          Kontakt podaci se razmenjuju kroz poruke.
        </p>
      ) : null}
    </section>
  )
}
