-- Re-run the reversal self-tests after making the invoice trigger portable
-- (no NEW.invoice_type reference). Confirms issue -> void still restores stock
-- and batches exactly once on this database.
DO $$
DECLARE test_result JSONB;
BEGIN
  SELECT public.self_test_inventory_reversal() INTO test_result;
  IF (test_result ? 'skipped') THEN
    RAISE NOTICE 'Verify reversal dilewati: %', test_result;
  ELSIF NOT (test_result->>'issue_ok')::BOOLEAN
     OR NOT (test_result->>'void_balance_ok')::BOOLEAN
     OR NOT (test_result->>'void_batch_ok')::BOOLEAN
     OR NOT (test_result->>'single_return_ok')::BOOLEAN THEN
    RAISE EXCEPTION 'Verify reversal gagal: %', test_result;
  ELSE
    RAISE NOTICE 'Verify reversal lulus: %', test_result;
  END IF;

  SELECT public.self_test_duplicate_lines_reversal() INTO test_result;
  IF (test_result ? 'skipped') THEN
    RAISE NOTICE 'Verify duplicate lines dilewati: %', test_result;
  ELSIF NOT (test_result->>'issue_ok')::BOOLEAN
     OR NOT (test_result->>'restore_balance_ok')::BOOLEAN
     OR NOT (test_result->>'restore_batch_ok')::BOOLEAN
     OR NOT (test_result->>'second_restore_noop_ok')::BOOLEAN THEN
    RAISE EXCEPTION 'Verify duplicate lines gagal: %', test_result;
  ELSE
    RAISE NOTICE 'Verify duplicate lines lulus: %', test_result;
  END IF;
END $$;
