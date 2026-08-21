-- The later steps of the reservation need to say something in the thread.
--
-- The payment link in particular is a message, not a notification: the renter
-- was told "the link arrives in the chat", so the chat is where it lives.
-- `booking_paid` stays in the list for rows written before the rename.

alter table public.messages drop constraint if exists messages_type_check;

alter table public.messages
  add constraint messages_type_check check (
    (type)::text = any ((array[
      'text'::character varying,
      'system'::character varying,
      'system_booking_requested'::character varying,
      'booking_request'::character varying,
      'booking_accepted'::character varying,
      'booking_declined'::character varying,
      'booking_payment_link'::character varying,
      'booking_paid'::character varying,
      'booking_booked'::character varying,
      'booking_picked_up'::character varying,
      'booking_returned'::character varying,
      'booking_rated'::character varying,
      'booking_cancelled'::character varying,
      'review_request'::character varying
    ])::text[])
  );
