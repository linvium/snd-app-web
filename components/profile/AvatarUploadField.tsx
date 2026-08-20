'use client'

import { useRef } from 'react'
import { CameraIcon } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { MAX_AVATAR_BYTES } from '@/types'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

export function AvatarUploadField({
  previewUrl,
  error,
  disabled,
  onFileSelected,
  onError,
}: {
  previewUrl: string | null
  error?: string
  disabled?: boolean
  onFileSelected: (file: File) => void
  onError: (message: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_AVATAR_BYTES) {
      onError('Slika sme da ima najviše 10 MB.')
      return
    }
    onFileSelected(file)
  }

  return (
    <div className="flex w-[128px] shrink-0 flex-col gap-1.5">
      <Label htmlFor="avatar" className="text-sm font-medium text-foreground">
        Profilna slika
      </Label>
      <button
        type="button"
        id="avatar"
        data-testid="avatar-upload"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label={previewUrl ? 'Promeni profilnu sliku' : 'Dodaj profilnu sliku'}
        aria-invalid={error ? true : undefined}
        className={cn(
          'group relative size-[128px] overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-100',
          'hover:border-brand-500 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
              <CameraIcon className="size-6 text-white" strokeWidth={1.6} aria-hidden />
            </span>
          </>
        ) : (
          <span className="grid size-full place-items-center text-zinc-400 group-hover:text-brand-600">
            <CameraIcon className="size-8" strokeWidth={1.5} aria-hidden />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        data-testid="avatar-file-input"
        onChange={handleChange}
      />
      {error ? <p className="m-0 text-[13px] text-destructive">{error}</p> : null}
    </div>
  )
}
