import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, LogIn, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | Portal SOS.3D" },
      {
        name: "description",
        content: "Acesse sua conta SOS.3D para acompanhar pedidos e o portal de membros.",
      },
      { property: "og:title", content: "Entrar | Portal SOS.3D" },
      { property: "og:description", content: "Login do portal de clientes e membros SOS.3D." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(180),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/portal", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0]!.message);

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error("Não foi possível entrar", { description: error.message });
    navigate({ to: "/portal", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0]!.message);

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim().slice(0, 120) },
      },
    });
    setLoading(false);
    if (error) return toast.error("Não foi possível criar a conta", { description: error.message });
    setSent(true);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Falha no login com Google");
    if (result.redirected) return;
    navigate({ to: "/portal", replace: true });
  }

  return (
    <div className="container-page grid gap-10 py-16 lg:grid-cols-[1fr_460px]">
      <div className="hidden lg:block">
        <span className="eyebrow">Portal SOS.3D</span>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight">
          Acompanhe pedidos e acesse o portal de membros
        </h1>
        <p className="mt-4 max-w-lg text-muted-foreground">
          Clientes que adquirem impressoras SOS.3D recebem acesso a cursos, conteúdos técnicos e
          materiais de apoio liberados pela nossa equipe.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
          <li>• Histórico completo de pedidos e status de entrega</li>
          <li>• Cursos e trilhas de operação, manutenção e materiais</li>
          <li>• Suporte técnico com histórico da sua conta</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-7">
        {sent ? (
          <div className="text-center">
            <Mail className="mx-auto size-9 text-tech" />
            <h2 className="mt-4 text-xl font-bold">Confirme seu e-mail</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos um link de confirmação para <strong>{email}</strong>. Após confirmar, volte
              aqui para entrar.
            </p>
            <Button variant="outline" className="mt-6 w-full" onClick={() => setSent(false)}>
              Voltar
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="entrar">
            <TabsList className="w-full">
              <TabsTrigger value="entrar" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="criar" className="flex-1">
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form className="mt-6 space-y-4" onSubmit={signIn}>
                <div>
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={180}
                    className="mt-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="login-pass">Senha</Label>
                  <Input
                    id="login-pass"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={72}
                    className="mt-2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="cta" className="w-full" disabled={loading}>
                  <LogIn /> Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="criar">
              <form className="mt-6 space-y-4" onSubmit={signUp}>
                <div>
                  <Label htmlFor="reg-name">Nome completo</Label>
                  <Input
                    id="reg-name"
                    required
                    maxLength={120}
                    className="mt-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reg-email">E-mail</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={180}
                    className="mt-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reg-pass">Senha</Label>
                  <Input
                    id="reg-pass"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    className="mt-2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="cta" className="w-full" disabled={loading}>
                  <UserPlus /> Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        {!sent && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              Continuar com Google
            </Button>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Seus dados são protegidos •{" "}
              <Link to="/suporte" className="underline">
                precisa de ajuda?
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
