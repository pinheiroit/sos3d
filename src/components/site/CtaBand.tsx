import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function CtaBand({
  title = "Vamos transformar seu projeto em uma solução real?",
  text = "Fale com a SOS.3D e descubra qual tecnologia atende melhor sua operação, seu orçamento e seus objetivos.",
  primary = "Solicitar orçamento",
}: {
  title?: string;
  text?: string;
  primary?: string;
}) {
  return (
    <section className="container-page">
      <div className="surface-brand grid-tech overflow-hidden rounded-2xl px-8 py-14 text-center md:px-16">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/75">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="cta" size="lg">
            <Link to="/contato">{primary}</Link>
          </Button>
          <Button asChild variant="onbrand" size="lg">
            <Link to="/loja">Ver catálogo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
