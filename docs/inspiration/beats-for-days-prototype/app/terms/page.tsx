import type { Metadata } from 'next'
import { InfoPage } from '@/components/info-page'

export const metadata: Metadata = {
  title: 'Terms — Beats for Days',
  description: 'Preview notice and terms for Beats for Days.',
}

export default function TermsPage() {
  return (
    <InfoPage
      section="terms"
      description="Beats for Days is currently a preview. Audio, numbering, and availability may change as the series is developed."
      note="Final terms of use will be published before public release."
    />
  )
}
