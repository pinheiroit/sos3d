import { useEffect, useState } from "react";
import { Link2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const SITE_ORIGIN = "https://sos3d.com.br";

type Props = {
  /** Caminho da página (ex.: /produto/slug). */
  path: string;
  title: string;
  text?: string;
  variant?: "icon" | "full";
  className?: string;
};

export function ShareButton({ path, title, text, variant = "full", className }: Props) {
  const url = `${SITE_ORIGIN}${path}`;
  const message = text ? `${text}\n${url}` : `${title}\n${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  // Celulares com compartilhamento nativo abrem a folha do sistema; no computador, um menu.
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(
      typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches,
    );
  }, []);

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: text ?? title, url });
    } catch {
      /* usuário cancelou */
    }
  };

  const trigger =
    variant === "icon" ? (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Compartilhar ${title}`}
        className={cn("size-8 rounded-full bg-card/90 shadow-sm backdrop-blur", className)}
        onClick={native ? nativeShare : undefined}
      >
        <Share2 className="size-4" />
      </Button>
    ) : (
      <Button type="button" variant="outline" size="lg" className={className} onClick={native ? nativeShare : undefined}>
        <Share2 /> Compartilhar
      </Button>
    );

  if (native) return trigger;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle /> WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 /> Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copy}>
          <Link2 /> Copiar link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
