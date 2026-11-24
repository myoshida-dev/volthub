-- CreateTable
CREATE TABLE "MetaMensal" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mes" DATE NOT NULL,
    "valorMeta" INTEGER NOT NULL,
    "valorRealizado" INTEGER NOT NULL DEFAULT 0,
    "setorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaMensal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RamalUtil" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "unidadeId" TEXT,

    CONSTRAINT "RamalUtil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaMensal_mes_idx" ON "MetaMensal"("mes");

-- CreateIndex
CREATE INDEX "RamalUtil_unidadeId_ordem_idx" ON "RamalUtil"("unidadeId", "ordem");

-- AddForeignKey
ALTER TABLE "MetaMensal" ADD CONSTRAINT "MetaMensal_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RamalUtil" ADD CONSTRAINT "RamalUtil_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
