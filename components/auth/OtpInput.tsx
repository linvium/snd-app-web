'use client'

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  error?: boolean
  disabled?: boolean
}

export default function OtpInput({ value, onChange, error, disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  const setOtpValue = (next: string) => {
    onChange(next.replace(/\D/g, '').slice(0, 6))
  }

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const nextDigits = [...digits]
    nextDigits[index] = digit
    setOtpValue(nextDigits.join(''))
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const nextDigits = [...digits]
        nextDigits[index] = ''
        setOtpValue(nextDigits.join(''))
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus()
        const nextDigits = [...digits]
        nextDigits[index - 1] = ''
        setOtpValue(nextDigits.join(''))
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) inputsRef.current[index + 1]?.focus()
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    setOtpValue(pasted)
    const focusIndex = Math.min(pasted.length, 5)
    inputsRef.current[focusIndex]?.focus()
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
      }}
      role="group"
      aria-label="Kod za verifikaciju"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          aria-label={`Cifra ${index + 1}`}
          style={{
            width: '48px',
            height: '56px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-gray-900)',
            background: 'var(--color-white)',
            border: `1.5px solid ${error ? 'var(--color-error)' : 'var(--color-gray-300)'}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error
              ? 'var(--color-error)'
              : 'var(--color-brand-500)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error
              ? 'var(--color-error)'
              : 'var(--color-gray-300)'
          }}
        />
      ))}
    </div>
  )
}
