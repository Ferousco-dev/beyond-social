-- Baseline schema, owned by the Go service. Supabase supplies Postgres, Auth and
-- Storage; every table the product needs is created here.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
