-- Fix object types to include 0x prefix
-- Run this in Supabase SQL Editor to fix existing records

-- Update purgatory_items
UPDATE purgatory_items
SET object_type = '0x' || object_type
WHERE object_type NOT LIKE '0x%'
  AND object_type != 'Unknown';

-- Update disposal_reports
UPDATE disposal_reports
SET object_type = '0x' || object_type
WHERE object_type NOT LIKE '0x%'
  AND object_type != 'Unknown';

-- Update collection_reputation
UPDATE collection_reputation
SET object_type = '0x' || object_type
WHERE object_type NOT LIKE '0x%'
  AND object_type != 'Unknown';

-- Verify the fix
SELECT 
  'purgatory_items' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN object_type LIKE '0x%' THEN 1 END) as records_with_0x
FROM purgatory_items
UNION ALL
SELECT 
  'disposal_reports',
  COUNT(*),
  COUNT(CASE WHEN object_type LIKE '0x%' THEN 1 END)
FROM disposal_reports
UNION ALL
SELECT 
  'collection_reputation',
  COUNT(*),
  COUNT(CASE WHEN object_type LIKE '0x%' THEN 1 END)
FROM collection_reputation;

