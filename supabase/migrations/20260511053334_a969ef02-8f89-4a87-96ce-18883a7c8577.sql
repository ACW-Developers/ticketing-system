
-- Remove broad SELECT policy on storage.objects for event-posters
-- Public bucket flag still allows direct URL access; this prevents listing all files
DROP POLICY IF EXISTS "Public can view posters" ON storage.objects;

-- Lock down trigger functions (called by trigger system, no caller needs EXECUTE)
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role: needed by RLS policies; keep for authenticated only
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
