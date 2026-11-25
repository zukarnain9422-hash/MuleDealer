-- MuleDealer initial case-submission schema.
-- Store only the information required to arrange an initial consultation.
CREATE TABLE IF NOT EXISTS case_submissions (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  consultation_mode TEXT NOT NULL,
  preferred_slot TEXT NOT NULL,
  summary TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'reviewing', 'contacted', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_submissions_created_at
  ON case_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_submissions_status
  ON case_submissions(status);
