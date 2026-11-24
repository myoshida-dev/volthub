"use server";

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  metaSchema,
  ramalSchema,
  recursoSchema,
  setorSchema,
  unidadeSchema,
  usuarioSchema,
} from "@/features/admin/schemas";
import { registrarAuditoria } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth-guard";
import { dadosDoForm, falhaValidacao, type EstadoFormulario } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";

/** Senha temporária legível (sem 0/O, 1/l), exibida uma única vez ao admin. */
function gerarSenhaTemporaria() {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const numeros = "23456789";
  let senha = "";
  for (let i = 0; i < 6; i++) senha += letras[randomInt(letras.length)];
  for (let i = 0; i < 3; i++) senha += numeros[randomInt(numeros.length)];
  return senha;
}

function ehViolacaoUnica(erro: unknown, campo: string) {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === "P2002" &&
    JSON.stringify(erro.meta?.target ?? "").includes(campo)
  );
}

/** Próxima matrícula livre (sequencial numérica: 10027, 10028…). */
async function proximaMatricula() {
  const todas = await prisma.usuario.findMany({ select: { matricula: true } });
  const maior = Math.max(10000, ...todas.map((u) => Number(u.matricula)).filter(Number.isFinite));
  return String(maior + 1);
}

/** Impede ciclos na hierarquia (A gestor de B, B gestor de A). */
async function criaCiclo(usuarioId: string, gestorId: string) {
  let atual: string | null = gestorId;
  for (let passos = 0; atual && passos < 50; passos++) {
    if (atual === usuarioId) return true;
    const proximo: { gestorId: string | null } | null = await prisma.usuario.findUnique({
      where: { id: atual },
      select: { gestorId: true },
    });
    atual = proximo?.gestorId ?? null;
  }
  return false;
}

// ─── Usuários ────────────────────────────────────────────────

export async function salvarUsuario(
  id: string | null,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirPermissao("usuario:gerenciar");
  const dados = usuarioSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const d = { ...dados.data, equipe: dados.data.equipe ?? null, gestorId: dados.data.gestorId ?? null };

  if (id && id === admin.id && (!d.ativo || d.perfil !== "ADMIN")) {
    return { erro: "Você não pode desativar nem remover o próprio acesso de administrador." };
  }
  if (id && d.gestorId && (await criaCiclo(id, d.gestorId))) {
    return { erro: "Hierarquia inválida.", erros: { gestorId: ["Essa escolha cria um ciclo na hierarquia."] } };
  }

  try {
    if (id) {
      const antes = await prisma.usuario.findUniqueOrThrow({ where: { id } });
      await prisma.usuario.update({ where: { id }, data: d });
      const alterados = (Object.keys(d) as (keyof typeof d)[]).filter(
        (campo) => String(antes[campo] ?? "") !== String(d[campo] ?? ""),
      );
      await registrarAuditoria({
        usuarioId: admin.id,
        acao: "USUARIO_ATUALIZADO",
        entidade: "Usuario",
        entidadeId: id,
        dados: { campos: alterados },
      });
      revalidatePath("/admin/usuarios");
      return { ok: true, mensagem: "Usuário atualizado." };
    }

    const senha = gerarSenhaTemporaria();
    const criado = await prisma.usuario.create({
      data: { ...d, matricula: await proximaMatricula(), senhaHash: await bcrypt.hash(senha, 10) },
    });
    await registrarAuditoria({
      usuarioId: admin.id,
      acao: "USUARIO_CRIADO",
      entidade: "Usuario",
      entidadeId: criado.id,
      dados: { email: criado.email, login: criado.login, matricula: criado.matricula, perfil: criado.perfil },
    });
    revalidatePath("/admin/usuarios");
    return {
      ok: true,
      mensagem: `${criado.nome} foi cadastrado(a) com a matrícula ${criado.matricula}.`,
      destaque: `Usuário: ${criado.login} · Senha temporária: ${senha}. Ela não será mostrada de novo; peça para a pessoa trocá-la em "Meu perfil".`,
    };
  } catch (erro) {
    if (ehViolacaoUnica(erro, "email")) {
      return { erro: "E-mail já cadastrado.", erros: { email: ["Já existe um usuário com este e-mail."] } };
    }
    if (ehViolacaoUnica(erro, "login")) {
      return { erro: "Usuário já em uso.", erros: { login: ["Já existe alguém com este usuário."] } };
    }
    throw erro;
  }
}

export async function redefinirSenha(id: string): Promise<EstadoFormulario> {
  const admin = await exigirPermissao("usuario:gerenciar");
  const senha = gerarSenhaTemporaria();
  await prisma.usuario.update({ where: { id }, data: { senhaHash: await bcrypt.hash(senha, 10) } });
  await registrarAuditoria({ usuarioId: admin.id, acao: "SENHA_REDEFINIDA", entidade: "Usuario", entidadeId: id });
  return { ok: true, destaque: `Nova senha temporária: ${senha}` };
}

// ─── Recursos ────────────────────────────────────────────────

export async function salvarRecurso(
  id: string | null,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirPermissao("recurso:gerenciar");
  const dados = recursoSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const d = dados.data;

  // Campos que não se aplicam ao tipo ficam vazios.
  const data = {
    nome: d.nome,
    tipo: d.tipo,
    unidadeId: d.unidadeId,
    descricao: d.descricao ?? null,
    ativo: d.ativo,
    capacidade: d.tipo === "SALA" ? (d.capacidade ?? null) : null,
    localizacao: d.tipo === "SALA" ? (d.localizacao ?? null) : null,
    placa: d.tipo === "VEICULO" ? (d.placa?.replace("-", "") ?? null) : null,
    modelo: d.tipo === "VEICULO" ? (d.modelo ?? null) : null,
    kmAtual: d.tipo === "VEICULO" ? (d.kmAtual ?? null) : null,
  };

  try {
    const recurso = id
      ? await prisma.recurso.update({ where: { id }, data })
      : await prisma.recurso.create({ data });
    await registrarAuditoria({
      usuarioId: admin.id,
      acao: id ? "RECURSO_ATUALIZADO" : "RECURSO_CRIADO",
      entidade: "Recurso",
      entidadeId: recurso.id,
      dados: { nome: recurso.nome },
    });
  } catch (erro) {
    if (ehViolacaoUnica(erro, "placa")) {
      return { erro: "Placa já cadastrada.", erros: { placa: ["Já existe um veículo com esta placa."] } };
    }
    throw erro;
  }

  revalidatePath("/admin/recursos");
  revalidatePath("/reservas");
  redirect("/admin/recursos");
}

// ─── Unidades e setores ──────────────────────────────────────

export async function salvarUnidade(
  id: string | null,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirPermissao("usuario:gerenciar");
  const dados = unidadeSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);

  try {
    const unidade = id
      ? await prisma.unidade.update({ where: { id }, data: dados.data })
      : await prisma.unidade.create({ data: dados.data });
    await registrarAuditoria({
      usuarioId: admin.id,
      acao: id ? "UNIDADE_ATUALIZADA" : "UNIDADE_CRIADA",
      entidade: "Unidade",
      entidadeId: unidade.id,
      dados: { nome: unidade.nome },
    });
  } catch (erro) {
    if (ehViolacaoUnica(erro, "nome")) return { erro: "Já existe uma unidade com este nome.", erros: { nome: ["Nome em uso."] } };
    throw erro;
  }

  revalidatePath("/admin/estrutura");
  return { ok: true, mensagem: id ? "Unidade atualizada." : "Unidade criada." };
}

export async function salvarSetor(
  id: string | null,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirPermissao("usuario:gerenciar");
  const dados = setorSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);

  try {
    const setor = id
      ? await prisma.setor.update({ where: { id }, data: dados.data })
      : await prisma.setor.create({ data: dados.data });
    await registrarAuditoria({
      usuarioId: admin.id,
      acao: id ? "SETOR_ATUALIZADO" : "SETOR_CRIADO",
      entidade: "Setor",
      entidadeId: setor.id,
      dados: { nome: setor.nome },
    });
  } catch (erro) {
    if (ehViolacaoUnica(erro, "nome") || ehViolacaoUnica(erro, "sigla")) {
      return { erro: "Nome ou sigla já em uso por outro setor." };
    }
    throw erro;
  }

  revalidatePath("/admin/estrutura");
  return { ok: true, mensagem: id ? "Setor atualizado." : "Setor criado." };
}

// ─── Painel inicial: metas do mês e ramais úteis ─────────────

export async function salvarMeta(
  id: string | null,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirPermissao("usuario:gerenciar");
  const dados = metaSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const data = { ...dados.data, setorId: dados.data.setorId ?? null };

  const meta = id
    ? await prisma.metaMensal.update({ where: { id }, data })
    : await prisma.metaMensal.create({ data });
  await registrarAuditoria({
    usuarioId: admin.id,
    acao: id ? "META_ATUALIZADA" : "META_CRIADA",
    entidade: "MetaMensal",
    entidadeId: meta.id,
    dados: { titulo: meta.titulo, valorMeta: meta.valorMeta, valorRealizado: meta.valorRealizado },
  });

  revalidatePath("/admin/painel");
  revalidatePath("/");
  return { ok: true, mensagem: id ? "Meta atualizada." : "Meta criada." };
}

export async function excluirMeta(id: string) {
  const admin = await exigirPermissao("usuario:gerenciar");
  await prisma.metaMensal.delete({ where: { id } });
  await registrarAuditoria({ usuarioId: admin.id, acao: "META_EXCLUIDA", entidade: "MetaMensal", entidadeId: id });
  revalidatePath("/admin/painel");
  revalidatePath("/");
}

export async function salvarRamal(
  id: string | null,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const admin = await exigirPermissao("usuario:gerenciar");
  const dados = ramalSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const data = { ...dados.data, unidadeId: dados.data.unidadeId ?? null };

  const ramal = id
    ? await prisma.ramalUtil.update({ where: { id }, data })
    : await prisma.ramalUtil.create({ data });
  await registrarAuditoria({
    usuarioId: admin.id,
    acao: id ? "RAMAL_ATUALIZADO" : "RAMAL_CRIADO",
    entidade: "RamalUtil",
    entidadeId: ramal.id,
    dados: { nome: ramal.nome, numero: ramal.numero },
  });

  revalidatePath("/admin/painel");
  revalidatePath("/");
  return { ok: true, mensagem: id ? "Ramal atualizado." : "Ramal adicionado." };
}

export async function excluirRamal(id: string) {
  const admin = await exigirPermissao("usuario:gerenciar");
  await prisma.ramalUtil.delete({ where: { id } });
  await registrarAuditoria({ usuarioId: admin.id, acao: "RAMAL_EXCLUIDO", entidade: "RamalUtil", entidadeId: id });
  revalidatePath("/admin/painel");
  revalidatePath("/");
}
