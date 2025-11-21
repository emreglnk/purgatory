-- Fix object types with proper merge for duplicates
-- Run this in Supabase SQL Editor

-- Step 1: Fix collection_reputation with merge
-- First, merge duplicate entries (0x and non-0x versions)
DO $$
DECLARE
    rec RECORD;
    normalized_type TEXT;
BEGIN
    -- Loop through all non-0x entries
    FOR rec IN 
        SELECT * FROM collection_reputation 
        WHERE object_type NOT LIKE '0x%' 
        AND object_type != 'Unknown'
    LOOP
        normalized_type := '0x' || rec.object_type;
        
        -- Check if normalized version exists
        IF EXISTS (SELECT 1 FROM collection_reputation WHERE object_type = normalized_type) THEN
            -- Merge: Add counts to existing entry
            UPDATE collection_reputation
            SET 
                junk_count = junk_count + rec.junk_count,
                spam_count = spam_count + rec.spam_count,
                malicious_count = malicious_count + rec.malicious_count,
                total_reports = total_reports + rec.total_reports,
                -- Keep earliest first_reported_at
                first_reported_at = LEAST(first_reported_at, rec.first_reported_at),
                -- Keep latest last_reported_at
                last_reported_at = GREATEST(last_reported_at, rec.last_reported_at),
                updated_at = NOW()
            WHERE object_type = normalized_type;
            
            -- Delete the old non-0x entry
            DELETE FROM collection_reputation WHERE object_type = rec.object_type;
            
            RAISE NOTICE 'Merged: % into %', rec.object_type, normalized_type;
        ELSE
            -- No duplicate, just update
            UPDATE collection_reputation
            SET object_type = normalized_type
            WHERE object_type = rec.object_type;
            
            RAISE NOTICE 'Updated: % to %', rec.object_type, normalized_type;
        END IF;
    END LOOP;
END $$;

-- Step 2: Update purgatory_items (no duplicates expected here)
UPDATE purgatory_items
SET object_type = '0x' || object_type
WHERE object_type NOT LIKE '0x%'
  AND object_type != 'Unknown';

-- Step 3: Update disposal_reports (no duplicates expected here)
UPDATE disposal_reports
SET object_type = '0x' || object_type
WHERE object_type NOT LIKE '0x%'
  AND object_type != 'Unknown';

-- Step 4: Recalculate reputation scores after merge
UPDATE collection_reputation
SET reputation_score = CASE 
    WHEN (junk_count + spam_count + malicious_count) = 0 THEN 100.0
    ELSE 100.0 - (
        (junk_count * 1.0 + spam_count * 5.0 + malicious_count * 20.0) / 
        ((junk_count + spam_count + malicious_count) * 20.0) * 100.0
    )
END
WHERE object_type LIKE '0x%';

-- Step 5: Verification
SELECT 
  'collection_reputation' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN object_type LIKE '0x%' THEN 1 END) as records_with_0x,
  COUNT(CASE WHEN object_type NOT LIKE '0x%' AND object_type != 'Unknown' THEN 1 END) as records_without_0x
FROM collection_reputation
UNION ALL
SELECT 
  'purgatory_items',
  COUNT(*),
  COUNT(CASE WHEN object_type LIKE '0x%' THEN 1 END),
  COUNT(CASE WHEN object_type NOT LIKE '0x%' AND object_type != 'Unknown' THEN 1 END)
FROM purgatory_items
UNION ALL
SELECT 
  'disposal_reports',
  COUNT(*),
  COUNT(CASE WHEN object_type LIKE '0x%' THEN 1 END),
  COUNT(CASE WHEN object_type NOT LIKE '0x%' AND object_type != 'Unknown' THEN 1 END)
FROM disposal_reports;

-- Show merged collection reputation
SELECT 
  object_type,
  junk_count,
  spam_count,
  malicious_count,
  total_reports,
  reputation_score,
  last_reported_at
FROM collection_reputation
ORDER BY last_reported_at DESC;

