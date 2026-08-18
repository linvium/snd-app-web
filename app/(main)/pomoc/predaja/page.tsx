export const metadata = {
  title: 'Gde se predaje',
}

export default function PickupHelpPage() {
  return (
    <article className="mx-auto max-w-[720px] px-4 py-10">
      <h1 className="mt-0 mb-3 text-2xl font-semibold text-foreground">Gde se predaje</h1>
      <p className="mb-3 text-[15px] leading-6 text-muted-foreground">
        Tačna adresa ostaje privatna dok rezervacija nije plaćena i potvrđena. Drugi korisnici vide samo
        približnu lokaciju na mapi.
      </p>
      <p className="m-0 text-[15px] leading-6 text-muted-foreground">
        Možeš označiti više mesta predaje ako predmet predaješ i kod kuće i, recimo, na poslu. Detaljno
        objašnjenje stiže uskoro.
      </p>
    </article>
  )
}
