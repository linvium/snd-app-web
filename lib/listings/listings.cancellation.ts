import type { CancellationPolicy } from '@/types/listing'

export const CANCELLATION_COPY: Record<
  CancellationPolicy,
  { label: string; lines: string[] }
> = {
  flexible: {
    label: 'Fleksibilno',
    lines: [
      'Otkazivanje 2 dana pre početka: povraćaj 100%',
      'Otkazivanje 1 dan pre početka: povraćaj 50%',
      'Otkazivanje na dan početka: bez povraćaja',
    ],
  },
  medium: {
    label: 'Srednje',
    lines: [
      'Otkazivanje 7 dana pre početka: povraćaj 100%',
      'Otkazivanje 3 dana pre početka: povraćaj 50%',
      'Otkazivanje manje od 3 dana pre početka: bez povraćaja',
    ],
  },
  strict: {
    label: 'Strogo',
    lines: [
      'Otkazivanje 30 dana pre početka: povraćaj 100%',
      'Otkazivanje 14 dana pre početka: povraćaj 50%',
      'Otkazivanje manje od 14 dana pre početka: bez povraćaja',
    ],
  },
}
