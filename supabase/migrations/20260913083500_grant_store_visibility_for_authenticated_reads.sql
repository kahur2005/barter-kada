-- Store owner RPCs run as the authenticated caller and the stores RLS policy
-- evaluates private.store_public_visible(store_id). Keep the helper private,
-- but allow the authenticated role to execute the policy dependency.
grant execute on function private.store_public_visible(uuid) to authenticated;
