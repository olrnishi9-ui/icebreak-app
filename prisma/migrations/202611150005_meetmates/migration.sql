BEGIN;
ALTER TABLE events ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN interest_tags text[] NOT NULL DEFAULT ARRAY['AI','Finance','Energy','Sustainability','M&A','Technology','Design','Research'];
ALTER TABLE event_participants
 ADD COLUMN role varchar(120) NOT NULL DEFAULT '',
 ADD COLUMN organization varchar(160) NOT NULL DEFAULT '',
 ADD COLUMN industry varchar(160) NOT NULL DEFAULT '',
 ADD COLUMN introduction varchar(500) NOT NULL DEFAULT '',
 ADD COLUMN photo text NOT NULL DEFAULT '',
 ADD COLUMN networking_goals text[] NOT NULL DEFAULT '{}',
 ADD COLUMN profile_saved boolean NOT NULL DEFAULT false,
 ADD COLUMN checked_in_at timestamptz(6),
 ADD COLUMN qr_token varchar(64) UNIQUE,
 ADD CONSTRAINT qr_token_format CHECK(qr_token IS NULL OR qr_token ~ '^[0-9a-f]{64}$'),
 ADD CONSTRAINT profile_photo_size CHECK(octet_length(photo)<=180000);
-- Existing own-row SELECT policies cover the additions; browser writes remain revoked.
-- Tokens stay private in the membership row; only the trusted event-scoped API resolves them.
ALTER TABLE users ALTER COLUMN is_guest SET DEFAULT false;
COMMIT;
