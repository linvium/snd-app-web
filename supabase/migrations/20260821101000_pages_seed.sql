-- The first set of editorial pages.
--
-- These are the pages the header, the item sheet and the publish flow already
-- linked to; until now each was a React file with one placeholder paragraph.
-- The copy here is the real thing, and from this point it is edited with an
-- update statement rather than a pull request.
--
-- Numbers in the copy (10% renter fee, 5% owner commission, the three
-- cancellation tables) mirror lib/pricing/pricing.config.ts and
-- lib/listings/listings.cancellation.ts. If a rate changes, both move together.

insert into public.pages (slug, category, title, summary, content, sort_order)
values
  (
    'how-it-works',
    'support',
    'Kako funkcioniše',
    'Vodič kroz iznajmljivanje i izdavanje na SND-u, korak po korak.',
    $html$
<p>SND povezuje ljude kojima nešto treba sa ljudima iz kraja koji to već imaju. Iznajmljivanje je jednostavno, plaćanje ide preko platforme, a svaka rezervacija je pokrivena garancijom.</p>

<h2>Iznajmljuješ (kao zakupac)</h2>
<ol>
  <li>
    <strong>Nađi stvar</strong>
    Pretraži po pojmu ili kategoriji i proveri kalendar oglasa da vidiš da li je predmet slobodan za tvoje datume.
  </li>
  <li>
    <strong>Pošalji zahtev</strong>
    Izaberi datume i pošalji zahtev vlasniku. Ako još nemaš nalog, tražićemo ti da ga napraviš. Zahtev u ovom koraku nije obavezujući i ništa se ne naplaćuje.
  </li>
  <li>
    <strong>Sačekaj odgovor</strong>
    Vlasnik pregleda zahtev i prihvata ga ili predlaže druge datume. Odgovor stiže na mejl i u tvoje zahteve na SND-u.
  </li>
  <li>
    <strong>Plati rezervaciju</strong>
    Kada je zahtev prihvaćen, dobijaš link za plaćanje karticom. Uz cenu najma naplaćuje se i naknada za uslugu.
  </li>
  <li>
    <strong>Potvrdi identitet</strong>
    Pre prve rezervacije proveravamo identitet. Kada verifikacija prođe, rezervacija je potvrđena i važe uslovi otkazivanja sa oglasa.
  </li>
  <li>
    <strong>Dogovori preuzimanje</strong>
    Tačno vreme i mesto preuzimanja i vraćanja dogovaraš direktno sa vlasnikom kroz poruke.
  </li>
  <li>
    <strong>Koristi i vrati</strong>
    Vrati predmet u dogovoreno vreme i u stanju u kojem si ga preuzeo, pa ostavite jedno drugom ocenu.
  </li>
</ol>

<h2>Izdaješ (kao vlasnik)</h2>
<ol>
  <li>
    <strong>Objavi stvar</strong>
    Dodaj fotografije, opis, cenu po danu i mesta predaje. Objavljivanje je besplatno.
  </li>
  <li>
    <strong>Odgovori na zahtev</strong>
    Kada stigne zahtev, prihvatiš ga, odbiješ ili predložiš druge datume. Brz odgovor podiže tvoj oglas u pretrazi.
  </li>
  <li>
    <strong>Predaj predmet</strong>
    Novac je već rezervisan pre preuzimanja, tako da predaješ stvar tek kada je rezervacija plaćena i potvrđena.
  </li>
  <li>
    <strong>Naplati se</strong>
    Posle vraćanja isplaćujemo ti zaradu umanjenu za proviziju platforme.
  </li>
</ol>

<h2>Koliko košta</h2>
<ul>
  <li>Objavljivanje oglasa je besplatno.</li>
  <li>Zakupac plaća naknadu za uslugu od 10% na cenu najma.</li>
  <li>Vlasniku se od isplate odbija provizija od 5%.</li>
</ul>
<p>Detaljno objašnjenje je na strani <a href="/support/payments-and-fees">Plaćanje i naknade</a>.</p>
    $html$,
    1
  ),
  (
    'guarantee',
    'support',
    'Garancija',
    'Svaka plaćena rezervacija je pokrivena do limita kategorije, bez učešća.',
    $html$
<p>Kada se predmet iznajmi preko SND-a, ne oslanjaš se na dogovor sa nepoznatom osobom. Svaka plaćena i potvrđena rezervacija nosi garanciju platforme.</p>

<h2>Šta je pokriveno</h2>
<ul>
  <li>Oštećenje predmeta tokom trajanja rezervacije.</li>
  <li>Predmet koji nije vraćen.</li>
  <li>Krađa predmeta prijavljena policiji.</li>
</ul>

<h2>Šta nije pokriveno</h2>
<ul>
  <li>Uobičajeno habanje od normalne upotrebe.</li>
  <li>Oštećenje nastalo van perioda rezervacije.</li>
  <li>Dogovori i predaja mimo platforme — ako rezervacija nije plaćena kroz SND, garancija ne postoji.</li>
  <li>Izmakla zarada, kazne i troškovi koji nisu vrednost samog predmeta.</li>
</ul>

<h2>Do kog iznosa</h2>
<p>Limit zavisi od kategorije predmeta i piše na svakom oglasu. Iznos koji bismo isplatili nikada nije veći od stvarne vrednosti predmeta — limit kategorije je gornja granica, ne obećanje isplate.</p>
<p>Učešća nema. Ako je šteta priznata, isplaćuje se ceo iznos do limita.</p>

<h2>Kako se prijavljuje šteta</h2>
<ol>
  <li>Javi drugoj strani kroz poruke na SND-u čim primetiš problem, najkasnije 24 sata po vraćanju.</li>
  <li>Pošalji nam fotografije predmeta i kratak opis šta se desilo.</li>
  <li>Za krađu priloži i prijavu policiji.</li>
  <li>Odgovaramo u roku od dva radna dana i tražimo dodatne podatke samo ako nedostaju.</li>
</ol>
<p>Prijavu šalješ preko strane <a href="/support/contact">Kontakt</a>.</p>
    $html$,
    2
  ),
  (
    'cancellation-policy',
    'support',
    'Pravila otkazivanja',
    'Tri politike otkazivanja, šta znače za povraćaj novca i ko ih bira.',
    $html$
<p>Politiku otkazivanja bira vlasnik predmeta i ona piše na svakom oglasu, pre nego što pošalješ zahtev. Pravila počinju da važe onog trenutka kada je rezervacija plaćena i potvrđena — zahtev koji još nije plaćen možeš povući bez posledica.</p>

<h2>Fleksibilno</h2>
<ul>
  <li>Otkazivanje 2 dana pre početka: povraćaj 100%</li>
  <li>Otkazivanje 1 dan pre početka: povraćaj 50%</li>
  <li>Otkazivanje na dan početka: bez povraćaja</li>
</ul>

<h2>Srednje</h2>
<ul>
  <li>Otkazivanje 7 dana pre početka: povraćaj 100%</li>
  <li>Otkazivanje 3 dana pre početka: povraćaj 50%</li>
  <li>Otkazivanje manje od 3 dana pre početka: bez povraćaja</li>
</ul>

<h2>Strogo</h2>
<ul>
  <li>Otkazivanje 30 dana pre početka: povraćaj 100%</li>
  <li>Otkazivanje 14 dana pre početka: povraćaj 50%</li>
  <li>Otkazivanje manje od 14 dana pre početka: bez povraćaja</li>
</ul>

<h2>Kada vlasnik otkaže</h2>
<p>Ako vlasnik otkaže potvrđenu rezervaciju, zakupac dobija pun povraćaj bez obzira na politiku, uključujući naknadu za uslugu. Otkazivanja od strane vlasnika utiču na vidljivost njegovih oglasa u pretrazi.</p>

<h2>Povraćaj novca</h2>
<p>Povraćaj ide na istu karticu sa koje je plaćeno. Banci obično treba od tri do pet radnih dana da iznos prikaže na izvodu.</p>
    $html$,
    3
  ),
  (
    'payments-and-fees',
    'support',
    'Plaćanje i naknade',
    'Kako se plaća, šta se naplaćuje i kada vlasnik dobija novac.',
    $html$
<h2>Kako se plaća</h2>
<p>Plaća se karticom kroz SND, tek pošto vlasnik prihvati zahtev. Dobijaš link za plaćanje na mejl i u svoje zahteve. Dok rezervacija nije plaćena, ništa nije rezervisano — kalendar se zaključava tek posle uplate.</p>
<p>Plaćanje mimo platforme nije dozvoljeno i ostavlja obe strane bez garancije, bez pravila otkazivanja i bez podrške.</p>

<h2>Šta se naplaćuje</h2>
<ul>
  <li><strong>Cena najma</strong> — iznos koji je vlasnik odredio za izabrane datume. Ako je paket od tri ili sedam dana povoljniji, sistem sam obračunava jeftiniju kombinaciju.</li>
  <li><strong>Naknada za uslugu</strong> — 10% na cenu najma, plaća zakupac i vidi je u pregledu pre plaćanja.</li>
  <li><strong>Provizija platforme</strong> — 5%, odbija se vlasniku od isplate.</li>
</ul>

<h2>Kada vlasnik dobija novac</h2>
<p>Isplata se pokreće nakon što je predmet vraćen i rezervacija zatvorena. Novac stiže na račun koji si uneo u podešavanjima naloga.</p>

<h2>Računi</h2>
<p>Potvrdu o plaćanju šaljemo na mejl odmah po uspešnoj transakciji. Ako ti treba dokument sa podacima firme, javi nam se preko strane <a href="/support/contact">Kontakt</a>.</p>
    $html$,
    4
  ),
  (
    'pickup-and-return',
    'support',
    'Gde se predaje',
    'Kako funkcionišu mesta predaje i zašto se tačna adresa ne vidi odmah.',
    $html$
<p>Mesto predaje je tačka na mapi koju vlasnik postavlja na oglasu. Predmet se preuzima i vraća tu, u vreme koje dogovorite kroz poruke.</p>

<h2>Adresa je privatna dok se ne plati</h2>
<p>Dok rezervacija nije plaćena i potvrđena, drugi korisnici vide samo približnu lokaciju — krug oko adrese, dovoljno da procene koliko im je daleko. Tačna adresa se otkriva zakupcu tek kada je rezervacija potvrđena.</p>

<h2>Više mesta predaje</h2>
<p>Možeš označiti više mesta ako predmet predaješ i kod kuće i, recimo, na poslu. Zakupac pri slanju zahteva bira ono koje mu odgovara.</p>

<h2>Predaja i vraćanje</h2>
<ul>
  <li>Zajedno pogledajte predmet pri predaji i pri vraćanju.</li>
  <li>Fotografišite stanje predmeta — to je najbrži način da se svaka kasnija nedoumica reši.</li>
  <li>Sve dogovore držite u porukama na SND-u; to je zapis na koji se podrška može osloniti.</li>
</ul>
    $html$,
    5
  ),
  (
    'verification',
    'support',
    'Verifikacija naloga',
    'Zašto tražimo dokument, šta se proverava i koliko traje.',
    $html$
<p>Pre prve rezervacije proveravamo identitet obe strane. To je razlog zašto ljudi na SND-u predaju svoje stvari nepoznatim ljudima bez neprijatnog osećaja.</p>

<h2>Šta je potrebno</h2>
<ul>
  <li>Važeći lični dokument sa fotografijom (lična karta ili pasoš).</li>
  <li>Selfi, koji se automatski upoređuje sa fotografijom na dokumentu.</li>
</ul>

<h2>Koliko traje</h2>
<p>Provera je automatska i najčešće se završi za nekoliko minuta. Ako je potrebna ručna provera, javljamo se u roku od jednog radnog dana.</p>

<h2>Šta se čuva</h2>
<p>Proveru radi specijalizovani partner. Mi čuvamo samo rezultat provere i osnovne podatke o identitetu — fotografija dokumenta se ne čuva na SND-u. Detalji su u <a href="/legal/privacy">Politici privatnosti</a>.</p>
    $html$,
    6
  ),
  (
    'faq',
    'support',
    'Česta pitanja',
    'Kratki odgovori na pitanja koja najčešće dobijamo.',
    $html$
<h2>Da li je objavljivanje oglasa besplatno?</h2>
<p>Jeste. Naplaćuje se samo uspešna rezervacija: zakupcu naknada za uslugu od 10%, vlasniku provizija od 5% pri isplati.</p>

<h2>Da li je zahtev obavezujući?</h2>
<p>Nije. Slanjem zahteva ništa se ne naplaćuje i ništa se ne rezerviše. Obaveza nastaje tek plaćanjem, kada počinju da važe i <a href="/support/cancellation-policy">pravila otkazivanja</a>.</p>

<h2>Šta ako vlasnik ne odgovori?</h2>
<p>Zahtev ističe sam od sebe i ne naplaćuje se ništa. Slobodno pošalji zahtev za više sličnih predmeta.</p>

<h2>Šta ako se predmet ošteti?</h2>
<p>Prijavi štetu u roku od 24 sata po vraćanju. Rezervacija je pokrivena <a href="/support/guarantee">garancijom</a> do limita kategorije, bez učešća.</p>

<h2>Mogu li da se dogovorim mimo platforme?</h2>
<p>Ne preporučujemo. Bez plaćanja kroz SND nema ni garancije, ni pravila otkazivanja, ni podrške ako nešto pođe naopako.</p>

<h2>Kada vidim tačnu adresu?</h2>
<p>Kada je rezervacija plaćena i potvrđena. Do tada se vidi samo približna lokacija — više o tome na strani <a href="/support/pickup-and-return">Gde se predaje</a>.</p>

<h2>Kako da otkažem rezervaciju?</h2>
<p>Otkazuješ je iz svojih zahteva. Koliko se novca vraća zavisi od politike sa oglasa i od toga koliko je ostalo do početka.</p>

<h2>Kako da obrišem nalog?</h2>
<p>Javi nam se preko strane <a href="/support/contact">Kontakt</a>. Nalog sa rezervacijom u toku brišemo tek kada se ona završi.</p>
    $html$,
    7
  ),
  (
    'contact',
    'support',
    'Kontakt',
    'Kako da nas dobiješ i koliko brzo odgovaramo.',
    $html$
<p>Ako ti nešto nije jasno ili je nešto pošlo naopako, javi nam se. Kada pišeš o konkretnoj rezervaciji, dodaj njen broj — odgovor stiže brže.</p>

<h2>Podrška</h2>
<ul>
  <li>Mejl: <a href="mailto:podrska@snd.rs">podrska@snd.rs</a></li>
  <li>Radnim danima od 9 do 17, odgovaramo u roku od jednog radnog dana.</li>
</ul>

<h2>Prijava štete</h2>
<p>Za oštećen, nevraćen ili ukraden predmet piši na <a href="mailto:podrska@snd.rs">podrska@snd.rs</a> u roku od 24 sata po vraćanju i priloži fotografije. Postupak je opisan na strani <a href="/support/guarantee">Garancija</a>.</p>

<h2>Prijava oglasa ili korisnika</h2>
<p>Oglas koji krši pravila prijavi sa same strane oglasa ili nam piši. Prijave proveravamo istog radnog dana.</p>
    $html$,
    8
  ),
  (
    'terms',
    'legal',
    'Uslovi korišćenja',
    'Pravila koja važe za svakoga ko koristi SND.',
    $html$
<p>Korišćenjem SND-a prihvataš ove uslove. SND je platforma koja povezuje vlasnike predmeta i zakupce; ugovor o najmu se zaključuje između njih, a mi obezbeđujemo platformu, naplatu i garanciju pod ovde opisanim uslovima.</p>

<h2>Nalog</h2>
<ul>
  <li>Nalog može otvoriti punoletno lice sa tačnim podacima.</li>
  <li>Pre prve rezervacije obavezna je <a href="/support/verification">verifikacija identiteta</a>.</li>
  <li>Za sve što se dešava sa tvog naloga odgovoran si ti.</li>
</ul>

<h2>Oglasi</h2>
<ul>
  <li>Objavljuješ samo predmete koji su tvoje vlasništvo i koje smeš da izdaješ.</li>
  <li>Opis, fotografije i stanje predmeta moraju biti tačni.</li>
  <li>Zabranjeni su oružje, lekovi, živa bića i sve što je zakonom zabranjeno.</li>
</ul>

<h2>Rezervacije i plaćanje</h2>
<ul>
  <li>Rezervacija je obavezujuća od trenutka plaćanja.</li>
  <li>Sva plaćanja idu kroz platformu. Zaobilaženje naplate je razlog za gašenje naloga.</li>
  <li>Otkazivanje i povraćaj uređeni su <a href="/support/cancellation-policy">pravilima otkazivanja</a>.</li>
</ul>

<h2>Odgovornost</h2>
<p>Zakupac vraća predmet u stanju u kojem ga je preuzeo, uz uobičajeno habanje. Šteta i nevraćanje rešavaju se kroz <a href="/support/guarantee">garanciju</a>, do limita kategorije.</p>

<h2>Gašenje naloga</h2>
<p>Nalog koji krši ove uslove možemo privremeno ograničiti ili ugasiti. Rezervacije koje su u toku u tom trenutku sprovodimo do kraja gde god je to moguće.</p>

<h2>Izmene</h2>
<p>O izmenama uslova obaveštavamo mejlom najmanje 15 dana unapred. Datum poslednje izmene je naveden na vrhu ove strane.</p>
    $html$,
    1
  ),
  (
    'privacy',
    'legal',
    'Politika privatnosti',
    'Koje podatke prikupljamo, zašto i koliko dugo ih čuvamo.',
    $html$
<p>Ova politika objašnjava kako SND obrađuje lične podatke korisnika, u skladu sa Zakonom o zaštiti podataka o ličnosti.</p>

<h2>Koje podatke prikupljamo</h2>
<ul>
  <li><strong>Podaci naloga</strong> — ime, mejl, broj telefona, fotografija profila.</li>
  <li><strong>Verifikacija</strong> — rezultat provere identiteta i osnovni podaci sa dokumenta. Fotografiju dokumenta obrađuje naš partner za verifikaciju i ona se ne čuva na SND-u.</li>
  <li><strong>Oglasi i rezervacije</strong> — sadržaj oglasa, adrese mesta predaje, poruke i istorija rezervacija.</li>
  <li><strong>Plaćanja</strong> — iznosi i status transakcije. Podatke o kartici obrađuje provajder plaćanja; mi ih ne vidimo i ne čuvamo.</li>
</ul>

<h2>Zašto ih obrađujemo</h2>
<ul>
  <li>Da bi platforma radila: pretraga, rezervacije, poruke, naplata i isplate.</li>
  <li>Radi bezbednosti: sprečavanje prevara i rešavanje prijava štete.</li>
  <li>Radi zakonskih obaveza, pre svega računovodstvenih.</li>
</ul>

<h2>Šta vide drugi korisnici</h2>
<p>Ime, fotografija profila, ocene i tvoji oglasi su javni. Tačna adresa mesta predaje se otkriva tek kada je rezervacija plaćena i potvrđena — do tada se vidi samo približna lokacija. Mejl i broj telefona nikada nisu javni.</p>

<h2>Koliko dugo čuvamo</h2>
<p>Podatke naloga čuvamo dok nalog postoji. Podatke o rezervacijama i plaćanjima čuvamo onoliko koliko nalažu poreski propisi, i posle brisanja naloga.</p>

<h2>Tvoja prava</h2>
<p>Imaš pravo na uvid, ispravku, brisanje i prenosivost svojih podataka, kao i na prigovor. Zahtev šalješ na <a href="mailto:privatnost@snd.rs">privatnost@snd.rs</a>; odgovaramo u roku od 30 dana.</p>

<h2>Kolačići</h2>
<p>Koristimo kolačiće neophodne za prijavu i rad sajta, i kolačiće za merenje posećenosti. Neophodne kolačiće nije moguće isključiti jer bez njih prijava ne radi.</p>
    $html$,
    2
  )
on conflict (slug) do nothing;
