import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Clock,
  ExternalLink,
  GraduationCap,
  LogOut,
  Package,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/catalog";
import { myPortal } from "@/lib/portal.functions";
import { listMyOrders } from "@/lib/orders.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Portal de membros | SOS.3D" },
      {
        name: "description",
        content: "Cursos, conteúdos técnicos e histórico de pedidos para clientes SOS.3D.",
      },
      { property: "og:title", content: "Portal de membros | SOS.3D" },
      { property: "og:description", content: "Área exclusiva de clientes e membros SOS.3D." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  em_producao: "Em produção",
  enviado: "Enviado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function PortalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const portal = useQuery({ queryKey: ["portal"], queryFn: () => myPortal() });
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: () => listMyOrders() });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (portal.isLoading) {
    return <div className="container-page py-24 text-muted-foreground">Carregando seu portal…</div>;
  }

  const data = portal.data;

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Portal SOS.3D</span>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Olá, {data?.profile?.full_name?.split(" ")[0] ?? "cliente"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {data?.isMember
              ? "Seu acesso de membro está ativo — bons estudos!"
              : "Acompanhe seus pedidos. O acesso aos cursos é liberado após a compra de uma impressora."}
          </p>
        </div>
        <div className="flex gap-2">
          {data?.isAdmin && (
            <Button asChild variant="tech">
              <Link to="/admin">
                <ShieldCheck /> Painel admin
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={signOut}>
            <LogOut /> Sair
          </Button>
        </div>
      </div>

      <Tabs defaultValue={data?.isMember ? "cursos" : "pedidos"} className="mt-10">
        <TabsList>
          <TabsTrigger value="cursos">Cursos e conteúdos</TabsTrigger>
          <TabsTrigger value="pedidos">Meus pedidos</TabsTrigger>
        </TabsList>

        <TabsContent value="cursos" className="mt-8">
          {!data?.isMember ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <GraduationCap className="mx-auto size-9 text-steel" />
              <h2 className="mt-4 text-lg font-semibold">Acesso ainda não liberado</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                O portal de conteúdos é liberado pela nossa equipe para clientes que adquiriram
                impressoras 3D. Já comprou? Fale com o suporte informando o número do pedido.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild variant="cta">
                  <Link to="/impressoras">Ver impressoras</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/suporte">Falar com o suporte</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {data.courses.map((course) => (
                <article key={course.id} className="rounded-xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary">{course.level}</Badge>
                    <h2 className="text-xl font-bold">{course.title}</h2>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    {course.description}
                  </p>

                  <Accordion type="single" collapsible className="mt-5">
                    {[...course.lessons]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((lesson) => (
                        <AccordionItem key={lesson.id} value={lesson.id}>
                          <AccordionTrigger className="text-left">
                            <span className="flex flex-1 flex-wrap items-center gap-3 pr-3">
                              <BookOpen className="size-4 shrink-0 text-tech" />
                              <span className="font-medium">{lesson.title}</span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3.5" /> {lesson.duration_min} min
                              </span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-muted-foreground">{lesson.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {lesson.video_url && (
                                <Button asChild size="sm" variant="tech">
                                  <a href={lesson.video_url} target="_blank" rel="noreferrer">
                                    Assistir <ExternalLink />
                                  </a>
                                </Button>
                              )}
                              {lesson.resource_url && (
                                <Button asChild size="sm" variant="outline">
                                  <a href={lesson.resource_url} target="_blank" rel="noreferrer">
                                    Material de apoio
                                  </a>
                                </Button>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pedidos" className="mt-8">
          {(orders.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Package className="mx-auto size-9 text-steel" />
              <p className="mt-4 font-semibold">Nenhum pedido por aqui ainda</p>
              <Button asChild variant="cta" className="mt-6">
                <Link to="/loja">Ir para a loja</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {(orders.data ?? []).map((order) => (
                <li key={order.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Pedido {order.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {statusLabels[order.status] ?? order.status}
                      </Badge>
                      <span className="font-bold text-brand">{formatBRL(Number(order.total))}</span>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {order.order_items.map((item, i) => (
                      <li key={i}>
                        {item.qty}× {item.product_name} — {formatBRL(Number(item.unit_price))}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
