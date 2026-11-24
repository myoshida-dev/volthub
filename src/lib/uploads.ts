import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento local de arquivos em `./uploads` (fora de `public/`).
 * Os arquivos são servidos por `/api/arquivos/...`, que checa a sessão e quem
 * pode ver cada arquivo; um atestado, por exemplo, não é público.
 *
 * Em produção, troque por um storage de objetos (S3, R2, Vercel Blob...):
 * só este módulo e a rota de arquivos precisam mudar.
 */
export const PASTA_UPLOADS = path.join(process.cwd(), "uploads");

export type PastaUpload = "avatares" | "solicitacoes" | "chamados" | "documentos";

const PDF = "application/pdf";
const PNG = "image/png";
const JPG = "image/jpeg";
const WEBP = "image/webp";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const TXT = "text/plain";

const EXTENSAO_POR_MIME: Record<string, string> = {
  [PDF]: "pdf",
  [PNG]: "png",
  [JPG]: "jpg",
  [WEBP]: "webp",
  [DOCX]: "docx",
  [XLSX]: "xlsx",
  [PPTX]: "pptx",
  [TXT]: "txt",
};

export const MIME_POR_EXTENSAO: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSAO_POR_MIME).map(([mime, ext]) => [ext, mime]),
);

export const TIPOS_ARQUIVO = {
  imagens: [PNG, JPG, WEBP],
  anexos: [PDF, PNG, JPG],
  documentos: [PDF, DOCX, XLSX, PPTX, PNG, JPG, TXT],
};

export class ErroUpload extends Error {}

/** Retorna o arquivo enviado, ou null se o input veio vazio. */
export function arquivoDoForm(valor: FormDataEntryValue | null): File | null {
  return valor instanceof File && valor.size > 0 ? valor : null;
}

export async function salvarArquivo(
  arquivo: File,
  pasta: PastaUpload,
  opcoes: { tipos: string[]; tamanhoMaxMb: number },
) {
  if (!opcoes.tipos.includes(arquivo.type)) {
    throw new ErroUpload("Tipo de arquivo não permitido.");
  }
  if (arquivo.size > opcoes.tamanhoMaxMb * 1024 * 1024) {
    throw new ErroUpload(`O arquivo deve ter no máximo ${opcoes.tamanhoMaxMb} MB.`);
  }

  const nomeInterno = `${randomUUID()}.${EXTENSAO_POR_MIME[arquivo.type]}`;
  await mkdir(path.join(PASTA_UPLOADS, pasta), { recursive: true });
  await writeFile(
    path.join(PASTA_UPLOADS, pasta, nomeInterno),
    Buffer.from(await arquivo.arrayBuffer()),
  );

  return {
    url: `/api/arquivos/${pasta}/${nomeInterno}`,
    nome: arquivo.name,
    mimeType: arquivo.type,
    tamanhoBytes: arquivo.size,
  };
}

/** Caminho absoluto dentro de ./uploads, ou null se tentar sair da pasta. */
export function resolverCaminho(relativo: string) {
  const alvo = path.resolve(PASTA_UPLOADS, relativo);
  return alvo.startsWith(PASTA_UPLOADS + path.sep) ? alvo : null;
}

export async function removerArquivo(url: string | null | undefined) {
  if (!url?.startsWith("/api/arquivos/")) return;
  const caminho = resolverCaminho(url.replace("/api/arquivos/", ""));
  if (caminho) await unlink(caminho).catch(() => undefined);
}

/** Link de download com o nome original do arquivo. */
export function linkDownload(url: string, nome: string) {
  return `${url}?nome=${encodeURIComponent(nome)}`;
}
