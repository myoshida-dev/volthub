"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Pencil, Plus, ShieldAlert } from "lucide-react";

import {
  AlertaFormulario,
  BotaoEnviar,
  Campo,
  FormAcao,
  invalido,
  useAcaoFormulario,
  useToastSucesso,
} from "@/components/formulario";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNativo } from "@/components/ui/select-nativo";
import { Textarea } from "@/components/ui/textarea";
import {
  redefinirSenha,
  salvarMeta,
  salvarRamal,
  salvarRecurso,
  salvarSetor,
  salvarUnidade,
  salvarUsuario,
} from "@/features/admin/actions";
import type { EstadoFormulario } from "@/lib/formularios";
import { ROTULO_PERFIL } from "@/lib/permissions";

type Opcao = { id: string; nome: string };

function CaixaDestaque({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
      <span className="font-medium">{texto}</span>
    </p>
  );
}

// ─── Usuário ─────────────────────────────────────────────────

export type UsuarioFormulario = {
  nome: string;
  login: string;
  email: string;
  cargo: string;
  perfil: string;
  equipe: string;
  unidadeId: string;
  setorId: string;
  gestorId: string;
  telefone: string;
  ramal: string;
  dataAdmissao: string;
  dataNascimento: string;
  ativo: boolean;
};

export function FormUsuario({
  id,
  inicial,
  unidades,
  setores,
  gestores,
}: {
  id: string | null;
  inicial?: UsuarioFormulario;
  unidades: Opcao[];
  setores: Opcao[];
  gestores: Opcao[];
}) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(salvarUsuario.bind(null, id));
  const [perfil, setPerfil] = useState(inicial?.perfil ?? "COLABORADOR");
  const [login, setLogin] = useState(inicial?.login ?? "");
  useToastSucesso(estado);
  const e = estado.erros;

  /** Sugere "nome.sobrenome" ao sair do campo de nome, se o usuário ainda estiver vazio. */
  function sugerirLogin(nome: string) {
    if (login) return;
    const partes = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (partes.length >= 2) setLogin(`${partes[0]}.${partes[partes.length - 1]}`.replace(/[^a-z0-9._-]/g, ""));
  }

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome completo" nome="nome" erros={e} obrigatorio>
          <Input id="nome" name="nome" defaultValue={inicial?.nome} onBlur={(ev) => sugerirLogin(ev.target.value)} aria-invalid={invalido(e, "nome")} />
        </Campo>
        <Campo rotulo="Usuário de rede" nome="login" erros={e} obrigatorio dica="Usado para entrar no portal (também vale a matrícula ou o e-mail).">
          <Input id="login" name="login" value={login} onChange={(ev) => setLogin(ev.target.value.toLowerCase())} placeholder="nome.sobrenome" autoCapitalize="none" spellCheck={false} className="font-mono" aria-invalid={invalido(e, "login")} />
        </Campo>
        <Campo rotulo="E-mail corporativo" nome="email" erros={e} obrigatorio>
          <Input id="email" name="email" type="email" defaultValue={inicial?.email} aria-invalid={invalido(e, "email")} />
        </Campo>
        <Campo rotulo="Cargo" nome="cargo" erros={e} obrigatorio>
          <Input id="cargo" name="cargo" defaultValue={inicial?.cargo} aria-invalid={invalido(e, "cargo")} />
        </Campo>
        <Campo rotulo="Data de admissão" nome="dataAdmissao" erros={e} obrigatorio>
          <Input id="dataAdmissao" name="dataAdmissao" type="date" defaultValue={inicial?.dataAdmissao} aria-invalid={invalido(e, "dataAdmissao")} />
        </Campo>
        <Campo rotulo="Unidade" nome="unidadeId" erros={e} obrigatorio>
          <SelectNativo id="unidadeId" name="unidadeId" defaultValue={inicial?.unidadeId ?? ""}>
            <option value="" disabled>Escolha…</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Setor" nome="setorId" erros={e} obrigatorio>
          <SelectNativo id="setorId" name="setorId" defaultValue={inicial?.setorId ?? ""}>
            <option value="" disabled>Escolha…</option>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Perfil de acesso" nome="perfil" erros={e} obrigatorio>
          <SelectNativo id="perfil" name="perfil" value={perfil} onChange={(ev) => setPerfil(ev.target.value)}>
            {Object.entries(ROTULO_PERFIL).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Equipe de atendimento" nome="equipe" erros={e} obrigatorio={perfil === "EQUIPE"} dica="RH ou TI dão acesso às filas dessas equipes.">
          <SelectNativo id="equipe" name="equipe" defaultValue={inicial?.equipe ?? ""}>
            <option value="">Nenhuma</option>
            <option value="RH">RH</option>
            <option value="TI">TI</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Gestor direto" nome="gestorId" erros={e} dica="Quem aprova as solicitações desta pessoa.">
          <SelectNativo id="gestorId" name="gestorId" defaultValue={inicial?.gestorId ?? ""}>
            <option value="">Sem gestor (RH decide)</option>
            {gestores.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Data de nascimento" nome="dataNascimento" erros={e}>
          <Input id="dataNascimento" name="dataNascimento" type="date" defaultValue={inicial?.dataNascimento} />
        </Campo>
        <Campo rotulo="Celular" nome="telefone" erros={e}>
          <Input id="telefone" name="telefone" defaultValue={inicial?.telefone} placeholder="(19) 99999-9999" />
        </Campo>
        <Campo rotulo="Ramal" nome="ramal" erros={e}>
          <Input id="ramal" name="ramal" inputMode="numeric" defaultValue={inicial?.ramal} aria-invalid={invalido(e, "ramal")} />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={inicial?.ativo ?? true} className="size-4 accent-primary" />
        Usuário ativo (pode entrar no portal)
      </label>
      <CaixaDestaque texto={estado.destaque} />
      <AlertaFormulario estado={estado} />
      <BotaoEnviar size="lg">{id ? "Salvar alterações" : "Cadastrar usuário"}</BotaoEnviar>
    </FormAcao>
  );
}

export function BotaoRedefinirSenha({ id }: { id: string }) {
  const [resultado, setResultado] = useState<EstadoFormulario>({});
  const [pendente, iniciar] = useTransition();
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        disabled={pendente}
        onClick={() => {
          if (!window.confirm("Gerar uma nova senha temporária? A senha atual deixa de funcionar.")) return;
          iniciar(async () => setResultado(await redefinirSenha(id)));
        }}
      >
        {pendente ? <Loader2 className="animate-spin" /> : <KeyRound />} Redefinir senha
      </Button>
      <CaixaDestaque texto={resultado.destaque} />
    </div>
  );
}

// ─── Recurso ─────────────────────────────────────────────────

export type RecursoFormulario = {
  nome: string;
  tipo: string;
  unidadeId: string;
  descricao: string;
  capacidade: string;
  localizacao: string;
  placa: string;
  modelo: string;
  kmAtual: string;
  ativo: boolean;
};

export function FormRecurso({ id, inicial, unidades }: { id: string | null; inicial?: RecursoFormulario; unidades: Opcao[] }) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(salvarRecurso.bind(null, id));
  const [tipo, setTipo] = useState(inicial?.tipo ?? "SALA");
  const e = estado.erros;

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tipo" nome="tipo" erros={e} obrigatorio>
          <SelectNativo id="tipo" name="tipo" value={tipo} onChange={(ev) => setTipo(ev.target.value)}>
            <option value="SALA">Sala de reunião</option>
            <option value="VEICULO">Veículo</option>
          </SelectNativo>
        </Campo>
        <Campo rotulo="Unidade" nome="unidadeId" erros={e} obrigatorio>
          <SelectNativo id="unidadeId" name="unidadeId" defaultValue={inicial?.unidadeId ?? unidades[0]?.id}>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Nome" nome="nome" erros={e} obrigatorio className="sm:col-span-2">
          <Input id="nome" name="nome" defaultValue={inicial?.nome} placeholder={tipo === "SALA" ? "Ex.: Sala Itaipu" : "Ex.: Fiorino Branca"} aria-invalid={invalido(e, "nome")} />
        </Campo>
        {tipo === "SALA" ? (
          <>
            <Campo rotulo="Capacidade (pessoas)" nome="capacidade" erros={e} obrigatorio>
              <Input id="capacidade" name="capacidade" type="number" min={1} defaultValue={inicial?.capacidade} aria-invalid={invalido(e, "capacidade")} />
            </Campo>
            <Campo rotulo="Localização" nome="localizacao" erros={e}>
              <Input id="localizacao" name="localizacao" defaultValue={inicial?.localizacao} placeholder="Ex.: 2º andar" />
            </Campo>
          </>
        ) : (
          <>
            <Campo rotulo="Placa" nome="placa" erros={e} obrigatorio>
              <Input id="placa" name="placa" defaultValue={inicial?.placa} placeholder="ABC1D23" className="uppercase" aria-invalid={invalido(e, "placa")} />
            </Campo>
            <Campo rotulo="Modelo" nome="modelo" erros={e}>
              <Input id="modelo" name="modelo" defaultValue={inicial?.modelo} placeholder="Ex.: Fiat Fiorino 1.4" />
            </Campo>
            <Campo rotulo="Hodômetro atual (km)" nome="kmAtual" erros={e}>
              <Input id="kmAtual" name="kmAtual" type="number" min={0} defaultValue={inicial?.kmAtual} aria-invalid={invalido(e, "kmAtual")} />
            </Campo>
          </>
        )}
        <Campo rotulo="Descrição" nome="descricao" erros={e} className="sm:col-span-2">
          <Textarea id="descricao" name="descricao" rows={2} defaultValue={inicial?.descricao} placeholder={tipo === "SALA" ? "Ex.: TV 55\", videoconferência" : "Ex.: Uso para entregas pequenas"} />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={inicial?.ativo ?? true} className="size-4 accent-primary" />
        Disponível para reserva
      </label>
      <AlertaFormulario estado={estado} />
      <BotaoEnviar size="lg">{id ? "Salvar alterações" : "Cadastrar recurso"}</BotaoEnviar>
    </FormAcao>
  );
}

// ─── Unidade e setor (em diálogo) ────────────────────────────

type Acao = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

function DialogoFormulario({
  titulo,
  editar,
  acao,
  children,
}: {
  titulo: string;
  editar: boolean;
  acao: Acao;
  children: (erros: EstadoFormulario["erros"]) => React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {editar ? (
          <Button variant="ghost" size="icon" aria-label={titulo}><Pencil /></Button>
        ) : (
          <Button size="sm"><Plus /> {titulo}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {aberto && <CorpoDialogo acao={acao} aoConcluir={() => setAberto(false)}>{children}</CorpoDialogo>}
      </DialogContent>
    </Dialog>
  );
}

function CorpoDialogo({ acao, aoConcluir, children }: { acao: Acao; aoConcluir: () => void; children: (erros: EstadoFormulario["erros"]) => React.ReactNode }) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(acao);
  useToastSucesso(estado, aoConcluir);
  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-4">
      {children(estado.erros)}
      <AlertaFormulario estado={estado} />
      <BotaoEnviar className="w-full">Salvar</BotaoEnviar>
    </FormAcao>
  );
}

export function DialogoUnidade({ id, inicial }: { id?: string; inicial?: { nome: string; cidade: string; uf: string; endereco: string | null; telefone: string | null } }) {
  return (
    <DialogoFormulario titulo={id ? `Editar ${inicial?.nome}` : "Nova unidade"} editar={Boolean(id)} acao={salvarUnidade.bind(null, id ?? null)}>
      {(e) => (
        <>
          <Campo rotulo="Nome" nome="nome" erros={e} obrigatorio>
            <Input id="nome" name="nome" defaultValue={inicial?.nome} placeholder="Ex.: Filial Goiânia" aria-invalid={invalido(e, "nome")} />
          </Campo>
          <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-3">
            <Campo rotulo="Cidade" nome="cidade" erros={e} obrigatorio>
              <Input id="cidade" name="cidade" defaultValue={inicial?.cidade} aria-invalid={invalido(e, "cidade")} />
            </Campo>
            <Campo rotulo="UF" nome="uf" erros={e} obrigatorio>
              <Input id="uf" name="uf" maxLength={2} defaultValue={inicial?.uf} className="uppercase" aria-invalid={invalido(e, "uf")} />
            </Campo>
          </div>
          <Campo rotulo="Endereço" nome="endereco" erros={e}>
            <Input id="endereco" name="endereco" defaultValue={inicial?.endereco ?? ""} />
          </Campo>
          <Campo rotulo="Telefone" nome="telefone" erros={e}>
            <Input id="telefone" name="telefone" defaultValue={inicial?.telefone ?? ""} />
          </Campo>
        </>
      )}
    </DialogoFormulario>
  );
}

export function DialogoSetor({ id, inicial }: { id?: string; inicial?: { nome: string; sigla: string } }) {
  return (
    <DialogoFormulario titulo={id ? `Editar ${inicial?.nome}` : "Novo setor"} editar={Boolean(id)} acao={salvarSetor.bind(null, id ?? null)}>
      {(e) => (
        <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
          <Campo rotulo="Nome" nome="nome" erros={e} obrigatorio>
            <Input id="nome" name="nome" defaultValue={inicial?.nome} aria-invalid={invalido(e, "nome")} />
          </Campo>
          <Campo rotulo="Sigla" nome="sigla" erros={e} obrigatorio>
            <Input id="sigla" name="sigla" maxLength={5} defaultValue={inicial?.sigla} className="uppercase" aria-invalid={invalido(e, "sigla")} />
          </Campo>
        </div>
      )}
    </DialogoFormulario>
  );
}

// ─── Metas do mês e ramais úteis (painel "Meu dia") ──────────

export function DialogoMeta({
  id,
  inicial,
  setores,
}: {
  id?: string;
  inicial?: { titulo: string; mes: string; setorId: string | null; valorMeta: number; valorRealizado: number };
  setores: Opcao[];
}) {
  return (
    <DialogoFormulario titulo={id ? `Editar ${inicial?.titulo}` : "Nova meta"} editar={Boolean(id)} acao={salvarMeta.bind(null, id ?? null)}>
      {(e) => (
        <>
          <Campo rotulo="Título" nome="titulo" erros={e} obrigatorio dica='Aparece como "Título — mês" no painel.'>
            <Input id="titulo" name="titulo" defaultValue={inicial?.titulo} placeholder="Ex.: Meta comercial" aria-invalid={invalido(e, "titulo")} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Mês" nome="mes" erros={e} obrigatorio>
              <Input id="mes" name="mes" type="month" defaultValue={inicial?.mes} aria-invalid={invalido(e, "mes")} />
            </Campo>
            <Campo rotulo="Setor" nome="setorId" erros={e} dica="Sem setor = meta geral.">
              <SelectNativo id="setorId" name="setorId" defaultValue={inicial?.setorId ?? ""}>
                <option value="">Empresa toda</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </SelectNativo>
            </Campo>
            <Campo rotulo="Meta (R$)" nome="valorMeta" erros={e} obrigatorio>
              <Input id="valorMeta" name="valorMeta" type="number" min={1} step={1000} defaultValue={inicial?.valorMeta} aria-invalid={invalido(e, "valorMeta")} />
            </Campo>
            <Campo rotulo="Realizado (R$)" nome="valorRealizado" erros={e} obrigatorio>
              <Input id="valorRealizado" name="valorRealizado" type="number" min={0} step={1000} defaultValue={inicial?.valorRealizado ?? 0} aria-invalid={invalido(e, "valorRealizado")} />
            </Campo>
          </div>
        </>
      )}
    </DialogoFormulario>
  );
}

export function DialogoRamal({
  id,
  inicial,
  unidades,
}: {
  id?: string;
  inicial?: { nome: string; numero: string; ordem: number; unidadeId: string | null };
  unidades: Opcao[];
}) {
  return (
    <DialogoFormulario titulo={id ? `Editar ${inicial?.nome}` : "Novo ramal"} editar={Boolean(id)} acao={salvarRamal.bind(null, id ?? null)}>
      {(e) => (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
            <Campo rotulo="Nome" nome="nome" erros={e} obrigatorio>
              <Input id="nome" name="nome" defaultValue={inicial?.nome} placeholder="Ex.: Suporte TI" aria-invalid={invalido(e, "nome")} />
            </Campo>
            <Campo rotulo="Ramal" nome="numero" erros={e} obrigatorio>
              <Input id="numero" name="numero" inputMode="numeric" defaultValue={inicial?.numero} className="font-mono" aria-invalid={invalido(e, "numero")} />
            </Campo>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
            <Campo rotulo="Unidade" nome="unidadeId" erros={e} dica="Sem unidade = aparece para todos.">
              <SelectNativo id="unidadeId" name="unidadeId" defaultValue={inicial?.unidadeId ?? ""}>
                <option value="">Todas as unidades</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </SelectNativo>
            </Campo>
            <Campo rotulo="Ordem" nome="ordem" erros={e}>
              <Input id="ordem" name="ordem" type="number" min={0} max={99} defaultValue={inicial?.ordem ?? 0} />
            </Campo>
          </div>
        </>
      )}
    </DialogoFormulario>
  );
}
