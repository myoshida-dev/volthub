"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { parabenizar } from "@/features/inicio/actions";

export function BotaoParabenizar({ aniversarianteId }: { aniversarianteId: string }) {
  const [enviando, iniciar] = useTransition();
  const [enviado, setEnviado] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={enviando || enviado}
      onClick={() =>
        iniciar(async () => {
          const resultado = await parabenizar(aniversarianteId);
          if (resultado.ok) {
            toast.success(resultado.mensagem);
            setEnviado(true);
          } else if (resultado.erro) {
            toast.error(resultado.erro);
          }
        })
      }
    >
      {enviando ? <Loader2 className="animate-spin" /> : enviado ? <Check /> : null}
      {enviado ? "Enviado" : "Parabenizar"}
    </Button>
  );
}
