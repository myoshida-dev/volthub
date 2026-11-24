"use client";

import { useState } from "react";
import { CalendarHeart, CalendarMinus, FilePen, Stethoscope, Check, X } from "lucide-react";

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
import { criarSolicitacao } from "@/features/solicitacoes/actions";
import { CAMPOS_ATUALIZACAO, LIMITES } from "@/features/solicitacoes/schemas";
import type { EstadoFormulario } from "@/lib/formularios";
import { cn, hojeISO } from "@/lib/utils";
import type { TipoSolicitacao } from "@prisma/client";

const TIPOS: { valor: TipoSolicitacao; titulo: string; descricao: string; icone: typeof CalendarHeart }[] = [
  { valor: "FERIAS", titulo: "Férias", descricao: `De ${LIMITES.feriasMin} a ${LIMITES.feriasMax} dias`, icone: CalendarHeart },
  { valor: "FOLGA", titulo: "Folga", descricao: `Até ${LIMITES.folgaMax} dias (banco de horas)`, icone: CalendarMinus },
  { valor: "ATESTADO", titulo: "Atestado médico", descricao: "Com anexo do documento", icone: Stethoscope },
  { valor: "ATUALIZACAO_DADOS", titulo: "Atualização de dados", descricao: "Telefone, endereço, banco…", icone: FilePen },
];

export function FormSolicitacao({ tipoInicial }: { tipoInicial?: TipoSolicitacao }) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(criarSolicitacao);
  const [tipo, setTipo] = useState<TipoSolicitacao>(tipoInicial ?? "FERIAS");
  const comPeriodo = tipo !== "ATUALIZACAO_DADOS";

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Tipo de solicitação</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPOS.map(({ valor, titulo, descricao, icone: Icone }) => (
            <label
              key={valor}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40",
                tipo === valor && "border-primary bg-secondary ring-1 ring-primary",
              )}
            >
              <input
                type="radio"
                name="tipo"
                value={valor}
                checked={tipo === valor}
                onChange={() => setTipo(valor)}
                className="sr-only"
              />
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destaque/15 text-primary">
                <Icone className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="block text-xs text-muted-foreground">{descricao}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {comPeriodo ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Data inicial" nome="dataInicio" erros={estado.erros} obrigatorio>
            <Input
              id="dataInicio"
              name="dataInicio"
              type="date"
              min={tipo === "FERIAS" ? hojeISO() : undefined}
              aria-invalid={invalido(estado.erros, "dataInicio")}
            />
          </Campo>
          <Campo rotulo="Data final" nome="dataFim" erros={estado.erros} obrigatorio>
            <Input id="dataFim" name="dataFim" type="date" aria-invalid={invalido(estado.erros, "dataFim")} />
          </Campo>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
          <Campo rotulo="Dado a atualizar" nome="campo" erros={estado.erros} obrigatorio>
            <SelectNativo id="campo" name="campo" defaultValue="TELEFONE">
              {Object.entries(CAMPOS_ATUALIZACAO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </SelectNativo>
          </Campo>
          <Campo rotulo="Novo valor" nome="valor" erros={estado.erros} obrigatorio dica="Telefone aprovado é atualizado automaticamente no cadastro.">
            <Input id="valor" name="valor" aria-invalid={invalido(estado.erros, "valor")} />
          </Campo>
        </div>
      )}

      {tipo === "ATESTADO" && (
        <Campo rotulo="Atestado" nome="anexo" erros={estado.erros} obrigatorio dica="PDF, JPG ou PNG até 5 MB. Só você, seu gestor e o RH podem ver.">
          <Input
            id="anexo"
            name="anexo"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            aria-invalid={invalido(estado.erros, "anexo")}
            className="file:mr-3 file:rounded file:bg-secondary file:px-2 file:text-sm file:text-primary"
          />
        </Campo>
      )}

      <Campo rotulo={comPeriodo ? "Observações" : "Motivo"} nome="motivo" erros={estado.erros} dica="Opcional.">
        <Textarea id="motivo" name="motivo" rows={3} maxLength={1000} />
      </Campo>

      <AlertaFormulario estado={estado} />
      <BotaoEnviar size="lg" textoEnviando="Enviando…">
        Enviar solicitação
      </BotaoEnviar>
    </FormAcao>
  );
}

export function FormDecisao({
  acao,
}: {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
}) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(acao);
  useToastSucesso(estado);

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-4">
      <Campo rotulo="Observação" nome="observacao" erros={estado.erros} dica="Obrigatória para reprovar. O colaborador verá este texto.">
        <Textarea id="observacao" name="observacao" rows={3} maxLength={1000} aria-invalid={invalido(estado.erros, "observacao")} />
      </Campo>
      <AlertaFormulario estado={estado} />
      <div className="flex flex-wrap gap-2">
        <BotaoEnviar name="decisao" value="APROVADA" className="bg-emerald-600 text-white hover:bg-emerald-700" textoEnviando="Enviando…">
          <Check /> Aprovar
        </BotaoEnviar>
        <BotaoEnviar name="decisao" value="REPROVADA" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" textoEnviando="Enviando…">
          <X /> Reprovar
        </BotaoEnviar>
      </div>
    </FormAcao>
  );
}
