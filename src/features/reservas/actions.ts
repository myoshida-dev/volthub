"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { validarKmRetorno, validarPeriodo } from "@/features/reservas/regras";
import { registrarAuditoria } from "@/lib/auditoria";
import { exigirSessao } from "@/lib/auth-guard";
import { dadosDoForm, falhaValidacao, textoOpcional, type EstadoFormulario } from "@/lib/formularios";
import { notificar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";
import { formatarDataHora, formatarHora } from "@/lib/utils";

const reservaSchema = z.object({
  recursoId: z.string().min(1, "Escolha a sala ou o veículo."),
  titulo: z.string().trim().min(3, "Informe o motivo da reserva.").max(100, "Use no máximo 100 caracteres."),
  inicio: z.iso.datetime({ offset: true, error: "Informe o início." }).transform((s) => new Date(s)),
  fim: z.iso.datetime({ offset: true, error: "Informe o término." }).transform((s) => new Date(s)),
  destino: textoOpcional(150),
  observacoes: textoOpcional(500),
});

const kmSchema = z.coerce
  .number({ error: "Informe a quilometragem." })
  .int("Use um número inteiro.")
  .min(0, "Quilometragem inválida.")
  .max(2_000_000, "Quilometragem inválida.");

/** O banco recusou por sobreposição (exclusion constraint da migration). */
function ehConflitoNoBanco(erro: unknown) {
  return String(erro instanceof Error ? erro.message : erro).includes("Reserva_sem_sobreposicao");
}

function erroKm(erro: z.ZodError): EstadoFormulario {
  const mensagem = erro.issues[0]?.message ?? "Quilometragem inválida.";
  return { erro: mensagem, erros: { km: [mensagem] } };
}

const MENSAGEM_CONFLITO = "Este horário acabou de ser reservado por outra pessoa. Escolha outro.";

export async function criarReserva(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  const dados = reservaSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const { recursoId, inicio, fim, titulo, destino, observacoes } = dados.data;

  const recurso = await prisma.recurso.findFirst({ where: { id: recursoId, ativo: true } });
  if (!recurso) return { erro: "Recurso indisponível.", erros: { recursoId: ["Recurso indisponível."] } };

  const erroPeriodo = validarPeriodo(recurso.tipo, inicio, fim);
  if (erroPeriodo) return { erro: erroPeriodo, erros: { fim: [erroPeriodo] } };
  if (recurso.tipo === "VEICULO" && !destino) {
    return { erro: "Informe o destino.", erros: { destino: ["Informe o destino da viagem."] } };
  }

  // Checagem amigável antes de gravar; a constraint do banco cobre a corrida.
  const conflito = await prisma.reserva.findFirst({
    where: { recursoId, status: "CONFIRMADA", inicio: { lt: fim }, fim: { gt: inicio } },
    include: { usuario: { select: { nome: true } } },
  });
  if (conflito) {
    return {
      erro: `${recurso.nome} já está reservado(a) por ${conflito.usuario.nome} de ${formatarDataHora(conflito.inicio)} até ${formatarHora(conflito.fim)}.`,
    };
  }

  let reservaId: string;
  try {
    const reserva = await prisma.reserva.create({
      data: { recursoId, usuarioId: usuario.id, titulo, inicio, fim, destino, observacoes },
    });
    reservaId = reserva.id;
  } catch (erro) {
    if (ehConflitoNoBanco(erro)) return { erro: MENSAGEM_CONFLITO };
    throw erro;
  }

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "RESERVA_CRIADA",
    entidade: "Reserva",
    entidadeId: reservaId,
    dados: { recurso: recurso.nome, inicio: inicio.toISOString(), fim: fim.toISOString() },
  });

  revalidatePath("/reservas");
  return { ok: true, mensagem: `${recurso.nome} reservado(a) para ${formatarDataHora(inicio)}.` };
}

async function buscarReservaGerenciavel(id: string) {
  const usuario = await exigirSessao();
  const reserva = await prisma.reserva.findUnique({ where: { id }, include: { recurso: true } });
  const pode = reserva && (reserva.usuarioId === usuario.id || usuario.perfil === "ADMIN");
  return { usuario, reserva: pode ? reserva : null };
}

export async function cancelarReserva(id: string): Promise<EstadoFormulario> {
  const { usuario, reserva } = await buscarReservaGerenciavel(id);
  if (!reserva) return { erro: "Você não pode cancelar esta reserva." };
  if (reserva.status !== "CONFIRMADA") return { erro: "Esta reserva não está mais ativa." };
  if (reserva.kmSaida !== null) return { erro: "O veículo já saiu. Registre o retorno em vez de cancelar." };

  await prisma.reserva.update({ where: { id }, data: { status: "CANCELADA" } });
  await registrarAuditoria({ usuarioId: usuario.id, acao: "RESERVA_CANCELADA", entidade: "Reserva", entidadeId: id });
  if (reserva.usuarioId !== usuario.id) {
    await notificar([reserva.usuarioId], {
      tipo: "RESERVA",
      titulo: "Reserva cancelada pela administração",
      mensagem: `${reserva.recurso.nome} em ${formatarDataHora(reserva.inicio)}.`,
      link: "/reservas",
    });
  }

  revalidatePath("/reservas");
  return { ok: true, mensagem: "Reserva cancelada." };
}

export async function registrarSaida(
  id: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const { usuario, reserva } = await buscarReservaGerenciavel(id);
  if (!reserva || reserva.recurso.tipo !== "VEICULO") return { erro: "Reserva inválida." };
  if (reserva.status !== "CONFIRMADA" || reserva.kmSaida !== null) return { erro: "A saída já foi registrada." };

  const km = kmSchema.safeParse(formData.get("km"));
  if (!km.success) return erroKm(km.error);
  if (reserva.recurso.kmAtual !== null && km.data < reserva.recurso.kmAtual) {
    return { erro: `O hodômetro não pode ser menor que o último registro (${reserva.recurso.kmAtual.toLocaleString("pt-BR")} km).` };
  }

  await prisma.reserva.update({ where: { id }, data: { kmSaida: km.data } });
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "VEICULO_SAIDA",
    entidade: "Reserva",
    entidadeId: id,
    dados: { km: km.data },
  });

  revalidatePath("/reservas");
  return { ok: true, mensagem: "Saída registrada. Boa viagem!" };
}

export async function registrarRetorno(
  id: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const { usuario, reserva } = await buscarReservaGerenciavel(id);
  if (!reserva || reserva.recurso.tipo !== "VEICULO" || reserva.kmSaida === null) {
    return { erro: "Registre a saída antes do retorno." };
  }
  if (reserva.status !== "CONFIRMADA") return { erro: "O retorno já foi registrado." };

  const km = kmSchema.safeParse(formData.get("km"));
  if (!km.success) return erroKm(km.error);
  const erroValidacaoKm = validarKmRetorno(reserva.kmSaida, km.data);
  if (erroValidacaoKm) return { erro: erroValidacaoKm, erros: { km: [erroValidacaoKm] } };

  // Libera o veículo a partir de agora se ele voltou antes do previsto.
  const agora = new Date();
  await prisma.$transaction([
    prisma.reserva.update({
      where: { id },
      data: {
        kmRetorno: km.data,
        status: "CONCLUIDA",
        fim: agora < reserva.fim && agora > reserva.inicio ? agora : reserva.fim,
      },
    }),
    prisma.recurso.update({ where: { id: reserva.recursoId }, data: { kmAtual: km.data } }),
  ]);
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "VEICULO_RETORNO",
    entidade: "Reserva",
    entidadeId: id,
    dados: { kmSaida: reserva.kmSaida, kmRetorno: km.data, percorrido: km.data - reserva.kmSaida },
  });

  revalidatePath("/reservas");
  return { ok: true, mensagem: `Retorno registrado: ${(km.data - reserva.kmSaida).toLocaleString("pt-BR")} km rodados.` };
}
