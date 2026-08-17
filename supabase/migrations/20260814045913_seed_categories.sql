-- Starting category tree. Only leaves may carry a listing (doc 00 §3.6), and
-- nothing here is visible until something is published under it (doc 03 §11),
-- so seeding the whole tree up front is safe.
-- Re-runnable: matched on (parent, slug).
do $$
declare
  root record;
  child record;
  root_id uuid;
  root_index integer := 0;
  child_index integer;
  roots jsonb := '[
    {"slug":"alati","name":"Alati","icon":"wrench","children":[
      {"slug":"busilice","name":"Bušilice i odvijači"},
      {"slug":"brusilice","name":"Brusilice i testere"},
      {"slug":"merni-alat","name":"Merni alat"},
      {"slug":"skele-i-merdevine","name":"Skele i merdevine"},
      {"slug":"rucni-alat","name":"Ručni alat"}]},
    {"slug":"elektronika","name":"Elektronika","icon":"cpu","children":[
      {"slug":"dron","name":"Dronovi"},
      {"slug":"foto-i-video","name":"Foto i video oprema"},
      {"slug":"projektori","name":"Projektori i platna"},
      {"slug":"zvuk","name":"Zvučnici i ozvučenje"},
      {"slug":"racunari","name":"Računari i tableti"}]},
    {"slug":"kamperska-oprema","name":"Kamperska oprema","icon":"tent","children":[
      {"slug":"satori","name":"Šatori"},
      {"slug":"vrece-za-spavanje","name":"Vreće za spavanje"},
      {"slug":"oprema-za-kuvanje","name":"Rešoi i oprema za kuvanje"},
      {"slug":"ranci","name":"Rančevi"}]},
    {"slug":"sport","name":"Sport i rekreacija","icon":"bike","children":[
      {"slug":"bicikli","name":"Bicikli"},
      {"slug":"skije-i-snoubord","name":"Skije i snoubord"},
      {"slug":"vodeni-sportovi","name":"Oprema za vodene sportove"},
      {"slug":"fitnes","name":"Fitnes oprema"}]},
    {"slug":"basta-i-dvoriste","name":"Bašta i dvorište","icon":"sprout","children":[
      {"slug":"kosacice","name":"Kosačice i trimeri"},
      {"slug":"motokultivatori","name":"Motokultivatori"},
      {"slug":"rostilji","name":"Roštilji"},
      {"slug":"bazeni","name":"Bazeni i oprema"}]},
    {"slug":"vozila-i-prikolice","name":"Vozila i prikolice","icon":"truck","children":[
      {"slug":"prikolice","name":"Prikolice"},
      {"slug":"krovni-nosaci","name":"Krovni nosači i kutije"},
      {"slug":"auto-prikljucci","name":"Auto priključci"}]},
    {"slug":"dogadjaji","name":"Događaji i proslave","icon":"party-popper","children":[
      {"slug":"satre-stolovi-stolice","name":"Šatre, stolovi i stolice"},
      {"slug":"rasveta","name":"Rasveta i efekti"},
      {"slug":"dekoracija","name":"Dekoracija"}]},
    {"slug":"muzika","name":"Muzički instrumenti","icon":"music","children":[
      {"slug":"gitare","name":"Gitare i pojačala"},
      {"slug":"klavijature","name":"Klavijature"},
      {"slug":"bubnjevi","name":"Bubnjevi i perkusije"},
      {"slug":"studijska-oprema","name":"Studijska oprema"}]},
    {"slug":"kucni-aparati","name":"Kućni aparati","icon":"washing-machine","children":[
      {"slug":"usisivaci","name":"Usisivači i parni čistači"},
      {"slug":"masine-za-sivenje","name":"Mašine za šivenje"},
      {"slug":"kuhinjski-aparati","name":"Kuhinjski aparati"}]},
    {"slug":"decija-oprema","name":"Dečija oprema","icon":"baby","children":[
      {"slug":"kolica","name":"Kolica i nosiljke"},
      {"slug":"auto-sedista","name":"Auto sedišta"},
      {"slug":"igracke","name":"Igračke i mobilijar"}]},
    {"slug":"gradjevina","name":"Građevina","icon":"hard-hat","children":[
      {"slug":"mesalice","name":"Mešalice za beton"},
      {"slug":"vibro-ploce","name":"Vibro ploče i nabijači"},
      {"slug":"agregati","name":"Agregati i kompresori"}]},
    {"slug":"odeca-i-kostimi","name":"Odeća i kostimi","icon":"shirt","children":[
      {"slug":"svecana-odeca","name":"Svečana odeća"},
      {"slug":"kostimi","name":"Kostimi"},
      {"slug":"skijaska-odeca","name":"Skijaška odeća"}]}
  ]'::jsonb;
begin
  for root in select value from jsonb_array_elements(roots) loop
    root_index := root_index + 1;

    insert into public.categories (parent_id, name, slug, full_path, level, icon_name, sort_order)
    values (null, root.value ->> 'name', root.value ->> 'slug', root.value ->> 'name',
            0, root.value ->> 'icon', root_index * 10)
    on conflict do nothing;

    select id into root_id from public.categories
    where parent_id is null and slug = root.value ->> 'slug';

    child_index := 0;
    for child in select value from jsonb_array_elements(root.value -> 'children') loop
      child_index := child_index + 1;

      insert into public.categories (parent_id, name, slug, full_path, level, icon_name, sort_order)
      values (root_id, child.value ->> 'name', child.value ->> 'slug',
              (root.value ->> 'name') || ' › ' || (child.value ->> 'name'),
              1, root.value ->> 'icon', child_index * 10)
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;
