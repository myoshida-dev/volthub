"use client";

import { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";

import type { ReservaCalendario } from "@/features/reservas/tipos";

type CalendarioProps = {
  reservas: ReservaCalendario[];
  aoSelecionarPeriodo: (inicio: Date, fim: Date) => void;
  aoClicarReserva: (id: string) => void;
};

const ehTelaPequena = () => window.innerWidth < 768;

/** Calendário de reservas (FullCalendar). Carregado só no navegador. */
export default function Calendario({ reservas, aoSelecionarPeriodo, aoClicarReserva }: CalendarioProps) {
  const calendario = useRef<FullCalendar>(null);

  // No celular, começa na lista da semana (a grade de horários fica apertada).
  useEffect(() => {
    if (ehTelaPequena()) calendario.current?.getApi().changeView("listWeek");
  }, []);

  return (
    <FullCalendar
      ref={calendario}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      locale={ptBrLocale}
      initialView="timeGridWeek"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      }}
      buttonText={{ list: "Lista" }}
      height="auto"
      allDaySlot={false}
      slotMinTime="07:00:00"
      slotMaxTime="21:00:00"
      slotDuration="00:30:00"
      businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "18:00" }}
      nowIndicator
      selectable
      selectMirror
      selectAllow={(selecao) => selecao.end.getTime() > Date.now()}
      select={(selecao) => {
        aoSelecionarPeriodo(selecao.start, selecao.end);
        selecao.view.calendar.unselect();
      }}
      eventClick={(clique) => {
        clique.jsEvent.preventDefault();
        aoClicarReserva(clique.event.id);
      }}
      eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
      events={reservas.map((r) => ({
        id: r.id,
        title: `${r.recurso.nome} · ${r.titulo}`,
        start: r.inicio,
        end: r.fim,
        backgroundColor: r.status === "CONCLUIDA" ? "#94A3B8" : r.recurso.cor,
        borderColor: r.status === "CONCLUIDA" ? "#94A3B8" : r.recurso.cor,
        textColor: "#FFFFFF",
        extendedProps: { usuario: r.usuarioNome },
      }))}
      eventContent={(arg) => (
        <div className="overflow-hidden px-1 py-0.5 text-[11px] leading-tight">
          <p className="font-semibold">{arg.timeText}</p>
          <p className="truncate">{arg.event.title}</p>
          <p className="truncate opacity-80">{arg.event.extendedProps.usuario as string}</p>
        </div>
      )}
    />
  );
}
