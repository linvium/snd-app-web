export interface Testimonial {
  id: string
  quote: string
  authorName: string
  authorRole: string
  /** Seed for deterministic avatar generation */
  avatarSeed: string
}
