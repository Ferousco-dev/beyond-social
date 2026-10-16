alter table public.profiles
  add column phone text not null default '' check (char_length(phone) <= 40),
  add column business_name text not null default '' check (char_length(business_name) <= 120),
  add column industry text not null default '' check (char_length(industry) <= 80);