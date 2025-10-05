-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to update legal content daily at midnight IST (6:30 PM UTC previous day)
SELECT cron.schedule(
  'update-legal-content-daily',
  '30 18 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://xnyfckmyvhrikikhzdvy.supabase.co/functions/v1/update-legal-content',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhueWZja215dmhyaWtpa2h6ZHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDIwMjEsImV4cCI6MjA3MDgxODAyMX0.STJ7335PoE7q62eZeiScxVj94o8tzqggjsGwQfY7owg"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Add comment to explain the cron job
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - Used to schedule daily legal content updates';
