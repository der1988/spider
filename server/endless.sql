CREATE TABLE IF NOT EXISTS tamago_endless_runs (
  run_id uuid PRIMARY KEY,
  ordinal bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  catches integer NOT NULL CHECK (catches >= 0),
  replay_hash text NOT NULL CHECK (length(replay_hash) = 64),
  name text CHECK (name COLLATE "C" ~ '^[A-Z]{1,6}$'),
  skipped boolean NOT NULL DEFAULT false,
  CHECK (NOT skipped OR name IS NULL)
);

CREATE INDEX IF NOT EXISTS tamago_endless_rank
  ON tamago_endless_runs (catches DESC, ordinal) WHERE name IS NOT NULL;
