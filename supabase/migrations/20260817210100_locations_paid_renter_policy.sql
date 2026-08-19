-- The exact address, unlocked by payment (doc 04 §9).
--
-- "Tačnu adresu dobijaš kada rezervacija bude plaćena i potvrđena" is a
-- row-level statement — *this* location becomes readable to *this* person — so
-- it belongs in RLS rather than in a function or an if-branch in the interface.
-- With this policy the renter's own ordinary `select * from locations` returns
-- the street and the exact coordinates, and everyone else's returns nothing.
--
-- Scoped to the location the booking actually names. An owner offering three
-- pickup points has not agreed to publish all three because one was booked.

drop policy if exists "locations: select for paid renter" on public.locations;

create policy "locations: select for paid renter" on public.locations
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.pickup_location_id = locations.id
        and b.renter_id = auth.uid()
        and b.status in ('paid', 'in_progress')
    )
  );
