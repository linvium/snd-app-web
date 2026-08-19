'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useAuthSession } from '@/context/AuthContext'
import { useReportReview } from '@/hooks/reviews'
import {
  REVIEW_REPORT_REASON_LABELS,
  REVIEW_REPORT_REASONS,
  type ReviewReportReason,
} from '@/types/listing-detail'

/** The report form behind "Prijavi" (doc 04 §11.2). */
export default function ReportReviewDialog({
  reviewId,
  open,
  onOpenChange,
}: {
  reviewId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuthSession()
  const report = useReportReview()
  const [reason, setReason] = useState<ReviewReportReason>('offensive')
  const [details, setDetails] = useState('')

  const submit = () => {
    if (!reviewId) return

    report.mutate(
      { reviewId, reason, details },
      {
        onSuccess: () => {
          // Never states whether it was already reported — the reporter has no
          // use for that and telling them apart only invites retrying.
          toast.success('Prijava je poslata. Hvala što si nam javio.')
          onOpenChange(false)
          setDetails('')
          setReason('offensive')
        },
        onError: () => {
          toast.error('Nismo mogli da pošaljemo prijavu. Pokušaj ponovo.')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prijavi recenziju</DialogTitle>
          <DialogDescription>
            {user
              ? 'Reci nam šta nije u redu. Pregledaćemo prijavu u najkraćem roku.'
              : 'Prijavi se da bi prijavio recenziju.'}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <>
            <RadioGroup
              value={reason}
              onValueChange={(value) => setReason(value as ReviewReportReason)}
              className="gap-2"
            >
              {REVIEW_REPORT_REASONS.map((value) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={`report-${value}`} />
                  <Label htmlFor={`report-${value}`} className="font-normal">
                    {REVIEW_REPORT_REASON_LABELS[value]}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div>
              <Label htmlFor="report-details">Detalji (nije obavezno)</Label>
              <Textarea
                id="report-details"
                value={details}
                maxLength={1000}
                rows={3}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Opiši ukratko u čemu je problem."
              />
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Odustani
              </Button>
              <Button onClick={submit} disabled={report.isPending}>
                {report.isPending ? 'Šaljem…' : 'Pošalji prijavu'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Zatvori
            </Button>
            <Button asChild>
              <a href="/auth/login">Prijavi se</a>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
