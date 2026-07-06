-- Expression index for case-insensitive company filtering.
-- Run manually after 0006_job_os_pivot.sql (same convention as 0004_pre/post files).
-- Supports lower(company) lookups used by the match queue and jobs list.

CREATE INDEX IF NOT EXISTS job_company_lower_idx ON job (lower(company));
