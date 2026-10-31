-- Profile photos and subject covers are optimised in the browser (WebP, <= 1600px), so a few
-- hundred KB is typical. The bucket enforces a hard ceiling and image-only types as a backstop.
update storage.buckets
   set file_size_limit = 2 * 1024 * 1024,
       allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/gif']
 where id = 'avatars';
