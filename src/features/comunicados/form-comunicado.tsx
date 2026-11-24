"use client";

import {
  AlertaFormulario,
  BotaoEnviar,
  Campo,
  FormAcao,
  invalido,
  useAcaoFormulario,
} from "@/components/formulario";
import { Input } from "@/components/ui/input";
import { SelectNativo } from "@/components/ui/select-nativo";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { CATEGORIA_COMUNICADO, opcoes } from "@/lib/rotulos";

type Opcao = { id: string; nome: string };

type FormComunicadoProps = {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  unidades: Opcao[];
  setores: Opcao[];
  inicial?: {
    titulo: string;
    categoria: string;
    conteudo: string;
    fixado: boolean;
    expiraEm: string;
    unidadeIds: string[];
    setorIds: string[];
  };
  textoBotao: string;
};

function GrupoCheckbox({
  titulo,
  nome,
  opcoesLista,
  selecionados,
}: {
  titulo: string;
  nome: string;
  opcoesLista: Opcao[];
  selecionados: string[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoesLista.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm transition-colors has-checked:border-primary has-checked:bg-secondary"
          >
            <input
              type="checkbox"
              name={nome}
              value={o.id}
              defaultChecked={selecionados.includes(o.id)}
              className="size-4 accent-primary"
            />
            {o.nome}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FormComunicado({ acao, unidades, setores, inicial, textoBotao }: FormComunicadoProps) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(acao);

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <Campo rotulo="Título" nome="titulo" erros={estado.erros} obrigatorio>
          <Input
            id="titulo"
            name="titulo"
            defaultValue={inicial?.titulo}
            maxLength={140}
            aria-invalid={invalido(estado.erros, "titulo")}
          />
        </Campo>
        <Campo rotulo="Categoria" nome="categoria" erros={estado.erros} obrigatorio>
          <SelectNativo id="categoria" name="categoria" defaultValue={inicial?.categoria ?? "GERAL"}>
            {opcoes(CATEGORIA_COMUNICADO).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </SelectNativo>
        </Campo>
      </div>

      <Campo
        rotulo="Texto do comunicado"
        nome="conteudo"
        erros={estado.erros}
        obrigatorio
        dica="Quebras de linha são mantidas."
      >
        <Textarea
          id="conteudo"
          name="conteudo"
          rows={10}
          defaultValue={inicial?.conteudo}
          aria-invalid={invalido(estado.erros, "conteudo")}
          className="min-h-48"
        />
      </Campo>

      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <div>
          <p className="text-sm font-semibold">Público-alvo</p>
          <p className="text-xs text-muted-foreground">
            Sem nenhuma unidade ou setor marcado, o comunicado vai para toda a empresa.
          </p>
        </div>
        <GrupoCheckbox
          titulo="Unidades"
          nome="unidades"
          opcoesLista={unidades}
          selecionados={inicial?.unidadeIds ?? []}
        />
        <GrupoCheckbox
          titulo="Setores"
          nome="setores"
          opcoesLista={setores}
          selecionados={inicial?.setorIds ?? []}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Expira em"
          nome="expiraEm"
          erros={estado.erros}
          dica="Opcional. Depois dessa data o comunicado sai do mural."
        >
          <Input
            id="expiraEm"
            name="expiraEm"
            type="date"
            defaultValue={inicial?.expiraEm}
            aria-invalid={invalido(estado.erros, "expiraEm")}
          />
        </Campo>
        <label className="flex items-center gap-3 self-center rounded-md border bg-card p-3 text-sm sm:mt-5">
          <input
            type="checkbox"
            name="fixado"
            defaultChecked={inicial?.fixado}
            className="size-4 accent-primary"
          />
          <span>
            <span className="font-medium">Fixar no topo do mural</span>
            <span className="block text-xs text-muted-foreground">Para avisos importantes.</span>
          </span>
        </label>
      </div>

      <AlertaFormulario estado={estado} />
      <BotaoEnviar size="lg" textoEnviando="Publicando…">
        {textoBotao}
      </BotaoEnviar>
    </FormAcao>
  );
}
