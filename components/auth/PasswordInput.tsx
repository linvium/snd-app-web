'use client'

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  indicator?: ReactNode
  trailingLink?: ReactNode
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, error, indicator, trailingLink, id, className, ...props },
  ref
) {
  const [visible, setVisible] = useState(false)
  const inputId = id || props.name

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </Label>
      ) : null}

      <div className="relative">
        <Input
          {...props}
          id={inputId}
          ref={ref}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          className={cn('pr-11', className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Sakrij lozinku' : 'Prikaži lozinku'}
          className="absolute top-1/2 right-2.5 grid -translate-y-1/2 place-items-center border-none bg-transparent p-1 text-muted-foreground"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>

      {error ? <p className="m-0 text-[13px] text-destructive">{error}</p> : null}

      {indicator}

      {trailingLink ? <div className="flex justify-end">{trailingLink}</div> : null}
    </div>
  )
})

export default PasswordInput
