-- Help and legal copy for the platform as it now works.
--
-- Three things changed and every page that mentioned them is rewritten:
--   * there is no guarantee and SND does not compensate damage;
--   * renting is not paid through SND - no link, no service fee, no commission,
--     no payout; the renter pays the owner directly;
--   * owners pay for listing, by subscription or with credits.
--
-- "Plaćanje i naknade" described a fee model that no longer exists, so it is
-- replaced by "Cenovnik" rather than edited in place.

delete from public.pages where slug = 'payments-and-fees';

insert into public.pages (slug, category, title, summary, content, sort_order)
values (
  'plans-and-credits',
  'support',
  'Cenovnik',
  'Iznajmljivanje je besplatno - plaća se samo objavljivanje oglasa, pretplatom ili kreditima.',
  $html$
<p>SND ne naplaćuje iznajmljivanje. Plaća se samo objavljivanje oglasa, na jedan od dva načina: mesečnom pretplatom ili kreditima. Aktuelne cene paketa su na strani <a href="/pricing">Pretplata i krediti</a>.</p>

<h2>Pretplata</h2>
<ul>
  <li>Pretplata traje mesec dana i obnavlja se automatski dok je ne otkažeš.</li>
  <li>Svaki paket ima ograničen broj oglasa koji mogu biti objavljeni u isto vreme. Arhiviran oglas ne zauzima mesto, pa ga možeš zameniti drugim.</li>
  <li>Otkazana pretplata važi do kraja plaćenog perioda. Posle toga se oglasi preko limita arhiviraju i vraćaju se čim ponovo imaš slobodno mesto.</li>
</ul>

<h2>Krediti</h2>
<ul>
  <li>Jedan kredit je jedan oglas. Kredit se troši kada oglas objaviš, a oglas zatim ostaje otključan - možeš ga arhivirati i ponovo objaviti bez novog kredita.</li>
  <li>Krediti ne ističu.</li>
  <li>Što veći paket kupiš, kredit je jeftiniji.</li>
</ul>

<h2>Šta se prvo troši</h2>
<p>Ako imaš i pretplatu i kredite, novi oglas prvo zauzima slobodno mesto iz pretplate. Kredit se troši tek kada su sva mesta popunjena.</p>

<h2>Plaćanje i potvrde</h2>
<p>Plaća se karticom preko sigurne stranice provajdera - podaci o kartici ne prolaze kroz SND. Potvrdu šaljemo na mejl odmah posle uplate. Ako ti treba dokument sa podacima firme, javi nam se preko strane <a href="/support/contact">Kontakt</a>.</p>
  $html$,
  4
)
on conflict (slug) do update set
  category = excluded.category,
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  sort_order = excluded.sort_order,
  is_published = true;

update public.pages
   set summary = 'Vodič kroz iznajmljivanje i izdavanje na SND-u, korak po korak.',
       content = $html$
<p>SND povezuje ljude kojima nešto treba sa ljudima iz kraja koji to već imaju. Zakupac i vlasnik se dogovaraju kroz poruke, a cenu najma zakupac plaća direktno vlasniku - SND ne naplaćuje iznajmljivanje.</p>

<h2>Iznajmljuješ (kao zakupac)</h2>
<ol>
  <li>
    <strong>Nađi stvar</strong>
    Pretraži po pojmu ili kategoriji i proveri kalendar oglasa da vidiš da li je predmet slobodan za tvoje datume.
  </li>
  <li>
    <strong>Pošalji zahtev</strong>
    Izaberi datume i pošalji zahtev vlasniku. Ako još nemaš nalog, tražićemo ti da ga napraviš. Zahtev nije obavezujući i ništa se ne naplaćuje.
  </li>
  <li>
    <strong>Potvrdi identitet</strong>
    Pre prve rezervacije proveravamo identitet, da bi obe strane znale s kim se dogovaraju.
  </li>
  <li>
    <strong>Sačekaj potvrdu</strong>
    Vlasnik prihvata zahtev, odbija ga ili predlaže druge datume. Kada prihvati, termin je rezervisan i važe uslovi otkazivanja sa oglasa.
  </li>
  <li>
    <strong>Dogovori preuzimanje i plaćanje</strong>
    Tačno vreme i mesto preuzimanja, kao i način plaćanja cene najma, dogovaraš direktno sa vlasnikom kroz poruke.
  </li>
  <li>
    <strong>Koristi i vrati</strong>
    Vrati predmet u dogovoreno vreme i u stanju u kojem si ga preuzeo, pa ostavite jedno drugom ocenu.
  </li>
</ol>

<h2>Izdaješ (kao vlasnik)</h2>
<ol>
  <li>
    <strong>Izaberi pretplatu ili kupi kredite</strong>
    Oglas se objavljuje uz mesečnu pretplatu, koja pokriva određen broj objavljenih oglasa, ili uz kredit - jedan kredit je jedan oglas. Detalji su na strani <a href="/support/plans-and-credits">Cenovnik</a>.
  </li>
  <li>
    <strong>Objavi stvar</strong>
    Dodaj fotografije, opis, cenu po danu i mesta predaje.
  </li>
  <li>
    <strong>Odgovori na zahtev</strong>
    Prihvatiš ga, odbiješ ili predložiš druge datume. Prihvatanjem je termin rezervisan. Brz odgovor podiže tvoj oglas u pretrazi.
  </li>
  <li>
    <strong>Predaj predmet</strong>
    Sa zakupcem dogovori predaju i plaćanje. Zajedno pogledajte i fotografišite stanje predmeta pri predaji i pri vraćanju.
  </li>
</ol>

<h2>Koliko košta</h2>
<ul>
  <li>Iznajmljivanje se ne naplaćuje - ni zakupcu ni vlasniku.</li>
  <li>Cenu najma zakupac plaća direktno vlasniku.</li>
  <li>Vlasnik plaća objavljivanje oglasa, pretplatom ili kreditima.</li>
</ul>
$html$
 where slug = 'how-it-works';

update public.pages
   set summary = 'Tri politike otkazivanja i šta znače kada je termin rezervisan.',
       content = $html$
<p>Politiku otkazivanja bira vlasnik predmeta i ona piše na svakom oglasu, pre nego što pošalješ zahtev. Pravila počinju da važe kada vlasnik prihvati zahtev i termin postane rezervisan - zahtev na koji još nije odgovoreno možeš povući bez posledica.</p>
<p>SND ne naplaćuje najam, pa ni povraćaj ne ide preko platforme. Procenti ispod govore koliko od onoga što je zakupac unapred platio vlasniku treba da mu bude vraćeno. Vlasnik i zakupac to izmiruju direktno.</p>

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
<p>Ako vlasnik otkaže rezervisan termin, zakupcu vraća sve što mu je unapred plaćeno, bez obzira na politiku. Otkazivanja od strane vlasnika utiču na vidljivost njegovih oglasa u pretrazi.</p>
$html$
 where slug = 'cancellation-policy';

update public.pages
   set content = $html$
<p>Mesto predaje je tačka na mapi koju vlasnik postavlja na oglasu. Predmet se preuzima i vraća tu, u vreme koje dogovorite kroz poruke.</p>

<h2>Adresa je privatna dok vlasnik ne potvrdi</h2>
<p>Dok vlasnik ne prihvati zahtev, drugi korisnici vide samo približnu lokaciju - krug oko adrese, dovoljno da procene koliko im je daleko. Tačna adresa se otkriva zakupcu kada je termin rezervisan.</p>

<h2>Više mesta predaje</h2>
<p>Možeš označiti više mesta ako predmet predaješ i kod kuće i, recimo, na poslu. Zakupac pri slanju zahteva bira ono koje mu odgovara.</p>

<h2>Predaja i vraćanje</h2>
<ul>
  <li>Zajedno pogledajte predmet pri predaji i pri vraćanju.</li>
  <li>Fotografišite stanje predmeta - to je najbrži način da se svaka kasnija nedoumica reši.</li>
  <li>Sve dogovore, uključujući plaćanje najma, držite u porukama na SND-u; to je zapis na koji se obe strane mogu osloniti.</li>
</ul>
$html$
 where slug = 'pickup-and-return';

update public.pages
   set content = $html$
<h2>Koliko košta korišćenje SND-a?</h2>
<p>Iznajmljivanje se ne naplaćuje. Vlasnik plaća samo objavljivanje oglasa, pretplatom ili kreditima - više na strani <a href="/support/plans-and-credits">Cenovnik</a>. Cenu najma zakupac plaća direktno vlasniku.</p>

<h2>Da li je zahtev obavezujući?</h2>
<p>Nije. Slanjem zahteva ništa se ne naplaćuje. Termin je rezervisan tek kada vlasnik prihvati zahtev, i od tada važe <a href="/support/cancellation-policy">pravila otkazivanja</a>.</p>

<h2>Šta ako vlasnik ne odgovori?</h2>
<p>Zahtev ističe sam od sebe. Slobodno pošalji zahtev za više sličnih predmeta.</p>

<h2>Kako se plaća najam?</h2>
<p>Direktno vlasniku, kako se dogovorite kroz poruke - gotovinom pri preuzimanju, uplatom na račun ili drugačije. SND ne posreduje u plaćanju najma.</p>

<h2>Šta ako se predmet ošteti?</h2>
<p>Stanje predmeta i eventualnu štetu rešavaju vlasnik i zakupac međusobno - SND ne nadoknađuje štetu. Zato zajedno pogledajte i fotografišite predmet pri predaji i pri vraćanju, i sve dogovore držite u porukama.</p>

<h2>Kada vidim tačnu adresu?</h2>
<p>Kada vlasnik prihvati zahtev i termin postane rezervisan. Do tada se vidi samo približna lokacija - više o tome na strani <a href="/support/pickup-and-return">Gde se predaje</a>.</p>

<h2>Kako da otkažem rezervaciju?</h2>
<p>Javi se vlasniku kroz poruke. Šta se vraća od unapred plaćenog zavisi od politike sa oglasa i od toga koliko je ostalo do početka.</p>

<h2>Kako da obrišem nalog?</h2>
<p>Javi nam se preko strane <a href="/support/contact">Kontakt</a>. Nalog sa rezervacijom u toku brišemo tek kada se ona završi.</p>
$html$
 where slug = 'faq';

update public.pages
   set content = $html$
<p>Ako ti nešto nije jasno ili je nešto pošlo naopako, javi nam se. Kada pišeš o konkretnoj rezervaciji, dodaj njen broj - odgovor stiže brže.</p>

<h2>Podrška</h2>
<ul>
  <li>Mejl: <a href="mailto:podrska@snd.rs">podrska@snd.rs</a></li>
  <li>Radnim danima od 9 do 17, odgovaramo u roku od jednog radnog dana.</li>
</ul>

<h2>Problem sa iznajmljivanjem</h2>
<p>Ako predmet nije vraćen ili se vlasnik i zakupac ne slažu oko njegovog stanja, prvo pokušajte da se dogovorite kroz poruke na SND-u. Ako to ne uspe, piši na <a href="mailto:podrska@snd.rs">podrska@snd.rs</a> sa brojem rezervacije i fotografijama - pomoći ćemo oko komunikacije i proveriti nalog druge strane.</p>

<h2>Pretplata i krediti</h2>
<p>Za pitanja o uplati, pretplati ili kreditima piši na isti mejl i navedi adresu sa kojom si prijavljen.</p>

<h2>Prijava oglasa ili korisnika</h2>
<p>Oglas koji krši pravila prijavi sa same strane oglasa ili nam piši. Prijave proveravamo istog radnog dana.</p>
$html$
 where slug = 'contact';

update public.pages
   set content = $html$
<p>Korišćenjem SND-a prihvataš ove uslove. SND je platforma koja povezuje vlasnike predmeta i zakupce. Ugovor o najmu se zaključuje direktno između njih - SND ne učestvuje u plaćanju najma i nije strana u tom ugovoru.</p>

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
  <li>Objavljivanje oglasa se plaća pretplatom ili kreditima, pod uslovima sa strane <a href="/support/plans-and-credits">Cenovnik</a>.</li>
</ul>

<h2>Rezervacije</h2>
<ul>
  <li>Rezervacija nastaje kada vlasnik prihvati zahtev.</li>
  <li>Cenu najma, način plaćanja i eventualni depozit vlasnik i zakupac dogovaraju direktno.</li>
  <li>Otkazivanje je uređeno <a href="/support/cancellation-policy">pravilima otkazivanja</a> sa oglasa.</li>
</ul>

<h2>Odgovornost</h2>
<p>Zakupac vraća predmet u stanju u kojem ga je preuzeo, uz uobičajeno habanje, i za štetu i nevraćanje odgovara vlasniku. SND ne odgovara za stanje, upotrebu ni vraćanje predmeta i ne nadoknađuje štetu.</p>

<h2>Gašenje naloga</h2>
<p>Nalog koji krši ove uslove možemo privremeno ograničiti ili ugasiti. Rezervacije koje su u toku u tom trenutku sprovodimo do kraja gde god je to moguće.</p>

<h2>Izmene</h2>
<p>O izmenama uslova obaveštavamo mejlom najmanje 15 dana unapred. Datum poslednje izmene je naveden na vrhu ove strane.</p>
$html$,
       published_at = now()
 where slug = 'terms';

update public.pages
   set content = $html$
<p>Ova politika objašnjava kako SND obrađuje lične podatke korisnika, u skladu sa Zakonom o zaštiti podataka o ličnosti.</p>

<h2>Koje podatke prikupljamo</h2>
<ul>
  <li><strong>Podaci naloga</strong> - ime, mejl, broj telefona, fotografija profila.</li>
  <li><strong>Verifikacija</strong> - rezultat provere identiteta i osnovni podaci sa dokumenta. Fotografiju dokumenta obrađuje naš partner za verifikaciju i ona se ne čuva na SND-u.</li>
  <li><strong>Oglasi i rezervacije</strong> - sadržaj oglasa, adrese mesta predaje, poruke i istorija rezervacija.</li>
  <li><strong>Pretplate i krediti</strong> - iznosi i status uplata. Podatke o kartici obrađuje provajder plaćanja; mi ih ne vidimo i ne čuvamo.</li>
</ul>

<h2>Zašto ih obrađujemo</h2>
<ul>
  <li>Da bi platforma radila: pretraga, rezervacije, poruke, pretplate i krediti.</li>
  <li>Radi bezbednosti: sprečavanje prevara i rešavanje prijava.</li>
  <li>Radi zakonskih obaveza, pre svega računovodstvenih.</li>
</ul>

<h2>Šta vide drugi korisnici</h2>
<p>Ime, fotografija profila, ocene i tvoji oglasi su javni. Tačna adresa mesta predaje se otkriva zakupcu tek kada vlasnik prihvati zahtev - do tada se vidi samo približna lokacija. Mejl i broj telefona nikada nisu javni.</p>

<h2>Koliko dugo čuvamo</h2>
<p>Podatke naloga čuvamo dok nalog postoji. Podatke o rezervacijama i uplatama čuvamo onoliko koliko nalažu poreski propisi, i posle brisanja naloga.</p>

<h2>Tvoja prava</h2>
<p>Imaš pravo na uvid, ispravku, brisanje i prenosivost svojih podataka, kao i na prigovor. Zahtev šalješ na <a href="mailto:privatnost@snd.rs">privatnost@snd.rs</a>; odgovaramo u roku od 30 dana.</p>

<h2>Kolačići</h2>
<p>Koristimo kolačiće neophodne za prijavu i rad sajta, i kolačiće za merenje posećenosti. Neophodne kolačiće nije moguće isključiti jer bez njih prijava ne radi.</p>
$html$,
       published_at = now()
 where slug = 'privacy';
