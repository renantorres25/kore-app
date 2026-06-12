ALTER TABLE perfis ADD COLUMN IF NOT EXISTS avatar_url text;

UPDATE perfis p
SET avatar_url = sc.athlete_photo
FROM strava_connections sc
WHERE sc.usuario_id = p.id
AND sc.athlete_photo IS NOT NULL
AND p.avatar_url IS NULL;
