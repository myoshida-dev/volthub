import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { ehDaEquipe } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { MIME_POR_EXTENSAO, resolverCaminho } from "@/lib/uploads";

type UsuarioSessao = Session["user"];

/** Regras de quem pode baixar cada tipo de arquivo. */
async function podeVerArquivo(usuario: UsuarioSessao, pasta: string, url: string) {
  switch (pasta) {
    case "avatares":
    case "documentos":
      return true;

    case "solicitacoes": {
      const s = await prisma.solicitacao.findFirst({
        where: { anexoUrl: url },
        select: { solicitanteId: true, aprovadorId: true },
      });
      if (!s) return false;
      return (
        s.solicitanteId === usuario.id || s.aprovadorId === usuario.id || ehDaEquipe(usuario, "RH")
      );
    }

    case "chamados": {
      if (ehDaEquipe(usuario, "TI")) return true;
      const chamado = await prisma.chamado.findFirst({
        where: {
          solicitanteId: usuario.id,
          OR: [{ anexoUrl: url }, { comentarios: { some: { anexoUrl: url, interno: false } } }],
        },
        select: { id: true },
      });
      return Boolean(chamado);
    }

    default:
      return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caminho: string[] }> },
) {
  const sessao = await auth();
  if (!sessao?.user) return new NextResponse("Não autenticado.", { status: 401 });

  const { caminho } = await params;
  const relativo = caminho.join("/");
  const arquivo = resolverCaminho(relativo);
  if (!arquivo) return new NextResponse("Arquivo não encontrado.", { status: 404 });

  if (!(await podeVerArquivo(sessao.user, caminho[0], `/api/arquivos/${relativo}`))) {
    return new NextResponse("Acesso negado.", { status: 403 });
  }

  let conteudo: Buffer;
  try {
    conteudo = await readFile(arquivo);
  } catch {
    return new NextResponse("Arquivo não encontrado.", { status: 404 });
  }

  const extensao = path.extname(arquivo).slice(1).toLowerCase();
  const nomeDownload = request.nextUrl.searchParams.get("nome");

  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": MIME_POR_EXTENSAO[extensao] ?? "application/octet-stream",
      "Content-Length": String(conteudo.length),
      // Anexos sensíveis (atestados, prints de chamados) não ficam no cache do navegador.
      "Cache-Control": ["avatares", "documentos"].includes(caminho[0]) ? "private, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": nomeDownload
        ? `attachment; filename*=UTF-8''${encodeURIComponent(nomeDownload)}`
        : "inline",
    },
  });
}
