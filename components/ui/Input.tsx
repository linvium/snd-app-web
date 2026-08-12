'use client'

import { forwardRef, useState, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, id, style, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false)
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
      <input
        {...props}
        id={inputId}
        ref={ref}
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
          padding: '0 14px',
          fontSize: '16px',
          color: 'var(--color-gray-900)',
          background: 'var(--color-white)',
          border: `1px solid ${error ? 'var(--color-error)' : focused ? 'var(--color-brand-500)' : 'var(--color-gray-300)'}`,
          borderRadius: 'var(--radius-md)',
          outline: focused && !error ? '3px solid var(--color-brand-100)' : 'none',
          ...style,
        }}
      />
      {error ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{error}</p>
      ) : helperText ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-gray-500)' }}>{helperText}</p>
      ) : null}
    </div>
  )
})

export default Input
