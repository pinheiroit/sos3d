CREATE TABLE public.consignment_partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_key text NOT NULL UNIQUE, customer_id uuid REFERENCES public.customers(id), user_id uuid REFERENCES public.profiles(id), enabled boolean NOT NULL DEFAULT false, blocked boolean NOT NULL DEFAULT false, limit_value numeric(14,2) NOT NULL DEFAULT 0, limit_qty integer NOT NULL DEFAULT 0, payment_days integer NOT NULL DEFAULT 7, closing_period text NOT NULL DEFAULT 'mensal', terms jsonb NOT NULL DEFAULT '{}', prices jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), CHECK(customer_id IS NOT NULL OR user_id IS NOT NULL), CHECK(limit_value >= 0 AND limit_qty >= 0 AND payment_days BETWEEN 0 AND 365)
);
GRANT ALL ON public.consignment_partners TO service_role;
ALTER TABLE public.consignment_partners ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consignment_shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number bigint GENERATED ALWAYS AS IDENTITY UNIQUE, partner_id uuid NOT NULL REFERENCES public.consignment_partners(id), status text NOT NULL DEFAULT 'preparacao', notes text NOT NULL DEFAULT '', created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), dispatched_at timestamptz, received_at timestamptz, CHECK(status IN ('preparacao','separacao','em_transito','recebida','encerrada','cancelada'))
);
GRANT ALL ON public.consignment_shipments TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.consignment_shipments_number_seq TO service_role;
ALTER TABLE public.consignment_shipments ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consignment_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), shipment_id uuid NOT NULL REFERENCES public.consignment_shipments(id), product_id uuid NOT NULL REFERENCES public.products(id), product_name text NOT NULL, qty integer NOT NULL, supply_price numeric(14,2) NOT NULL, suggested_price numeric(14,2) NOT NULL DEFAULT 0, lot text NOT NULL DEFAULT '', serial text NOT NULL DEFAULT '', sold_qty integer NOT NULL DEFAULT 0, returned_qty integer NOT NULL DEFAULT 0, lost_qty integer NOT NULL DEFAULT 0, CHECK(qty > 0 AND supply_price > 0 AND suggested_price >= 0), CHECK(sold_qty >= 0 AND returned_qty >= 0 AND lost_qty >= 0 AND sold_qty + returned_qty + lost_qty <= qty)
);
GRANT ALL ON public.consignment_items TO service_role;
ALTER TABLE public.consignment_items ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consignment_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number bigint GENERATED ALWAYS AS IDENTITY UNIQUE, partner_id uuid NOT NULL REFERENCES public.consignment_partners(id), mode text NOT NULL, period_start date, period_end date, total numeric(14,2) NOT NULL, due_date date NOT NULL, cancelled_at timestamptz, cancellation_reason text NOT NULL DEFAULT '', external_id text, sync_status text NOT NULL DEFAULT 'aguardando_conexao', sync_error text NOT NULL DEFAULT '', created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(mode IN ('parcial','periodico','integral')), CHECK(total > 0)
);
GRANT ALL ON public.consignment_settlements TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.consignment_settlements_number_seq TO service_role;
ALTER TABLE public.consignment_settlements ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consignment_sales (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), item_id uuid NOT NULL REFERENCES public.consignment_items(id), qty integer NOT NULL, supply_price numeric(14,2) NOT NULL, sold_on date NOT NULL DEFAULT CURRENT_DATE, mode text NOT NULL DEFAULT 'individual', notes text NOT NULL DEFAULT '', settlement_id uuid REFERENCES public.consignment_settlements(id), created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(qty > 0 AND supply_price > 0), CHECK(mode IN ('individual','consolidada','perda'))
);
GRANT ALL ON public.consignment_sales TO service_role;
ALTER TABLE public.consignment_sales ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consignment_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), settlement_id uuid NOT NULL REFERENCES public.consignment_settlements(id), amount numeric(14,2) NOT NULL CHECK(amount > 0), paid_on date NOT NULL DEFAULT CURRENT_DATE, method text NOT NULL, notes text NOT NULL DEFAULT '', external_id text, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.consignment_payments TO service_role;
ALTER TABLE public.consignment_payments ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consignment_returns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), item_id uuid NOT NULL REFERENCES public.consignment_items(id), qty integer NOT NULL CHECK(qty > 0), condition text NOT NULL, status text NOT NULL DEFAULT 'solicitada', reason text NOT NULL, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), received_at timestamptz, CHECK(condition IN ('integro','embalagem_danificada','avariado','incorreto')), CHECK(status IN ('solicitada','autorizada','em_transito','recebida','rejeitada'))
);
GRANT ALL ON public.consignment_returns TO service_role;
ALTER TABLE public.consignment_returns ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consignment_inventories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), item_id uuid NOT NULL REFERENCES public.consignment_items(id), expected_qty integer NOT NULL, physical_qty integer NOT NULL CHECK(physical_qty >= 0), reason text NOT NULL, decision text NOT NULL DEFAULT 'pendente', created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), resolved_by uuid, resolved_at timestamptz, CHECK(decision IN ('pendente','sem_ajuste','perda_sem_cobranca','perda_com_cobranca'))
);
GRANT ALL ON public.consignment_inventories TO service_role;
ALTER TABLE public.consignment_inventories ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consignment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES public.consignment_partners(id), action text NOT NULL, entity_id uuid, details jsonb NOT NULL DEFAULT '{}', actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.consignment_events TO service_role;
ALTER TABLE public.consignment_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX consignment_items_shipment_idx ON public.consignment_items(shipment_id);
CREATE INDEX consignment_sales_item_idx ON public.consignment_sales(item_id);
CREATE INDEX consignment_sales_settlement_idx ON public.consignment_sales(settlement_id);
CREATE INDEX consignment_shipments_partner_idx ON public.consignment_shipments(partner_id);
CREATE INDEX consignment_payments_settlement_idx ON public.consignment_payments(settlement_id);
CREATE OR REPLACE FUNCTION public.manage_consignment(_action text, _data jsonb, _actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.consignment_partners; sh public.consignment_shipments; item public.consignment_items; st public.consignment_settlements; rt public.consignment_returns; inv public.consignment_inventories; row jsonb; new_id uuid; partner uuid; qty integer; balance integer; amount numeric; exposure numeric; units integer; paid numeric; admin boolean; target_status text; sale_count integer;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='admin') INTO admin;
 IF NOT admin AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='seller') THEN RAISE EXCEPTION 'Acesso restrito à equipe.'; END IF;
 IF _action IN ('partner','settle','payment','cancel_settlement','return_status','inventory_resolve') AND NOT admin THEN RAISE EXCEPTION 'Ação restrita ao administrador.'; END IF;
 IF _action='partner' THEN
  IF (_data->>'userId') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(_data->>'userId')::uuid) THEN RAISE EXCEPTION 'Cliente não encontrado.'; END IF;
  IF (_data->>'customerId') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customers WHERE id=(_data->>'customerId')::uuid) THEN RAISE EXCEPTION 'Cliente não encontrado.'; END IF;
  INSERT INTO public.consignment_partners(customer_key,customer_id,user_id,enabled,blocked,limit_value,limit_qty,payment_days,closing_period,terms,prices)
  VALUES(_data->>'key',(_data->>'customerId')::uuid,(_data->>'userId')::uuid,(_data->>'enabled')::boolean,(_data->>'blocked')::boolean,(_data->>'limitValue')::numeric,(_data->>'limitQty')::integer,(_data->>'paymentDays')::integer,_data->>'closingPeriod',COALESCE(_data->'terms','{}'),COALESCE(_data->'prices','{}'))
  ON CONFLICT(customer_key) DO UPDATE SET enabled=EXCLUDED.enabled,blocked=EXCLUDED.blocked,limit_value=EXCLUDED.limit_value,limit_qty=EXCLUDED.limit_qty,payment_days=EXCLUDED.payment_days,closing_period=EXCLUDED.closing_period,terms=EXCLUDED.terms,prices=EXCLUDED.prices,updated_at=now() RETURNING * INTO p;
  partner:=p.id; new_id:=p.id;
 ELSIF _action='shipment' THEN
  SELECT * INTO p FROM public.consignment_partners WHERE id=(_data->>'partnerId')::uuid FOR UPDATE;
  IF p.id IS NULL OR NOT p.enabled OR p.blocked THEN RAISE EXCEPTION 'Cliente não habilitado ou bloqueado para consignação.'; END IF;
  IF jsonb_array_length(_data->'items')=0 THEN RAISE EXCEPTION 'Adicione produtos.'; END IF;
  INSERT INTO public.consignment_shipments(partner_id,notes,created_by) VALUES(p.id,COALESCE(_data->>'notes',''),_actor) RETURNING * INTO sh;
  FOR row IN SELECT value FROM jsonb_array_elements(_data->'items') LOOP
   IF NOT EXISTS(SELECT 1 FROM public.products WHERE id=(row->>'productId')::uuid AND active) THEN RAISE EXCEPTION 'Produto indisponível.'; END IF;
   INSERT INTO public.consignment_items(shipment_id,product_id,product_name,qty,supply_price,suggested_price,lot,serial)
   SELECT sh.id,id,name,(row->>'qty')::integer,(row->>'price')::numeric,COALESCE((row->>'suggestedPrice')::numeric,0),COALESCE(row->>'lot',''),COALESCE(row->>'serial','') FROM public.products WHERE id=(row->>'productId')::uuid;
  END LOOP;
  partner:=p.id; new_id:=sh.id;
 ELSIF _action='shipment_status' THEN
  SELECT * INTO sh FROM public.consignment_shipments WHERE id=(_data->>'id')::uuid FOR UPDATE;
  IF sh.id IS NULL THEN RAISE EXCEPTION 'Remessa não encontrada.'; END IF;
  SELECT * INTO p FROM public.consignment_partners WHERE id=sh.partner_id FOR UPDATE;
  target_status:=_data->>'status';
  IF target_status='separacao' AND sh.status='preparacao' THEN NULL;
  ELSIF target_status='em_transito' AND sh.status='separacao' THEN
   IF NOT p.enabled OR p.blocked THEN RAISE EXCEPTION 'Parceiro não habilitado ou bloqueado.'; END IF;
   SELECT COALESCE(sum((i.qty-i.sold_qty-i.returned_qty-i.lost_qty)*i.supply_price),0),COALESCE(sum(i.qty-i.sold_qty-i.returned_qty-i.lost_qty),0) INTO exposure,units FROM public.consignment_items i JOIN public.consignment_shipments s ON s.id=i.shipment_id WHERE s.partner_id=p.id AND (s.status IN ('em_transito','recebida') OR s.id=sh.id);
   IF p.limit_value>0 AND exposure>p.limit_value OR p.limit_qty>0 AND units>p.limit_qty THEN RAISE EXCEPTION 'Limite de consignação excedido.'; END IF;
   FOR row IN SELECT jsonb_build_object('id',product_id,'qty',sum(i.qty)) FROM public.consignment_items i WHERE shipment_id=sh.id GROUP BY product_id ORDER BY product_id LOOP
    UPDATE public.products SET stock=stock-(row->>'qty')::integer,updated_at=now() WHERE id=(row->>'id')::uuid AND stock>=(row->>'qty')::integer;
    IF NOT FOUND THEN RAISE EXCEPTION 'Estoque central insuficiente.'; END IF;
   END LOOP;
   UPDATE public.consignment_shipments SET dispatched_at=now() WHERE id=sh.id;
  ELSIF target_status='recebida' AND sh.status='em_transito' THEN
   UPDATE public.consignment_shipments SET received_at=now() WHERE id=sh.id;
  ELSIF target_status='cancelada' AND sh.status IN ('preparacao','separacao') THEN NULL;
  ELSIF target_status='encerrada' AND sh.status='recebida' THEN
   IF EXISTS(SELECT 1 FROM public.consignment_items WHERE shipment_id=sh.id AND qty>sold_qty+returned_qty+lost_qty) THEN RAISE EXCEPTION 'Ainda existe estoque nesta remessa.'; END IF;
  ELSE RAISE EXCEPTION 'Transição de remessa inválida.'; END IF;
  UPDATE public.consignment_shipments SET status=target_status WHERE id=sh.id;
  partner:=p.id; new_id:=sh.id;
 ELSIF _action IN ('sale','return','inventory') THEN
  SELECT * INTO item FROM public.consignment_items WHERE id=(_data->>'itemId')::uuid FOR UPDATE;
  IF item.id IS NULL THEN RAISE EXCEPTION 'Item não encontrado.'; END IF;
  SELECT * INTO sh FROM public.consignment_shipments WHERE id=item.shipment_id;
  IF sh.status<>'recebida' THEN RAISE EXCEPTION 'A remessa precisa ter sido recebida.'; END IF;
  balance:=item.qty-item.sold_qty-item.returned_qty-item.lost_qty;
  partner:=sh.partner_id;
  IF _action='sale' THEN
   qty:=(_data->>'qty')::integer;
   IF qty<=0 OR qty>balance-(SELECT COALESCE(sum(r.qty),0) FROM public.consignment_returns r WHERE r.item_id=item.id AND r.status IN ('solicitada','autorizada','em_transito')) THEN RAISE EXCEPTION 'Quantidade supera o estoque disponível ou reservado para devolução.'; END IF;
   INSERT INTO public.consignment_sales(item_id,qty,supply_price,sold_on,mode,notes,created_by) VALUES(item.id,qty,item.supply_price,(_data->>'soldOn')::date,_data->>'mode',COALESCE(_data->>'notes',''),_actor) RETURNING id INTO new_id;
   UPDATE public.consignment_items SET sold_qty=sold_qty+qty WHERE id=item.id;
  ELSIF _action='return' THEN
   qty:=(_data->>'qty')::integer;
   IF qty<=0 OR qty>balance-(SELECT COALESCE(sum(r.qty),0) FROM public.consignment_returns r WHERE r.item_id=item.id AND r.status IN ('solicitada','autorizada','em_transito')) THEN RAISE EXCEPTION 'Quantidade indisponível para devolução.'; END IF;
   INSERT INTO public.consignment_returns(item_id,qty,condition,reason,created_by) VALUES(item.id,qty,_data->>'condition',_data->>'reason',_actor) RETURNING id INTO new_id;
  ELSE
   INSERT INTO public.consignment_inventories(item_id,expected_qty,physical_qty,reason,created_by) VALUES(item.id,balance,(_data->>'physicalQty')::integer,_data->>'reason',_actor) RETURNING id INTO new_id;
  END IF;
 ELSIF _action='settle' THEN
  SELECT * INTO p FROM public.consignment_partners WHERE id=(_data->>'partnerId')::uuid FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Parceiro não encontrado.'; END IF;
  PERFORM s.id FROM public.consignment_sales s JOIN public.consignment_items i ON i.id=s.item_id JOIN public.consignment_shipments sh ON sh.id=i.shipment_id WHERE sh.partner_id=p.id AND s.id IN (SELECT value::uuid FROM jsonb_array_elements_text(_data->'saleIds')) AND s.settlement_id IS NULL FOR UPDATE OF s;
  SELECT sum(s.qty*s.supply_price),count(*) INTO amount,sale_count FROM public.consignment_sales s JOIN public.consignment_items i ON i.id=s.item_id JOIN public.consignment_shipments sh ON sh.id=i.shipment_id WHERE sh.partner_id=p.id AND s.id IN (SELECT value::uuid FROM jsonb_array_elements_text(_data->'saleIds')) AND s.settlement_id IS NULL;
  IF amount IS NULL OR sale_count<>jsonb_array_length(_data->'saleIds') THEN RAISE EXCEPTION 'Selecione vendas ainda não faturadas deste parceiro; não é permitido cobrar duas vezes.'; END IF;
  IF _data->>'mode'='integral' AND EXISTS(SELECT 1 FROM public.consignment_items i WHERE i.shipment_id IN (SELECT si.shipment_id FROM public.consignment_items si JOIN public.consignment_sales ss ON ss.item_id=si.id WHERE ss.id IN (SELECT value::uuid FROM jsonb_array_elements_text(_data->'saleIds'))) AND i.qty>i.sold_qty+i.returned_qty+i.lost_qty) THEN RAISE EXCEPTION 'Fechamento integral exige remessas sem estoque restante.'; END IF;
  INSERT INTO public.consignment_settlements(partner_id,mode,period_start,period_end,total,due_date,created_by) VALUES(p.id,_data->>'mode',(_data->>'periodStart')::date,(_data->>'periodEnd')::date,amount,(_data->>'dueDate')::date,_actor) RETURNING id INTO new_id;
  UPDATE public.consignment_sales SET settlement_id=new_id WHERE id IN (SELECT value::uuid FROM jsonb_array_elements_text(_data->'saleIds'));
  partner:=p.id;
 ELSIF _action IN ('payment','cancel_settlement') THEN
  SELECT * INTO st FROM public.consignment_settlements WHERE id=(_data->>'id')::uuid FOR UPDATE;
  IF st.id IS NULL OR st.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Cobrança não encontrada ou cancelada.'; END IF;
  SELECT COALESCE(sum(amount),0) INTO paid FROM public.consignment_payments WHERE settlement_id=st.id;
  IF _action='payment' THEN
   amount:=(_data->>'amount')::numeric;
   IF amount<=0 OR amount>st.total-paid THEN RAISE EXCEPTION 'Pagamento inválido ou superior ao saldo pendente.'; END IF;
   INSERT INTO public.consignment_payments(settlement_id,amount,paid_on,method,notes,created_by) VALUES(st.id,amount,(_data->>'paidOn')::date,_data->>'method',COALESCE(_data->>'notes',''),_actor) RETURNING id INTO new_id;
  ELSE
   IF paid>0 OR st.external_id IS NOT NULL THEN RAISE EXCEPTION 'Cobrança com recebimentos ou integrada exige conciliação antes de cancelar.'; END IF;
   UPDATE public.consignment_settlements SET cancelled_at=now(),cancellation_reason=_data->>'reason' WHERE id=st.id;
   UPDATE public.consignment_sales SET settlement_id=NULL WHERE settlement_id=st.id;
   new_id:=st.id;
  END IF;
  partner:=st.partner_id;
 ELSIF _action='return_status' THEN
  SELECT * INTO rt FROM public.consignment_returns WHERE id=(_data->>'id')::uuid FOR UPDATE;
  SELECT * INTO item FROM public.consignment_items WHERE id=rt.item_id FOR UPDATE;
  SELECT partner_id INTO partner FROM public.consignment_shipments WHERE id=item.shipment_id;
  target_status:=_data->>'status';
  IF target_status='autorizada' AND rt.status='solicitada' THEN NULL;
  ELSIF target_status='em_transito' AND rt.status='autorizada' THEN NULL;
  ELSIF target_status='rejeitada' AND rt.status IN ('solicitada','autorizada') THEN NULL;
  ELSIF target_status='recebida' AND rt.status='em_transito' THEN
   IF rt.qty>item.qty-item.sold_qty-item.returned_qty-item.lost_qty THEN RAISE EXCEPTION 'Saldo insuficiente para devolução.'; END IF;
   UPDATE public.consignment_items SET returned_qty=returned_qty+rt.qty WHERE id=item.id;
   IF rt.condition='integro' THEN UPDATE public.products SET stock=stock+rt.qty,updated_at=now() WHERE id=item.product_id; END IF;
   UPDATE public.consignment_returns SET received_at=now() WHERE id=rt.id;
  ELSE RAISE EXCEPTION 'Transição de devolução inválida.'; END IF;
  UPDATE public.consignment_returns SET status=target_status WHERE id=rt.id; new_id:=rt.id;
 ELSIF _action='inventory_resolve' THEN
  SELECT * INTO inv FROM public.consignment_inventories WHERE id=(_data->>'id')::uuid FOR UPDATE;
  IF inv.id IS NULL OR inv.decision<>'pendente' THEN RAISE EXCEPTION 'Inventário já regularizado ou inexistente.'; END IF;
  SELECT * INTO item FROM public.consignment_items WHERE id=inv.item_id FOR UPDATE;
  SELECT partner_id INTO partner FROM public.consignment_shipments WHERE id=item.shipment_id;
  qty:=inv.expected_qty-inv.physical_qty;
  IF _data->>'decision' IN ('perda_sem_cobranca','perda_com_cobranca') THEN
   IF qty<=0 OR item.qty-item.sold_qty-item.returned_qty-item.lost_qty<>inv.expected_qty OR EXISTS(SELECT 1 FROM public.consignment_returns WHERE item_id=item.id AND status IN ('solicitada','autorizada','em_transito')) THEN RAISE EXCEPTION 'Reconfira o inventário antes de regularizar esta perda.'; END IF;
   UPDATE public.consignment_items SET lost_qty=lost_qty+qty WHERE id=item.id;
   IF _data->>'decision'='perda_com_cobranca' THEN INSERT INTO public.consignment_sales(item_id,qty,supply_price,mode,notes,created_by) VALUES(item.id,qty,item.supply_price,'perda',_data->>'reason',_actor); END IF;
  ELSIF _data->>'decision'<>'sem_ajuste' THEN RAISE EXCEPTION 'Decisão inválida.'; END IF;
  UPDATE public.consignment_inventories SET decision=_data->>'decision',reason=reason || E'\nDecisão: ' || (_data->>'reason'),resolved_by=_actor,resolved_at=now() WHERE id=inv.id; new_id:=inv.id;
 ELSE RAISE EXCEPTION 'Operação inválida.'; END IF;
 INSERT INTO public.consignment_events(partner_id,action,entity_id,details,actor_id) VALUES(partner,_action,new_id,_data,_actor);
 RETURN jsonb_build_object('id',new_id);
END $$;
REVOKE ALL ON FUNCTION public.manage_consignment(text,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_consignment(text,jsonb,uuid) TO service_role;