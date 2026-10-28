<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Service orders (P.A./O.S.) tables are server-only (service_role grants, no client policies); all access goes through `src/lib/service.functions.ts`, which checks ownership or admin role — keeps previous-owner and internal bench data private.
- Service files live in the private `service-files` bucket, uploaded via signed upload URLs and read via signed URLs; history (`service_events`) is append-only.
- Stock write-offs (consumo/avaria) go through `register_stock_withdrawal` (service_role-only SQL function called from `src/lib/admin.functions.ts` after `assertAdmin`) — decrements stock and logs reason atomically, never below zero.
- Abandoned carts: the browser cart syncs (debounced) to server-only `cart_sessions` via public `trackCart` in `src/lib/cart-tracking.functions.ts`; prices/names are resolved server-side, entry page/origin come from sessionStorage on first page of the visit, and `createOrder` marks the session `convertido` by `cartSessionId`.
- Telesales customers are unified: `listCustomers` merges site accounts (profiles + last order) with `customers` rows linked by `customers.user_id` (or matching e-mail); telesales orders for site accounts set `orders.user_id` so they show in the client's "Meus pedidos".
- Pending-order edits go through `updatePendingOrderItems` (admin) which prices new lines server-side and calls service_role-only `replace_pending_order_items`; it locks the order, refuses non-pending or invoiced orders, adjusts stock by quantity delta and rewrites items/totals atomically.
- Sales analytics (Visão geral + Pedidos) are pure client-side functions in `src/lib/sales-analytics.ts` over the full order history loaded (paged) by `adminOverview`; one shared filter state drives both screens; channel = notes starting with "Televendas", delivery = `shipping_address.fulfillment`. Unit tests run with `bunx vitest run` (config in `vitest.config.ts`).
- Order picking (Separação): sellers are the `seller` role in `user_roles` and always also get `admin`; claim/check items/complete/release go through `src/lib/picking.functions.ts` (rules in `src/lib/picking.ts`, tested), claim is a conditional update on `picker_id IS NULL` so two sellers never get the same order; seller accounts are created via Auth admin `createUser`, never with passwords stored in app tables.
