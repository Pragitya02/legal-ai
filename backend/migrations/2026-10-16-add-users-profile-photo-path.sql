-- Live profile photo support.
-- Stores a private Supabase Storage reference, e.g.
--   supabase://profile-photos/12/<uuid>.jpg
-- Used by both citizens and advocates (both are rows in `users`).
--
-- The backend also runs this automatically on startup
-- (ensureProfilePhotoColumn in backend/database/userModel.js), so running
-- it by hand is only needed if the database user used by the app is not
-- allowed to ALTER TABLE.

ALTER TABLE users
    ADD COLUMN profile_photo_path VARCHAR(512) NULL;
