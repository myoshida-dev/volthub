"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";

import {
  AlertaFormulario,
  BotaoEnviar,
  Campo,
  FormAcao,
  invalido,
  useAcaoFormulario,
  useToastSucesso,
} from "@/components/formulario";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { atualizarPerfil, trocarSenha } from "@/features/perfil/actions";
import { iniciais } from "@/lib/utils";

export function FormPerfil({
  nome,
  ramal,
  avatarUrl,
}: {
  nome: string;
  ramal: string | null;
  avatarUrl: string | null;
}) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(atualizarPerfil);
  const [previa, setPrevia] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  useToastSucesso(estado, () => {
    setPrevia(null);
    if (inputFoto.current) inputFoto.current.value = "";
  });

  const imagem = previa ?? avatarUrl;

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {imagem && <AvatarImage src={imagem} alt="" />}
          <AvatarFallback className="text-lg">{iniciais(nome)}</AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent">
            <Camera className="size-4" />
            Escolher foto
            <input
              ref={inputFoto}
              type="file"
              name="foto"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                setPrevia(arquivo ? URL.createObjectURL(arquivo) : null);
              }}
            />
          </label>
          <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 2 MB.</p>
          {estado.erros?.foto && (
            <p className="text-xs font-medium text-destructive">{estado.erros.foto[0]}</p>
          )}
        </div>
      </div>

      {avatarUrl && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="removerFoto" className="size-4 accent-primary" />
          Remover foto atual
        </label>
      )}

      <Campo rotulo="Ramal" nome="ramal" erros={estado.erros} dica="Número interno de 3 a 5 dígitos.">
        <Input
          id="ramal"
          name="ramal"
          inputMode="numeric"
          defaultValue={ramal ?? ""}
          aria-invalid={invalido(estado.erros, "ramal")}
          className="max-w-40"
        />
      </Campo>

      <AlertaFormulario estado={estado} />
      <BotaoEnviar>Salvar alterações</BotaoEnviar>
    </FormAcao>
  );
}

export function FormSenha() {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(trocarSenha);
  const formulario = useRef<HTMLFormElement>(null);
  useToastSucesso(estado, () => formulario.current?.reset());

  return (
    <FormAcao ref={formulario} onSubmit={aoEnviar} pendente={pendente} className="space-y-4">
      <Campo rotulo="Senha atual" nome="senhaAtual" erros={estado.erros}>
        <Input
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          autoComplete="current-password"
          aria-invalid={invalido(estado.erros, "senhaAtual")}
        />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Nova senha"
          nome="novaSenha"
          erros={estado.erros}
          dica="Mínimo de 8 caracteres, com letras e números."
        >
          <Input
            id="novaSenha"
            name="novaSenha"
            type="password"
            autoComplete="new-password"
            aria-invalid={invalido(estado.erros, "novaSenha")}
          />
        </Campo>
        <Campo rotulo="Confirmar nova senha" nome="confirmacao" erros={estado.erros}>
          <Input
            id="confirmacao"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            aria-invalid={invalido(estado.erros, "confirmacao")}
          />
        </Campo>
      </div>
      <AlertaFormulario estado={estado} />
      <BotaoEnviar variant="outline">Alterar senha</BotaoEnviar>
    </FormAcao>
  );
}
