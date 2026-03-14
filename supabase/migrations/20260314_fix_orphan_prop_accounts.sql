-- Fix prop_accounts rows created without user_id (from AddAccountModal before fix)
-- Sets user_id by looking up the parent account's user_id
UPDATE prop_accounts pa
SET user_id = a.user_id
FROM accounts a
WHERE pa.account_id = a.id
AND pa.user_id IS NULL;
