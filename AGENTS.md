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
