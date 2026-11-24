import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import type { Prisma, TipoRecurso } from "@prisma/client";

import { EstadoVazio } from "@/components/comuns";
import { SelectFiltro } from "@/components/filtro-auto";
import { PageHeader } from "@/components/layout/page-header";
import { PainelReservas } from "@/features/reservas/painel-reservas";
import { CORES_RECURSOS, type RecursoCalendario, type ReservaCalendario } from "@/features/reservas/tipos";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reservas" };

const incluirReserva = {
  usuario: { select: { nome: true } },
  recurso: { include: { unidade: { select: { nome: true } } } },
} satisfies Prisma.ReservaInclude;

type ReservaComDados = Prisma.ReservaGetPayload<{ include: typeof incluirReserva }>;

export default async function PaginaReservas({
  searchParams,
}: {
  searchParams: Promise<{ unidade?: string; tipo?: string }>;
}) {
  const usuario = await exigirSessao();
  const params = await searchParams;
  const unidadeId = params.unidade ?? usuario.unidadeId;
  const tipo = params.tipo === "SALA" || params.tipo === "VEICULO" ? (params.tipo as TipoRecurso) : undefined;

  const [unidades, todosRecursos] = await Promise.all([
    prisma.unidade.findMany({ orderBy: [{ matriz: "desc" }, { nome: "asc" }], select: { id: true, nome: true } }),
    prisma.recurso.findMany({ where: { ativo: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] }),
  ]);

  // Cor estável por recurso (índice na lista geral).
  const corDe = new Map(todosRecursos.map((r, i) => [r.id, CORES_RECURSOS[i % CORES_RECURSOS.length]]));
  const paraCliente = (r: (typeof todosRecursos)[number]): RecursoCalendario => ({
    id: r.id,
    nome: r.nome,
    tipo: r.tipo,
    descricao: r.descricao,
    capacidade: r.capacidade,
    localizacao: r.localizacao,
    placa: r.placa,
    modelo: r.modelo,
    kmAtual: r.kmAtual,
    cor: corDe.get(r.id)!,
  });

  const recursos = todosRecursos.filter((r) => r.unidadeId === unidadeId && (!tipo || r.tipo === tipo));
  const agora = new Date();
  const desde = new Date(agora.getTime() - 60 * 86400000);
  const ate = new Date(agora.getTime() + 180 * 86400000);

  const [reservas, minhas] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        recursoId: { in: recursos.map((r) => r.id) },
        status: { not: "CANCELADA" },
        inicio: { lt: ate },
        fim: { gt: desde },
      },
      include: incluirReserva,
    }),
    prisma.reserva.findMany({
      where: {
        usuarioId: usuario.id,
        status: "CONFIRMADA",
        OR: [{ fim: { gt: agora } }, { kmSaida: { not: null } }],
      },
      include: incluirReserva,
      orderBy: { inicio: "asc" },
      take: 8,
    }),
  ]);

  const serializar = (r: ReservaComDados): ReservaCalendario => ({
    id: r.id,
    titulo: r.titulo,
    inicio: r.inicio.toISOString(),
    fim: r.fim.toISOString(),
    status: r.status,
    destino: r.destino,
    observacoes: r.observacoes,
    kmSaida: r.kmSaida,
    kmRetorno: r.kmRetorno,
    usuarioId: r.usuarioId,
    usuarioNome: r.usuario.nome,
    recurso: { ...paraCliente(r.recurso), unidade: r.recurso.unidade.nome },
  });

  return (
    <>
      <PageHeader
        titulo="Reservas"
        descricao="Clique e arraste no calendário para reservar uma sala ou um veículo."
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <SelectFiltro name="unidade" defaultValue={unidadeId} className="w-56" aria-label="Unidade">
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </SelectFiltro>
        <SelectFiltro name="tipo" defaultValue={tipo ?? ""} className="w-44" aria-label="Tipo de recurso">
          <option value="">Salas e veículos</option>
          <option value="SALA">Só salas</option>
          <option value="VEICULO">Só veículos</option>
        </SelectFiltro>
      </form>

      {recursos.length === 0 ? (
        <EstadoVazio icone={CalendarX2} titulo="Nenhum recurso nesta unidade" descricao="Escolha outra unidade ou peça ao administrador para cadastrar salas e veículos." />
      ) : (
        <PainelReservas
          recursos={recursos.map(paraCliente)}
          reservas={reservas.map(serializar)}
          minhas={minhas.map(serializar)}
          usuarioId={usuario.id}
          ehAdmin={usuario.perfil === "ADMIN"}
        />
      )}
    </>
  );
}
