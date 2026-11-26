CREATE TABLE IF NOT EXISTS tamago_scores (
  run_id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) = 5 AND name COLLATE "C" ~ '^[A-Z]{5}$'),
  catches integer NOT NULL CHECK (catches >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tamago_scores_rank
  ON tamago_scores (catches DESC, created_at, run_id);
