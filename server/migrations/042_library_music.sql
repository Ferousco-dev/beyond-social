-- Music joins the library as its own kind, so people can bring background
-- tracks they hold the rights to and pick them in the editor.
alter table public.library_assets drop constraint library_assets_kind_check;
alter table public.library_assets add constraint library_assets_kind_check
  check (kind in ('face', 'voice', 'product', 'environment', 'music', 'other'));
