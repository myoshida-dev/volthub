import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

type LogoProps = {
  /** Esconde o texto (só o símbolo). */
  compacto?: boolean;
  /** Texto claro, para fundos escuros. */
  claro?: boolean;
  className?: string;
};

export function Logo({ compacto = false, claro = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destaque text-primary">
        <Zap className="size-[18px]" fill="currentColor" strokeWidth={1.5} />
      </span>
      {!compacto && (
        <span className={cn("text-xl font-bold tracking-tight", claro ? "text-white" : "text-foreground")}>
          Volt<span className={claro ? "text-destaque" : "text-[#D9A300]"}>Hub</span>
        </span>
      )}
    </div>
  );
}
