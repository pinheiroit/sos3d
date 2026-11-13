DO $repair$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.manage_consignment(text,jsonb,uuid)'::regprocedure) INTO definition;
 definition:=replace(definition, 'JOIN public.consignment_shipments sh ON sh.id=i.shipment_id WHERE sh.partner_id=p.id', 'JOIN public.consignment_shipments joined_shipment ON joined_shipment.id=i.shipment_id WHERE joined_shipment.partner_id=p.id');
 EXECUTE definition;
END $repair$;