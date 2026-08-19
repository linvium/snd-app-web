import { NextResponse } from 'next/server'

/**
 * The single error shape every endpoint returns (doc 00 §2.4). Having one
 * helper is what keeps it single — a hand-rolled `{ message }` somewhere is
 * how these things drift.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  UPLOAD_TOO_LARGE: 'UPLOAD_TOO_LARGE',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>
) {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status })
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function apiList<T>(data: T[], meta: Record<string, unknown>, cacheSeconds = 0) {
  return NextResponse.json(
    { data, meta },
    {
      headers: cacheSeconds
        ? {
            // Private: results carry is_favorite and "Tvoj oglas", which are
            // per-user. A shared cache would hand one user another's flags.
            'Cache-Control': `private, max-age=${cacheSeconds}`,
          }
        : undefined,
    }
  )
}
