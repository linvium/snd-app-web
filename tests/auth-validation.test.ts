import { describe, expect, it } from 'vitest'

import { validateEmail, validatePassword, validatePhone } from '@/lib/auth/auth.validation'
import { normalizePhone } from '@/lib/profiles'

describe('validatePhone', () => {
  it('asks for a number when the input is empty', () => {
    expect(validatePhone('')).toBe('Unesi broj telefona.')
    expect(validatePhone('   ')).toBe('Unesi broj telefona.')
  })

  it('accepts a local mobile number without the country code', () => {
    expect(validatePhone('641234567')).toBe('')
  })

  it('accepts a number typed with a leading zero', () => {
    expect(validatePhone('0641234567')).toBe('')
  })

  it('accepts a number with spaces', () => {
    expect(validatePhone('64 123 4567')).toBe('')
  })

  it('accepts an already normalized +381 number', () => {
    expect(validatePhone('+381641234567')).toBe('')
  })

  it('rejects a number that is too short', () => {
    expect(validatePhone('12345')).toBe('Unesi ispravan broj telefona.')
  })

  it('rejects a number that is too long', () => {
    expect(validatePhone('64123456789012')).toBe('Unesi ispravan broj telefona.')
  })

  it('rejects letters', () => {
    expect(validatePhone('abc')).toBe('Unesi ispravan broj telefona.')
  })

  it('rejects a foreign country code', () => {
    expect(validatePhone('+49301234567')).toBe('Unesi ispravan broj telefona.')
  })

  it('accepts a Bosnian number when +387 is selected', () => {
    expect(validatePhone('61123456', '+387')).toBe('')
    expect(validatePhone('061123456', '+387')).toBe('')
    expect(validatePhone('+38761123456')).toBe('')
  })

  it('accepts a 9-digit Bosnian mobile number (060 range)', () => {
    expect(validatePhone('603603835', '+387')).toBe('')
    expect(validatePhone('0603603835', '+387')).toBe('')
  })

  it('rejects Bosnian numbers that are too short or too long', () => {
    expect(validatePhone('12345', '+387')).toBe('Unesi ispravan broj telefona.')
    expect(validatePhone('6036038351', '+387')).toBe('Unesi ispravan broj telefona.')
  })
})

describe('normalizePhone', () => {
  it('uses +381 unless another calling code is given', () => {
    expect(normalizePhone('0641234567')).toBe('+381641234567')
    expect(normalizePhone('641234567')).toBe('+381641234567')
    expect(normalizePhone('061 123 456', '+387')).toBe('+38761123456')
  })

  it('keeps a number that already has its own + prefix', () => {
    expect(normalizePhone('+38761123456', '+381')).toBe('+38761123456')
  })

  it('returns an empty string for empty input', () => {
    expect(normalizePhone('  ', '+387')).toBe('')
  })
})

describe('validateEmail', () => {
  it('accepts a normal address', () => {
    expect(validateEmail('ana@example.com')).toBe('')
  })

  it('rejects an empty value and a malformed address', () => {
    expect(validateEmail('')).toBe('Unesi email adresu.')
    expect(validateEmail('ana@')).toBe('Unesi ispravnu email adresu.')
  })
})

describe('validatePassword', () => {
  it('requires 8+ characters with a letter and a number', () => {
    expect(validatePassword('')).toBe('Unesi lozinku.')
    expect(validatePassword('abc12')).toBe('Lozinka mora imati najmanje 8 karaktera.')
    expect(validatePassword('abcdefgh')).toBe('Lozinka mora sadržati bar jedno slovo i jedan broj.')
    expect(validatePassword('abcdefg1')).toBe('')
  })
})
