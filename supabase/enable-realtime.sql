-- Enable Realtime for appointments table
-- Run this in Supabase SQL Editor

-- First, check if realtime is enabled
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Add the appointments table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- If you need to remove it later:
-- ALTER PUBLICATION supabase_realtime DROP TABLE appointments;

-- Verify the table is in the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
