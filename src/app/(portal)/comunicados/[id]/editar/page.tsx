import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { atualizarComunicado } from "@/features/comunicados/actions";
import { opcoesPublicoAlvo, podeEditarComunicado } from "@/features/comunicados/consultas";
import { FormComunicado } from "@/features/comunicados/form-comunicado";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { FUSO } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar comunicado" };

export default async function PaginaEditarComunicado({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirSessao();
  const { id } = await params;
  const comunicado = await prisma.comunicado.findUnique({
    where: { id },
    include: { unidades: { select: { id: true } }, setores: { select: { id: true } } },
  });
  if (!comunicado) notFound();
  if (!podeEditarComunicado(usuario, comunicado)) redirect("/acesso-negado");

  const { unidades, setores } = await opcoesPublicoAlvo();

  return (
    <>
      <PageHeader titulo="Editar comunicado" descricao={comunicado.titulo} />
      <Card className="max-w-3xl">
        <CardContent>
          <FormComunicado
            acao={atualizarComunicado.bind(null, comunicado.id)}
            unidades={unidades}
            setores={setores}
            textoBotao="Salvar alterações"
            inicial={{
              titulo: comunicado.titulo,
              categoria: comunicado.categoria,
              conteudo: comunicado.conteudo,
              fixado: comunicado.fixado,
              expiraEm: comunicado.expiraEm
                ? new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(comunicado.expiraEm)
                : "",
              unidadeIds: comunicado.unidades.map((u) => u.id),
              setorIds: comunicado.setores.map((s) => s.id),
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
