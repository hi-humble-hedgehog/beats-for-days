import type { Metadata } from 'next'
import { InfoPage } from '@/components/info-page'

export const metadata: Metadata = {
  title: 'About — Beats for Days',
  description: 'An infinite instrumental series. Unreleased. Unnamed. Unending.',
}

export default function AboutPage() {
  return (
    <InfoPage
      section="about"
      description="Beats for Days is an infinite instrumental series. Let one beat play, then move to the next—no names, no tracklist."
      note="Unreleased. Unnamed. Unending."
    />
  )
}
