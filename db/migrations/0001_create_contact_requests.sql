-- Project requests submitted through the site's contact form.
-- The columns hold the canonical format defined in lib/contact.ts (ContactRequest);
-- the checks below repeat its rules so nothing else can write a row in another shape.

create table contact_requests (
  id         bigint generated always as identity primary key,
  reference  text        not null unique,  -- shown to the visitor, e.g. REQ-MB3K2XA9F4T
  name       text        not null check (char_length(name) between 2 and 100),
  email      text        not null check (email = lower(email) and char_length(email) <= 254),
  phone      text        not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),  -- E.164, e.g. +919876543210
  country    char(2)     not null check (country ~ '^[A-Z]{2}$'),          -- ISO 3166-1 alpha-2 of the chosen prefix; ZZ = other
  message    text        check (char_length(message) between 1 and 2000),  -- null when the brief was left empty
  created_at timestamptz not null default now()
);

create index contact_requests_created_at_idx on contact_requests (created_at desc);
create index contact_requests_email_idx on contact_requests (email);
