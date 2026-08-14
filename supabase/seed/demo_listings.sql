-- Demo data for working on the search page. NOT a migration — run it by hand
-- (Supabase SQL editor or psql) when you want something to look at, and undo
-- it with the block at the bottom.
--
-- Everything it creates is prefixed `demo_` so the cleanup can be exact.
-- Listings are attached to the first user in `public.users`; change the lookup
-- below if you want them under a different account.

do $$
declare
  owner_id uuid := (select id from public.users order by created_at limit 1);
  loc record;
  cat record;
  new_listing uuid;
  index integer := 0;
  locations jsonb := '[
    {"label":"demo_zvezdara","street":"Bulevar kralja Aleksandra 250","city":"Beograd","municipality":"Zvezdara","lat":44.8005,"lng":20.4900},
    {"label":"demo_novi_beograd","street":"Bulevar Mihajla Pupina 10","city":"Beograd","municipality":"Novi Beograd","lat":44.8200,"lng":20.4100},
    {"label":"demo_vracar","street":"Njegoševa 40","city":"Beograd","municipality":"Vračar","lat":44.7990,"lng":20.4700},
    {"label":"demo_zemun","street":"Glavna 20","city":"Beograd","municipality":"Zemun","lat":44.8430,"lng":20.4010},
    {"label":"demo_novi_sad","street":"Zmaj Jovina 5","city":"Novi Sad","municipality":"Stari grad","lat":45.2671,"lng":19.8335},
    {"label":"demo_nis","street":"Obrenovićeva 12","city":"Niš","municipality":"Medijana","lat":43.3209,"lng":21.8958}
  ]'::jsonb;
  items jsonb := '[
    {"cat":"busilice","title":"Bušilica Bosch GSB 13 RE","price":80000,"value":1500000,"loc":0,
     "desc":"Udarna bušilica za beton, ciglu i drvo. Dolazi sa koferom i setom burgija."},
    {"cat":"busilice","title":"Akumulatorski odvijač Makita","price":60000,"value":1200000,"loc":2,
     "desc":"Odvijač sa dve baterije i punjačem, idealan za montažu nameštaja."},
    {"cat":"brusilice","title":"Ugaona brusilica Bosch 125 mm","price":70000,"value":900000,"loc":0,
     "desc":"Brusilica sa dodatnim rezervnim diskovima za metal i keramiku."},
    {"cat":"skele-i-merdevine","title":"Aluminijumske merdevine 3 m","price":50000,"value":600000,"loc":3,
     "desc":"Stabilne merdevine za krečenje i radove na visini do tri metra."},
    {"cat":"rucni-alat","title":"Set ključeva i nasadnih alata","price":30000,"value":400000,"loc":2,
     "desc":"Komplet od 108 delova u koferu, sve što treba za sitnije popravke."},
    {"cat":"dron","title":"Dron DJI Mini 4 Pro","price":250000,"value":8000000,"loc":1,
     "desc":"Dron sa 4K kamerom, tri baterije i torbicom za nošenje u kompletu."},
    {"cat":"foto-i-video","title":"Canon EOS R6 sa objektivom","price":300000,"value":12000000,"loc":1,
     "desc":"Fotoaparat pun kadar sa 24-105 objektivom, dve baterije i karticom."},
    {"cat":"projektori","title":"Projektor Epson Full HD","price":150000,"value":5000000,"loc":2,
     "desc":"Projektor za kućni bioskop, sa platnom od dva metra i HDMI kablom."},
    {"cat":"zvuk","title":"Zvučnik JBL PartyBox 310","price":180000,"value":6000000,"loc":3,
     "desc":"Prenosni zvučnik sa mikrofonom, traje do šest sati na bateriju."},
    {"cat":"satori","title":"Šator za 4 osobe Coleman","price":120000,"value":2500000,"loc":4,
     "desc":"Porodični šator, vodootporan, postavlja se za pet minuta bez alata."},
    {"cat":"vrece-za-spavanje","title":"Vreća za spavanje do -10°C","price":40000,"value":800000,"loc":4,
     "desc":"Zimska vreća za spavanje, oprana i spremna, dolazi sa podmetačem."},
    {"cat":"bicikli","title":"Brdski bicikl Scott Aspect","price":90000,"value":7000000,"loc":0,
     "desc":"Bicikl veličine L, nedavno servisiran, sa bravom i pumpom."},
    {"cat":"skije-i-snoubord","title":"Skije Atomic 170 cm sa štapovima","price":110000,"value":4500000,"loc":3,
     "desc":"Skije sa vezovima, naoštrene i navoštene, spremne za sezonu."},
    {"cat":"kosacice","title":"Kosačica Husqvarna benzinska","price":130000,"value":5500000,"loc":5,
     "desc":"Samohodna kosačica sa korpom, radi besprekorno, gorivo nije uključeno."},
    {"cat":"rostilji","title":"Roštilj na ugalj sa poklopcem","price":45000,"value":700000,"loc":5,
     "desc":"Veliki roštilj za društvo do petnaest ljudi, sa priborom i rešetkama."},
    {"cat":"prikolice","title":"Auto prikolica 750 kg","price":200000,"value":9000000,"loc":3,
     "desc":"Prikolica sa ceradom i rezervnim točkom, registrovana do kraja godine."},
    {"cat":"satre-stolovi-stolice","title":"Šatra 3x6 m sa stolovima","price":250000,"value":8000000,"loc":5,
     "desc":"Šatra za proslave, dolazi sa četiri stola i dvadeset stolica."},
    {"cat":"gitare","title":"Električna gitara Fender sa pojačalom","price":140000,"value":6000000,"loc":2,
     "desc":"Gitara sa pojačalom od 30 vati, kablom i rezervnim setom žica."},
    {"cat":"usisivaci","title":"Parni čistač Kärcher","price":95000,"value":3000000,"loc":0,
     "desc":"Parni čistač za dubinsko pranje tepiha, nameštaja i pločica."},
    {"cat":"kolica","title":"Dečija kolica Cybex Balios","price":85000,"value":4000000,"loc":1,
     "desc":"Kolica sa nosiljkom i adapterima za auto sedište, temeljno očišćena."}
  ]'::jsonb;
  location_ids uuid[] := '{}';
  new_location uuid;
begin
  if owner_id is null then
    raise exception 'Nema nijednog korisnika u public.users — registruj se prvo.';
  end if;

  for loc in select value from jsonb_array_elements(locations) loop
    insert into public.locations (
      user_id, label, street, city, municipality, country_code,
      latitude, longitude, approx_latitude, approx_longitude
    )
    values (
      owner_id, loc.value ->> 'label', loc.value ->> 'street', loc.value ->> 'city',
      loc.value ->> 'municipality', 'RS',
      (loc.value ->> 'lat')::numeric, (loc.value ->> 'lng')::numeric,
      -- Demo coordinates are already approximate; real ones are blurred on save.
      (loc.value ->> 'lat')::numeric, (loc.value ->> 'lng')::numeric
    )
    returning id into new_location;

    location_ids := location_ids || new_location;
  end loop;

  for cat in select value from jsonb_array_elements(items) loop
    index := index + 1;

    insert into public.listings (
      owner_id, category_id, title, slug, description,
      price_1_day_minor, price_3_days_minor, price_7_days_minor,
      item_value_minor, cancellation_policy, status, published_at
    )
    values (
      owner_id,
      (select id from public.categories where slug = cat.value ->> 'cat'),
      cat.value ->> 'title',
      'demo-' || index || '-' || regexp_replace(lower(public.snd_unaccent(cat.value ->> 'title')), '[^a-z0-9]+', '-', 'g'),
      cat.value ->> 'desc',
      (cat.value ->> 'price')::bigint,
      -- Package prices must undercut the daily rate (doc 00 §3.6).
      ((cat.value ->> 'price')::bigint * 27) / 10,
      ((cat.value ->> 'price')::bigint * 60) / 10,
      (cat.value ->> 'value')::bigint,
      (array['flexible', 'medium', 'strict'])[1 + (index % 3)],
      'published',
      now() - (index || ' hours')::interval
    )
    returning id into new_listing;

    insert into public.listing_locations
    values (new_listing, location_ids[1 + (cat.value ->> 'loc')::int]);
  end loop;
end;
$$;

-- Undo:
--
-- delete from public.listing_locations
--   where listing_id in (select id from public.listings where slug like 'demo-%');
-- delete from public.listings where slug like 'demo-%';
-- delete from public.locations where label like 'demo\_%';
