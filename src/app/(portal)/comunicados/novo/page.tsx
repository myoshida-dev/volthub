import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { criarComunicado } from "@/features/comunicados/actions";
import { opcoesPublicoAlvo } from "@/features/comunicados/consultas";
import { FormComunicado } from "@/features/comunicados/form-comunicado";
import { exigirPermissao } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Novo comunicado" };

export default async function PaginaNovoComunicado() {
  await exigirPermissao("comunicado:publicar");
  const { unidades, setores } = await opcoesPublicoAlvo();

  return (
    <>
      <PageHeader
        titulo="Novo comunicado"
        descricao="O público-alvo recebe uma notificação assim que você publicar."
      />
      <Card className="max-w-3xl">
        <CardContent>
          <FormComunicado
            acao={criarComunicado}
            unidades={unidades}
            setores={setores}
            textoBotao="Publicar comunicado"
          />
        </CardContent>
      </Card>
    </>
  );
}
