DO $repair$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.manage_consignment(text,jsonb,uuid)'::regprocedure) INTO definition;
 definition := replace(definition, 'DECLARE p public.consignment_partners;', E'#variable_conflict use_variable\nDECLARE p public.consignment_partners;');
 definition := replace(definition, 'SELECT 1 FROM public.consignment_items WHERE shipment_id=sh.id AND qty>sold_qty+returned_qty+lost_qty', 'SELECT 1 FROM public.consignment_items ci WHERE ci.shipment_id=sh.id AND ci.qty>ci.sold_qty+ci.returned_qty+ci.lost_qty');
 definition := replace(definition, 'SELECT COALESCE(sum(amount),0) INTO paid FROM public.consignment_payments WHERE settlement_id=st.id', 'SELECT COALESCE(sum(cp.amount),0) INTO paid FROM public.consignment_payments cp WHERE cp.settlement_id=st.id');
 EXECUTE definition;
END $repair$;