"use client";

import { useRef } from "react";
import { Lock, Send } from "lucide-react";

import {
  AlertaFormulario,
  BotaoEnviar,
  Campo,
  FormAcao,
  invalido,
  useAcaoFormulario,
  useToastSucesso,
} from "@/components/formulario";
import { Input } from "@/components/ui/input";
import { SelectNativo } from "@/components/ui/select-nativo";
import { Textarea } from "@/components/ui/textarea";
import { abrirChamado } from "@/features/chamados/actions";
import type { EstadoFormulario } from "@/lib/formularios";
import { CATEGORIA_CHAMADO, opcoes, PRIORIDADE_CHAMADO, STATUS_CHAMADO_TI } from "@/lib/rotulos";

type Acao = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

const DICA_PRIORIDADE: Record<string, string> = {
  BAIXA: "Dúvida ou melhoria, sem impacto no trabalho.",
  MEDIA: "Atrapalha, mas dá para continuar trabalhando.",
  ALTA: "Impede parte do trabalho.",
  URGENTE: "Parou tudo: vendas, expedição ou vários usuários afetados.",
};

const classeArquivo =
  "file:mr-3 file:rounded file:bg-secondary file:px-2 file:text-sm file:text-primary";

export function FormNovoChamado() {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(abrirChamado);

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-5">
      <Campo rotulo="Resumo do problema" nome="titulo" erros={estado.erros} obrigatorio>
        <Input id="titulo" name="titulo" maxLength={120} placeholder="Ex.: Impressora da expedição não imprime etiquetas" aria-invalid={invalido(estado.erros, "titulo")} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Categoria" nome="categoria" erros={estado.erros} obrigatorio>
          <SelectNativo id="categoria" name="categoria" defaultValue="SOFTWARE">
            {opcoes(CATEGORIA_CHAMADO).map((o) => (
              <option key={o.valor} value={o.valor}>{o.rotulo}</option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Prioridade" nome="prioridade" erros={estado.erros} obrigatorio>
          <SelectNativo id="prioridade" name="prioridade" defaultValue="MEDIA">
            {opcoes(PRIORIDADE_CHAMADO).map((o) => (
              <option key={o.valor} value={o.valor}>{o.rotulo} — {DICA_PRIORIDADE[o.valor]}</option>
            ))}
          </SelectNativo>
        </Campo>
      </div>
      <Campo rotulo="Descrição" nome="descricao" erros={estado.erros} obrigatorio dica="O que aconteceu, desde quando, e se aparece alguma mensagem de erro.">
        <Textarea id="descricao" name="descricao" rows={6} maxLength={5000} aria-invalid={invalido(estado.erros, "descricao")} />
      </Campo>
      <Campo rotulo="Anexo (print da tela, foto…)" nome="anexo" erros={estado.erros} dica="Opcional. PDF, JPG ou PNG até 5 MB.">
        <Input id="anexo" name="anexo" type="file" accept="application/pdf,image/png,image/jpeg" className={classeArquivo} />
      </Campo>
      <AlertaFormulario estado={estado} />
      <BotaoEnviar size="lg" textoEnviando="Abrindo chamado…">
        Abrir chamado
      </BotaoEnviar>
    </FormAcao>
  );
}

export function FormComentario({ acao, ehTi }: { acao: Acao; ehTi: boolean }) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(acao);
  const formulario = useRef<HTMLFormElement>(null);
  useToastSucesso(estado, () => formulario.current?.reset());

  return (
    <FormAcao ref={formulario} onSubmit={aoEnviar} pendente={pendente} className="space-y-3">
      <Textarea name="conteudo" rows={3} maxLength={5000} placeholder="Escreva uma mensagem…" aria-label="Mensagem" aria-invalid={invalido(estado.erros, "conteudo")} />
      {estado.erros?.conteudo && <p className="text-xs font-medium text-destructive">{estado.erros.conteudo[0]}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <Input name="anexo" type="file" accept="application/pdf,image/png,image/jpeg" aria-label="Anexo" className={`h-8 w-full text-xs sm:w-80 ${classeArquivo}`} />
          {ehTi && (
            <label className="flex items-center gap-2 text-sm text-amber-800">
              <input type="checkbox" name="interno" className="size-4 accent-amber-600" />
              <Lock className="size-3.5" /> Nota interna (só a TI vê)
            </label>
          )}
        </div>
        <BotaoEnviar size="sm" textoEnviando="Enviando…">
          <Send /> Enviar
        </BotaoEnviar>
      </div>
      {estado.erros?.anexo && <p className="text-xs font-medium text-destructive">{estado.erros.anexo[0]}</p>}
      <AlertaFormulario estado={{ erro: estado.erros ? undefined : estado.erro }} />
    </FormAcao>
  );
}

export function FormAtendimento({
  acao,
  inicial,
  equipeTi,
}: {
  acao: Acao;
  inicial: { status: string; prioridade: string; responsavelId: string | null };
  equipeTi: { id: string; nome: string }[];
}) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(acao);
  useToastSucesso(estado);

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-3">
      <Campo rotulo="Status" nome="status" erros={estado.erros}>
        <SelectNativo id="status" name="status" defaultValue={inicial.status}>
          {opcoes(STATUS_CHAMADO_TI).map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
          ))}
        </SelectNativo>
      </Campo>
      <Campo rotulo="Prioridade" nome="prioridade" erros={estado.erros}>
        <SelectNativo id="prioridade" name="prioridade" defaultValue={inicial.prioridade}>
          {opcoes(PRIORIDADE_CHAMADO).map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
          ))}
        </SelectNativo>
      </Campo>
      <Campo rotulo="Responsável" nome="responsavelId" erros={estado.erros}>
        <SelectNativo id="responsavelId" name="responsavelId" defaultValue={inicial.responsavelId ?? ""}>
          <option value="">Sem responsável</option>
          {equipeTi.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </SelectNativo>
      </Campo>
      <AlertaFormulario estado={estado} />
      <BotaoEnviar className="w-full">Salvar atendimento</BotaoEnviar>
    </FormAcao>
  );
}
