"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { Ban, Car, DoorOpen, Gauge, Loader2, MapPin, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { BadgeRotulo } from "@/components/comuns";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNativo } from "@/components/ui/select-nativo";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelarReserva,
  criarReserva,
  registrarRetorno,
  registrarSaida,
} from "@/features/reservas/actions";
import type { RecursoCalendario, ReservaCalendario } from "@/features/reservas/tipos";
import { STATUS_RESERVA, TIPO_RECURSO } from "@/lib/rotulos";
import { formatarDataHora, formatarHora } from "@/lib/utils";

const Calendario = dynamic(() => import("@/features/reservas/calendario"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> Carregando calendário…
    </div>
  ),
});

/** Date → "AAAA-MM-DDTHH:mm" no fuso do navegador (input datetime-local). */
function paraInputLocal(data: Date) {
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** Próximo horário "redondo" (de 30 em 30 minutos). */
function proximaMeiaHora() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

type PainelProps = {
  recursos: RecursoCalendario[];
  reservas: ReservaCalendario[];
  minhas: ReservaCalendario[];
  usuarioId: string;
  ehAdmin: boolean;
};

export function PainelReservas({ recursos, reservas, minhas, usuarioId, ehAdmin }: PainelProps) {
  const [nova, setNova] = useState<{ inicio: Date; fim: Date } | null>(null);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);

  // A reserva aberta é buscada na lista atual (que o servidor atualiza a cada ação).
  const todas = [...reservas, ...minhas];
  const selecionada = todas.find((r) => r.id === selecionadaId) ?? null;

  function abrirNova(inicio?: Date, fim?: Date) {
    const i = inicio ?? proximaMeiaHora();
    setNova({ inicio: i, fim: fim ?? new Date(i.getTime() + 60 * 60 * 1000) });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {recursos.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: r.cor }} />
                {r.nome}
              </span>
            ))}
          </div>
          <Button size="sm" onClick={() => abrirNova()} disabled={recursos.length === 0}>
            <Plus /> Nova reserva
          </Button>
        </div>
        <div className="calendario-volt p-3 sm:p-4">
          <Calendario
            reservas={reservas}
            aoSelecionarPeriodo={(inicio, fim) => abrirNova(inicio, fim)}
            aoClicarReserva={setSelecionadaId}
          />
        </div>
      </Card>

      <Card className="h-fit gap-3">
        <CardHeader>
          <CardTitle className="text-base">Minhas próximas reservas</CardTitle>
        </CardHeader>
        <CardContent>
          {minhas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você não tem reservas futuras. Clique e arraste no calendário para reservar.
            </p>
          ) : (
            <ul className="space-y-2">
              {minhas.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionadaId(r.id)}
                    className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.recurso.cor }} />
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-medium">{r.recurso.nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.titulo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatarDataHora(r.inicio)} – {formatarHora(r.fim)}
                      </span>
                      {r.recurso.tipo === "VEICULO" && r.kmSaida !== null && (
                        <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 text-[11px] font-medium text-amber-800">
                          Em uso · registre o retorno
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={nova !== null} onOpenChange={(aberto) => !aberto && setNova(null)}>
        <DialogContent>
          {nova && (
            <FormNovaReserva
              key={nova.inicio.toISOString()}
              recursos={recursos}
              inicio={nova.inicio}
              fim={nova.fim}
              aoConcluir={() => setNova(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={selecionada !== null} onOpenChange={(aberto) => !aberto && setSelecionadaId(null)}>
        <DialogContent>
          {selecionada && (
            <DetalheReserva
              reserva={selecionada}
              podeGerenciar={selecionada.usuarioId === usuarioId || ehAdmin}
              aoFechar={() => setSelecionadaId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormNovaReserva({
  recursos,
  inicio,
  fim,
  aoConcluir,
}: {
  recursos: RecursoCalendario[];
  inicio: Date;
  fim: Date;
  aoConcluir: () => void;
}) {
  const [recursoId, setRecursoId] = useState(recursos[0]?.id ?? "");
  const recurso = recursos.find((r) => r.id === recursoId);
  const { estado, pendente, aoEnviar } = useAcaoFormulario(criarReserva, {
    // Converte o horário local do navegador para ISO (UTC) antes de enviar.
    transformar: (dados) => {
      for (const campo of ["inicio", "fim"]) {
        const valor = dados.get(campo);
        if (typeof valor === "string" && valor) dados.set(campo, new Date(valor).toISOString());
      }
    },
  });
  useToastSucesso(estado, aoConcluir);

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Nova reserva</DialogTitle>
        <DialogDescription>Salas: até 12 horas. Veículos: até 3 dias.</DialogDescription>
      </DialogHeader>

      <Campo rotulo="Sala ou veículo" nome="recursoId" erros={estado.erros} obrigatorio>
        <SelectNativo id="recursoId" name="recursoId" value={recursoId} onChange={(e) => setRecursoId(e.target.value)}>
          {(["SALA", "VEICULO"] as const).map((tipo) => {
            const doTipo = recursos.filter((r) => r.tipo === tipo);
            if (doTipo.length === 0) return null;
            return (
              <optgroup key={tipo} label={TIPO_RECURSO[tipo].rotulo + "s"}>
                {doTipo.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                    {r.capacidade ? ` · ${r.capacidade} lugares` : ""}
                    {r.placa ? ` · ${r.placa}` : ""}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </SelectNativo>
      </Campo>

      <Campo rotulo="Motivo" nome="titulo" erros={estado.erros} obrigatorio>
        <Input id="titulo" name="titulo" maxLength={100} placeholder={recurso?.tipo === "VEICULO" ? "Ex.: Visita a cliente" : "Ex.: Reunião de vendas"} aria-invalid={invalido(estado.erros, "titulo")} />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Início" nome="inicio" erros={estado.erros} obrigatorio>
          <Input id="inicio" name="inicio" type="datetime-local" step={900} defaultValue={paraInputLocal(inicio)} aria-invalid={invalido(estado.erros, "inicio")} />
        </Campo>
        <Campo rotulo="Término" nome="fim" erros={estado.erros} obrigatorio>
          <Input id="fim" name="fim" type="datetime-local" step={900} defaultValue={paraInputLocal(fim)} aria-invalid={invalido(estado.erros, "fim")} />
        </Campo>
      </div>

      {recurso?.tipo === "VEICULO" && (
        <Campo rotulo="Destino" nome="destino" erros={estado.erros} obrigatorio>
          <Input id="destino" name="destino" maxLength={150} placeholder="Ex.: Cliente Eletro Sul — Sorocaba/SP" aria-invalid={invalido(estado.erros, "destino")} />
        </Campo>
      )}

      <Campo rotulo="Observações" nome="observacoes" erros={estado.erros}>
        <Textarea id="observacoes" name="observacoes" rows={2} maxLength={500} />
      </Campo>

      <AlertaFormulario estado={estado} />
      <DialogFooter>
        <BotaoEnviar textoEnviando="Reservando…">Confirmar reserva</BotaoEnviar>
      </DialogFooter>
    </FormAcao>
  );
}

function DetalheReserva({
  reserva,
  podeGerenciar,
  aoFechar,
}: {
  reserva: ReservaCalendario;
  podeGerenciar: boolean;
  aoFechar: () => void;
}) {
  const [cancelando, iniciarCancelamento] = useTransition();
  const { recurso } = reserva;
  const ativa = reserva.status === "CONFIRMADA";
  const veiculo = recurso.tipo === "VEICULO";
  // Instante fixado na abertura do diálogo (render precisa ser puro).
  const [abertoEm] = useState(() => Date.now());
  const futura = new Date(reserva.fim).getTime() > abertoEm;

  function cancelar() {
    if (!window.confirm("Cancelar esta reserva?")) return;
    iniciarCancelamento(async () => {
      const resultado = await cancelarReserva(reserva.id);
      if (resultado.ok) {
        toast.success(resultado.mensagem);
        aoFechar();
      } else if (resultado.erro) {
        toast.error(resultado.erro);
      }
    });
  }

  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <BadgeRotulo {...TIPO_RECURSO[recurso.tipo]} />
          <BadgeRotulo {...STATUS_RESERVA[reserva.status]} />
        </div>
        <DialogTitle>{reserva.titulo}</DialogTitle>
        <DialogDescription>
          Reservado por {reserva.usuarioNome}
        </DialogDescription>
      </DialogHeader>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2">
          {veiculo ? <Car className="mt-0.5 size-4 text-muted-foreground" /> : <DoorOpen className="mt-0.5 size-4 text-muted-foreground" />}
          <div>
            <dt className="text-xs text-muted-foreground">{TIPO_RECURSO[recurso.tipo].rotulo}</dt>
            <dd className="font-medium">
              {recurso.nome}
              {recurso.placa && <span className="block text-xs font-normal text-muted-foreground">{recurso.modelo} · {recurso.placa}</span>}
              {recurso.capacidade && (
                <span className="block text-xs font-normal text-muted-foreground">
                  <Users className="mr-1 inline size-3" />{recurso.capacidade} lugares · {recurso.localizacao}
                </span>
              )}
            </dd>
          </div>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Horário</dt>
          <dd className="font-medium">
            {formatarDataHora(reserva.inicio)}
            <span className="block text-xs font-normal text-muted-foreground">até {formatarDataHora(reserva.fim)}</span>
          </dd>
        </div>
        {reserva.destino && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <dt className="text-xs text-muted-foreground">Destino</dt>
              <dd className="font-medium">{reserva.destino}</dd>
            </div>
          </div>
        )}
        {veiculo && (
          <div className="flex items-start gap-2">
            <Gauge className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <dt className="text-xs text-muted-foreground">Quilometragem</dt>
              <dd className="font-medium">
                Saída: {reserva.kmSaida?.toLocaleString("pt-BR") ?? "—"} · Retorno: {reserva.kmRetorno?.toLocaleString("pt-BR") ?? "—"}
                {reserva.kmSaida !== null && reserva.kmRetorno !== null && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {(reserva.kmRetorno - reserva.kmSaida).toLocaleString("pt-BR")} km rodados
                  </span>
                )}
              </dd>
            </div>
          </div>
        )}
        {reserva.observacoes && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Observações</dt>
            <dd className="whitespace-pre-line">{reserva.observacoes}</dd>
          </div>
        )}
      </dl>

      {podeGerenciar && ativa && veiculo && reserva.kmSaida === null && (
        <FormKm
          titulo="Registrar saída"
          descricao={`Último hodômetro registrado: ${recurso.kmAtual?.toLocaleString("pt-BR") ?? "—"} km.`}
          valorInicial={recurso.kmAtual ?? undefined}
          acao={registrarSaida.bind(null, reserva.id)}
          textoBotao="Registrar saída"
        />
      )}
      {podeGerenciar && ativa && veiculo && reserva.kmSaida !== null && (
        <FormKm
          titulo="Registrar retorno"
          descricao={`Saída com ${reserva.kmSaida.toLocaleString("pt-BR")} km. Informe o hodômetro na devolução.`}
          acao={registrarRetorno.bind(null, reserva.id)}
          textoBotao="Registrar retorno"
          aoConcluir={aoFechar}
        />
      )}

      {podeGerenciar && ativa && futura && reserva.kmSaida === null && (
        <DialogFooter>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={cancelar} disabled={cancelando}>
            {cancelando ? <Loader2 className="animate-spin" /> : <Ban />} Cancelar reserva
          </Button>
        </DialogFooter>
      )}
    </div>
  );
}

function FormKm({
  titulo,
  descricao,
  valorInicial,
  acao,
  textoBotao,
  aoConcluir,
}: {
  titulo: string;
  descricao: string;
  valorInicial?: number;
  acao: Parameters<typeof useAcaoFormulario>[0];
  textoBotao: string;
  aoConcluir?: () => void;
}) {
  const { estado, pendente, aoEnviar } = useAcaoFormulario(acao);
  useToastSucesso(estado, aoConcluir);

  return (
    <FormAcao onSubmit={aoEnviar} pendente={pendente} className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <div className="space-y-1">
          <Input name="km" type="number" inputMode="numeric" min={0} defaultValue={valorInicial} aria-label="Hodômetro (km)" aria-invalid={invalido(estado.erros, "km")} className="w-40" />
          {estado.erros?.km && <p className="text-xs font-medium text-destructive">{estado.erros.km[0]}</p>}
        </div>
        <BotaoEnviar variant="destaque">{textoBotao}</BotaoEnviar>
      </div>
      {!estado.erros?.km && <AlertaFormulario estado={estado} />}
    </FormAcao>
  );
}
