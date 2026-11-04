-- =====================================================================
-- Site-wide branding (CI): names, theme colours, logo/favicon, landing &
-- login texts/images, contact links. Single row; public read, admin write.
-- =====================================================================

create table public.site_settings (
  id boolean primary key default true check (id),           -- enforces a single row
  name_th text not null check (char_length(name_th) between 1 and 80),
  name_en text not null default '' check (char_length(name_en) <= 80),
  short_name text not null check (char_length(short_name) between 1 and 40),
  tagline text not null default '' check (char_length(tagline) <= 160),

  primary_color text not null default '#e11d2a' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text not null default '#ffc400' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_url text check (logo_url is null or logo_url ~* '^https://'),
  favicon_url text check (favicon_url is null or favicon_url ~* '^https://'),

  hero_badge text not null default '' check (char_length(hero_badge) <= 120),
  hero_title_before text not null default '' check (char_length(hero_title_before) <= 80),
  hero_title_highlight text not null default '' check (char_length(hero_title_highlight) <= 60),
  hero_title_after text not null default '' check (char_length(hero_title_after) <= 80),
  hero_description text not null default '' check (char_length(hero_description) <= 400),
  hero_image_url text check (hero_image_url is null or hero_image_url ~* '^https://'),

  auth_quote text not null default '' check (char_length(auth_quote) <= 160),
  auth_quote_sub text not null default '' check (char_length(auth_quote_sub) <= 240),
  auth_image_url text check (auth_image_url is null or auth_image_url ~* '^https://'),

  footer_text text not null default '' check (char_length(footer_text) <= 200),
  contact_phone text check (char_length(contact_phone) <= 30),
  contact_email text check (char_length(contact_email) <= 120),
  contact_line_id text check (char_length(contact_line_id) <= 60),
  contact_line_url text check (contact_line_url is null or contact_line_url ~* '^https://'),
  contact_facebook_url text check (contact_facebook_url is null or contact_facebook_url ~* '^https://'),
  contact_address text check (char_length(contact_address) <= 300),
  contact_map_url text check (contact_map_url is null or contact_map_url ~* '^https://'),

  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create or replace function public.touch_site_settings()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.id := true;
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end $$;
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_site_settings();
revoke execute on function public.touch_site_settings() from public, anon, authenticated;

alter table public.site_settings enable row level security;
create policy "site_settings: public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings: admin update" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- no insert/delete policies: the single row is created here and never removed

insert into public.site_settings (
  name_th, name_en, short_name, tagline,
  hero_badge, hero_title_before, hero_title_highlight, hero_title_after, hero_description,
  auth_quote, auth_quote_sub, footer_text
) values (
  'ติวเตอร์มอร์ อะคาเดมี', 'Tutor More Academy', 'ติวเตอร์มอร์',
  'สถาบันกวดวิชาวิศวกรรม สำหรับนักศึกษา มทส.',
  'สถาบันกวดวิชาวิศวกรรม สำหรับนักศึกษา มทส.', 'ติววิศวะให้', 'เข้าใจจริง', 'สอบผ่านอย่างมั่นใจ',
  'สถิตยศาสตร์ แคลคูลัส ฟิสิกส์ และอีกมากมาย สอนโดยรุ่นพี่วิศวะ มทส. ที่เคยผ่านมาก่อน ดูบทเรียนย้อนหลังได้ทุกที่ทุกเวลา',
  'ผลลัพธ์ที่ดี คือสิ่งที่พี่มุ่งหวัง', 'ประสบการณ์การสอนที่ผ่านมาเป็นประกัน ติวแบบเห็นภาพ เข้าใจจริง ไม่ใช่แค่จำ',
  'ใกล้มหาวิทยาลัยเทคโนโลยีสุรนารี นครราชสีมา'
);

-- Branding images (logo, favicon, hero, login): public bucket, admin-only writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2 * 1024 * 1024,
        array['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'])
on conflict (id) do nothing;

create policy "branding: admin upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'branding' and public.is_admin());
create policy "branding: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'branding' and public.is_admin());
create policy "branding: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'branding' and public.is_admin());
