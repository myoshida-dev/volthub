import { SUBSECOES, type ItemSubsecao } from "@/components/layout/nav-config";
import { SubNav } from "@/components/layout/sub-nav";
import { exigirSessao } from "@/lib/auth-guard";
import { pode } from "@/lib/permissions";

/**
 * Layout de seção: mostra as sub-abas permitidas ao usuário.
 * Com uma aba só (ex.: colaborador no RH), as sub-abas ficam escondidas.
 */
export async function LayoutSecao({
  secao,
  children,
}: {
  secao: keyof typeof SUBSECOES;
  children: React.ReactNode;
}) {
  const usuario = await exigirSessao();
  const itens = (SUBSECOES[secao] as ItemSubsecao[])
    .filter((item) => !item.permissao || pode(usuario, item.permissao))
    .map(({ titulo, href }) => ({ titulo, href }));

  return (
    <>
      {itens.length > 1 && <SubNav itens={itens} />}
      {children}
    </>
  );
}
