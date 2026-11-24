import { CheckCircle2, ThumbsUp } from "lucide-react";

import { BotaoEnviar } from "@/components/formulario";
import { marcarCiente } from "@/features/comunicados/actions";

/** Botão "Estou ciente" (server action com o id já vinculado). */
export function BotaoCiente({ comunicadoId, ciente }: { comunicadoId: string; ciente: boolean }) {
  if (ciente) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="size-4" /> Você está ciente
      </span>
    );
  }
  return (
    <form action={marcarCiente.bind(null, comunicadoId)}>
      <BotaoEnviar size="sm" variant="destaque" textoEnviando="Registrando…">
        <ThumbsUp /> Estou ciente
      </BotaoEnviar>
    </form>
  );
}

/** Texto do público-alvo: "Toda a empresa" ou "Curitiba · Comercial, Logística". */
export function descreverPublico(unidades: { nome: string }[], setores: { nome: string }[]) {
  if (unidades.length === 0 && setores.length === 0) return "Toda a empresa";
  const partes = [];
  if (unidades.length) partes.push(unidades.map((u) => u.nome.replace(/^(Matriz|Filial) /, "")).join(", "));
  if (setores.length) partes.push(setores.map((s) => s.nome).join(", "));
  return partes.join(" · ");
}
