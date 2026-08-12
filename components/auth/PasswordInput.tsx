'use client'

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  indicator?: ReactNode
  trailingLink?: ReactNode
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, error, indicator, trailingLink, id, style, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const inputId = id || props.name

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label ? (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--color-gray-700)',
          }}
        >
          {label}
        </label>
      ) : null}

      <div style={{ position: 'relative' }}>
        <input
          {...props}
          id={inputId}
          ref={ref}
          type={visible ? 'text' : 'password'}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          style={{
            width: '100%',
            height: '44px',
            padding: '0 44px 0 14px',
            fontSize: '16px',
            color: 'var(--color-gray-900)',
            background: 'var(--color-white)',
            border: `1px solid ${error ? 'var(--color-error)' : focused ? 'var(--color-brand-500)' : 'var(--color-gray-300)'}`,
            borderRadius: 'var(--radius-md)',
            outline: focused && !error ? '3px solid var(--color-brand-100)' : 'none',
            ...style,
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Sakrij lozinku' : 'Prikaži lozinku'}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'transparent',
            padding: '4px',
            cursor: 'pointer',
            color: 'var(--color-gray-500)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7- .5 1.1-1.2 2.1-2 3" />
              <path d="M6.1 6.1C4.2 7.4 2.7 9.1 2 12c1.7 3.9 6 7 11 7 1.4 0 2.7-.2 3.9-.7" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {error ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{error}</p>
      ) : null}

      {indicator}

      {trailingLink ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{trailingLink}</div>
      ) : null}
    </div>
  )
})

export default PasswordInput
