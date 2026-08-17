'use client'

import { useEffect, useRef } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DESCRIPTION_MAX, TITLE_MAX } from '@/types/listing'
import { CircleAlertIcon } from 'lucide-react'

export function DescribeStep({
  title,
  description,
  titleError,
  descriptionError,
  titleWarning,
  autoFocus,
  onTitleChange,
  onDescriptionChange,
}: {
  title: string
  description: string
  titleError?: string
  descriptionError?: string
  titleWarning?: string
  autoFocus?: boolean
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * 12 + 20
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [description])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="listing-title">Naslov</Label>
        <Input
          id="listing-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value.slice(0, TITLE_MAX))}
          placeholder="npr. Bušilica Bosch GSB 13 RE"
          autoFocus={autoFocus}
          aria-invalid={titleError ? true : undefined}
          maxLength={TITLE_MAX}
        />
        {titleError ? (
          <p className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
            <CircleAlertIcon className="size-3.5" aria-hidden />
            {titleError}
          </p>
        ) : titleWarning ? (
          <p className="m-0 text-[13px] text-warning">{titleWarning}</p>
        ) : title.length > 100 ? (
          <p className="m-0 text-[13px] text-muted-foreground">{title.length}/{TITLE_MAX}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="listing-description">Opiši predmet što detaljnije</Label>
        <Textarea
          id="listing-description"
          ref={textareaRef}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value.slice(0, DESCRIPTION_MAX))}
          placeholder={'npr.\n• Bušilica sa dva nastavka i koferom\n• Malo korišćena, sve radi\n• Ima sitnu ogrebotinu na kućištu'}
          rows={5}
          aria-invalid={descriptionError ? true : undefined}
          className="min-h-[120px] resize-none overflow-y-auto"
        />
        <p className="m-0 text-[13px] text-muted-foreground">
          Šta sve dobija onaj ko iznajmi? U kakvom je stanju? Ima li nešto na šta treba paziti?
        </p>
        {descriptionError ? (
          <p className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
            <CircleAlertIcon className="size-3.5" aria-hidden />
            {descriptionError}
          </p>
        ) : description.length > 3500 ? (
          <p className="m-0 text-[13px] text-muted-foreground">
            {description.length}/{DESCRIPTION_MAX}
          </p>
        ) : null}
      </div>
    </div>
  )
}
