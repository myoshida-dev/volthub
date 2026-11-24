"use client";

import { createContext, startTransition, useActionState, useContext, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { estadoInicial, type EstadoFormulario } from "@/lib/formularios";
import { cn } from "@/lib/utils";

type Acao = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

const ContextoPendente = createContext<boolean | null>(null);

/**
 * Envia o formulário para uma server action SEM o reset automático do React 19
 * (que apagaria o que o usuário digitou quando a validação falha).
 */
export function useAcaoFormulario(acao: Acao, opcoes?: { transformar?: (dados: FormData) => void }) {
  const [estado, despachar, pendente] = useActionState(acao, estadoInicial);

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const submitter = (evento.nativeEvent as SubmitEvent).submitter;
    const dados = new FormData(evento.currentTarget, submitter);
    opcoes?.transformar?.(dados);
    startTransition(() => despachar(dados));
  }

  return { estado, pendente, aoEnviar };
}

/** `<form>` que informa o estado "enviando" aos BotaoEnviar internos. */
export function FormAcao({ pendente, ...props }: React.ComponentProps<"form"> & { pendente: boolean }) {
  return (
    <ContextoPendente.Provider value={pendente}>
      <form noValidate {...props} />
    </ContextoPendente.Provider>
  );
}

type CampoProps = {
  rotulo: string;
  nome: string;
  erros?: EstadoFormulario["erros"];
  dica?: string;
  obrigatorio?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Rótulo + controle + mensagem de erro do campo. */
export function Campo({ rotulo, nome, erros, dica, obrigatorio, className, children }: CampoProps) {
  const erro = erros?.[nome]?.[0];
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={nome}>
        {rotulo}
        {obrigatorio && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {erro ? (
        <p className="text-xs font-medium text-destructive">{erro}</p>
      ) : (
        dica && <p className="text-xs text-muted-foreground">{dica}</p>
      )}
    </div>
  );
}

/** Botão de envio que mostra carregamento enquanto a server action roda. */
export function BotaoEnviar({
  children,
  textoEnviando = "Salvando…",
  ...props
}: React.ComponentProps<typeof Button> & { textoEnviando?: string }) {
  const status = useFormStatus();
  const pendenteContexto = useContext(ContextoPendente);
  const pending = pendenteContexto ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? textoEnviando : children}
    </Button>
  );
}

/** Mostra o erro geral do formulário. */
export function AlertaFormulario({ estado }: { estado: EstadoFormulario }) {
  if (!estado.erro) return null;
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="size-4 shrink-0" />
      {estado.erro}
    </p>
  );
}

/** Dispara um toast de sucesso quando a action retorna `ok`. */
export function useToastSucesso(estado: EstadoFormulario, aoSucesso?: () => void) {
  useEffect(() => {
    if (estado.ok) {
      if (estado.mensagem) toast.success(estado.mensagem);
      aoSucesso?.();
    }
    // Reage apenas a um novo estado retornado pela action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
}

/** Formulário que pede confirmação antes de enviar (ações destrutivas). */
export function FormConfirmacao({
  mensagem,
  ...props
}: React.ComponentProps<"form"> & { mensagem: string }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    />
  );
}

/** Atributo aria-invalid a partir dos erros do campo. */
export function invalido(erros: EstadoFormulario["erros"], nome: string) {
  return erros?.[nome] ? true : undefined;
}
