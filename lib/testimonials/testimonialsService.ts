import type { Testimonial } from './types'

const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote:
      'Preko Stvar na Dan sam iznajmila projektor za vikend — brzo, jeftino i bez komplikacija. Tačno ono što mi je trebalo.',
    authorName: 'Milica Jovanović',
    authorRole: 'Organizator događaja, Beograd',
    avatarSeed: 'milica-jovanovic',
  },
  {
    id: '2',
    quote:
      'Imam alat koji koristim retko, pa ga iznajmljujem drugima. Dodatni prihod, a stvar ne stoji u podrumu.',
    authorName: 'Nikola Petrović',
    authorRole: 'Majstor, Novi Sad',
    avatarSeed: 'nikola-petrovic',
  },
  {
    id: '3',
    quote:
      'Za dečiji rođendan smo uzeli skokanu baštu na dan. Preuzimanje je bilo jednostavno, a deca oduševljena.',
    authorName: 'Ana Stojanović',
    authorRole: 'Mama dvoje, Niš',
    avatarSeed: 'ana-stojanovic',
  },
  {
    id: '4',
    quote:
      'Kao student, ne mogu da kupim sve što mi zatreba. Ovde nađem kameru, šator, pa čak i bicikl — za razuman novac.',
    authorName: 'Luka Marković',
    authorRole: 'Student, Kragujevac',
    avatarSeed: 'luka-markovic',
  },
  {
    id: '5',
    quote:
      'Platforma je jasna i pouzdana. Dogovorim se sa vlasnikom, preuzmem stvar i vratim — bez stresa.',
    authorName: 'Jelena Ilić',
    authorRole: 'Dizajnerka, Beograd',
    avatarSeed: 'jelena-ilic',
  },
  {
    id: '6',
    quote:
      'Iznajmio sam bušilicu za renoviranje stana umesto da kupujem novu. Ušteda i manje otpada — win-win.',
    authorName: 'Stefan Đorđević',
    authorRole: 'Inženjer, Subotica',
    avatarSeed: 'stefan-djordjevic',
  },
]

function avatarUrlForSeed(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(seed)}&size=96`
}

export const testimonialsService = {
  list(): Testimonial[] {
    return MOCK_TESTIMONIALS
  },

  getRandom(): Testimonial {
    const list = MOCK_TESTIMONIALS
    const index = Math.floor(Math.random() * list.length)
    return list[index]!
  },

  getAvatarUrl(testimonial: Testimonial): string {
    return avatarUrlForSeed(testimonial.avatarSeed)
  },
}
