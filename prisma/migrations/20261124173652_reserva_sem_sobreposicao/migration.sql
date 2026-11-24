-- Impede reservas sobrepostas do mesmo recurso diretamente no banco.
--
-- A server action também valida o conflito antes de gravar, mas só a
-- constraint garante a regra quando duas requisições chegam ao mesmo tempo.
-- Reservas canceladas ou concluídas ficam fora da regra (cláusula WHERE).
-- O intervalo é [inicio, fim): uma reserva pode começar no minuto exato em
-- que a anterior termina.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reserva"
  ADD CONSTRAINT "Reserva_periodo_valido" CHECK ("fim" > "inicio");

ALTER TABLE "Reserva"
  ADD CONSTRAINT "Reserva_sem_sobreposicao"
  EXCLUDE USING gist (
    "recursoId" WITH =,
    tsrange("inicio", "fim", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMADA');
