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
import { enviarDocumento } from "@/features/documentos/actions";
import { CATEGORIA_DOCUMENTO, opcoes } from "@/lib/rotulos";

export function FormDocumento({ setores }: { setores: { id: string; nome: string }[] }) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(enviarDocumento);

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-5">
      <Campo rotulo="Título" nome="titulo" erros={estado.erros} obrigatorio>
        <Input id="titulo" name="titulo" maxLength={120} aria-invalid={invalido(estado.erros, "titulo")} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Categoria" nome="categoria" erros={estado.erros} obrigatorio>
          <SelectNativo id="categoria" name="categoria" defaultValue="POLITICA">
            {opcoes(CATEGORIA_DOCUMENTO).map((o) => (
              <option key={o.valor} value={o.valor}>{o.rotulo}</option>
            ))}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Setor responsável" nome="setorId" erros={estado.erros}>
          <SelectNativo id="setorId" name="setorId" defaultValue="">
            <option value="">Nenhum (geral)</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </SelectNativo>
        </Campo>
      </div>
      <Campo rotulo="Descrição" nome="descricao" erros={estado.erros} dica="Opcional. Ajuda na busca.">
        <Textarea id="descricao" name="descricao" rows={3} maxLength={500} />
      </Campo>
      <Campo rotulo="Arquivo" nome="arquivo" erros={estado.erros} obrigatorio dica="PDF, Word, Excel, PowerPoint, imagem ou TXT até 8 MB.">
        <Input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.txt"
          aria-invalid={invalido(estado.erros, "arquivo")}
          className="file:mr-3 file:rounded file:bg-secondary file:px-2 file:text-sm file:text-primary"
        />
      </Campo>
      <AlertaFormulario estado={estado} />
      <BotaoEnviar size="lg" textoEnviando="Enviando…">Publicar documento</BotaoEnviar>
    </FormAcao>
  );
}
