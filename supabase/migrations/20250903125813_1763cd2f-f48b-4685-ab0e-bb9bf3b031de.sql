-- Move pgvector extension to the dedicated 'extensions' schema (recommended)
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;