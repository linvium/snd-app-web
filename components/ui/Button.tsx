'use client'

import type { ButtonHTMLAttributes, CSSProperties } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, CSSProperties> = {
  sm: { height: '36px', padding: '0 14px', fontSize: '14px' },
  md: { height: '44px', padding: '0 18px', fontSize: '16px' },
  lg: { height: '52px', padding: '0 22px', fontSize: '16px' },
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, CSSProperties> = {
  primary: {
    background: 'var(--color-brand-500)',
    color: 'var(--color-white)',
    border: '1px solid var(--color-brand-500)',
  },
  secondary: {
    background: 'var(--color-white)',
    color: 'var(--color-gray-700)',
    border: '1px solid var(--color-gray-300)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-brand-600)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--color-white)',
    color: 'var(--color-error)',
    border: '1px solid var(--color-gray-300)',
  },
}

function Spinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease',
        ...SIZE_STYLES[size],
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled || loading) return
        if (variant === 'primary') {
          e.currentTarget.style.background = 'var(--color-brand-600)'
          e.currentTarget.style.borderColor = 'var(--color-brand-600)'
        }
        props.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.background = 'var(--color-brand-500)'
          e.currentTarget.style.borderColor = 'var(--color-brand-500)'
        }
        props.onMouseLeave?.(e)
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid var(--color-brand-400)'
        e.currentTarget.style.outlineOffset = '2px'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none'
        props.onBlur?.(e)
      }}
    >
      {loading ? (
        <>
          <Spinner />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}
