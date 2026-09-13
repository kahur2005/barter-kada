-- Public store discovery invokes private, security-definer helpers from a
-- security-invoker RPC. Keep the helpers in the private schema and expose
-- only their boolean/aggregate results to the two read roles.
grant execute on function private.store_public_visible(uuid), private.store_reputation_json(uuid) to anon, authenticated;
