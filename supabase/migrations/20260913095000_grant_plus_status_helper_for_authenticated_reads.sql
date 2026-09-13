-- The Plus status RPC is security-invoker and calls this private,
-- security-definer helper. Keep the helper schema private while allowing the
-- authenticated RPC caller to execute that dependency.
grant execute on function private.plus_active(uuid) to authenticated;
