REVOKE EXECUTE ON FUNCTION public.member_has_printer_model(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.member_has_printer_model(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.member_has_printer_model(uuid, uuid) TO authenticated;