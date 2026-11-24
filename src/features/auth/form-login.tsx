"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ChevronDown, Info, Loader2 } from "lucide-react";

import { entrar, type EstadoLogin } from "@/features/auth/actions";
import { CONTAS_DEMO, SENHA_DEMO } from "@/features/auth/contas-demo";
import { descreverAcesso } from "@/lib/permissions";
import { cn, iniciais } from "@/lib/utils";

const classeCampo =
  "h-12 w-full rounded-lg border border-input bg-card px-4 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary aria-invalid:border-destructive";

export function FormLogin({ callbackUrl, ramalSuporte }: { callbackUrl?: string; ramalSuporte?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [ajudaSenha, setAjudaSenha] = useState(false);

  function usarContaDemo(login: string) {
    setIdentificador(login);
    setSenha(SENHA_DEMO);
  }

  return (
    <div>
      <form action={acao} className="space-y-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />

        <div className="space-y-2">
          <label htmlFor="identificador" className="block text-sm font-semibold">
            Usuário ou matrícula
          </label>
          <input
            id="identificador"
            name="identificador"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nome.sobrenome"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            required
            aria-invalid={estado.erro ? true : undefined}
            className={classeCampo}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="senha" className="text-sm font-semibold">
              Senha
            </label>
            <button
              type="button"
              onClick={() => setAjudaSenha((v) => !v)}
              aria-expanded={ajudaSenha}
              className="text-sm font-medium text-[#A67C00] hover:underline"
            >
              Esqueci a senha
            </button>
          </div>
          <div className="relative">
            <input
              id="senha"
              name="senha"
              type={mostrarSenha ? "text" : "password"}
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              aria-invalid={estado.erro ? true : undefined}
              className={cn(classeCampo, "pr-20")}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-pressed={mostrarSenha}
              aria-controls="senha"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2 py-1 text-sm font-medium text-foreground/80 hover:bg-muted"
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {ajudaSenha && (
            <p className="flex gap-2 rounded-lg border border-info/30 bg-info-suave px-3 py-2.5 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-info" />
              <span>
                Por segurança, a senha é redefinida pelo Suporte TI
                {ramalSuporte && (
                  <>
                    {" "}(ramal <span className="font-mono">{ramalSuporte}</span>)
                  </>
                )}
                . Você recebe uma senha temporária e troca em &quot;Meu perfil&quot;.
              </span>
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-[15px] text-foreground/80">
          <input type="checkbox" name="manter" defaultChecked className="size-[18px] rounded accent-primary" />
          Manter conectado neste computador
        </label>

        {estado.erro && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-destaque text-[15px] font-semibold text-destaque-foreground transition-colors hover:bg-destaque/90 focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-70"
        >
          {enviando && <Loader2 className="size-4 animate-spin" />}
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="mt-6 border-t pt-5 text-sm text-muted-foreground">
        {ramalSuporte ? (
          <p>
            Problemas para entrar? Suporte TI · ramal <span className="font-mono text-foreground">{ramalSuporte}</span>
          </p>
        ) : (
          <p>Problemas para entrar? Procure o Suporte TI.</p>
        )}

        {/* Projeto de portfólio: atalhos para quem quiser explorar cada perfil. */}
        <details className="group mt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium select-none hover:text-foreground">
            Contas de demonstração
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {CONTAS_DEMO.map((conta) => (
              <li key={conta.login}>
                <button
                  type="button"
                  onClick={() => usarContaDemo(conta.login)}
                  className="flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {iniciais(conta.nome)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">{descreverAcesso(conta)}</span>
                    <span className="block truncate font-mono text-[11px]">{conta.login}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Clique para preencher. Senha de todas: <span className="font-mono">{SENHA_DEMO}</span>
          </p>
        </details>
      </div>
    </div>
  );
}
