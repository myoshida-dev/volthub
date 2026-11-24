-- Usuário de rede e matrícula, que também servem para entrar no portal.
-- A migration preenche as linhas já existentes antes de exigir os campos,
-- para rodar sem perder dados em um banco já populado.

ALTER TABLE "Usuario" ADD COLUMN "login" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "matricula" TEXT;

UPDATE "Usuario" SET "login" = lower(split_part("email", '@', 1));

UPDATE "Usuario" AS u
SET "matricula" = (10000 + r.n)::text
FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "criadoEm", "id") AS n FROM "Usuario") AS r
WHERE u."id" = r."id";

ALTER TABLE "Usuario" ALTER COLUMN "login" SET NOT NULL;
ALTER TABLE "Usuario" ALTER COLUMN "matricula" SET NOT NULL;

CREATE UNIQUE INDEX "Usuario_login_key" ON "Usuario"("login");
CREATE UNIQUE INDEX "Usuario_matricula_key" ON "Usuario"("matricula");