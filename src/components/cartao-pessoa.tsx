import Link from "next/link";
import { Mail, PhoneCall } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { iniciais } from "@/lib/utils";

export type PessoaResumo = {
  id: string;
  nome: string;
  cargo: string;
  email: string;
  ramal: string | null;
  avatarUrl: string | null;
  setor: { nome: string };
  unidade: { nome: string };
};

export const selecionarPessoa = {
  id: true,
  nome: true,
  cargo: true,
  email: true,
  ramal: true,
  avatarUrl: true,
  setor: { select: { nome: true } },
  unidade: { select: { nome: true } },
} as const;

/** Cartão de colaborador usado no diretório e na busca. */
export function CartaoPessoa({ pessoa }: { pessoa: PessoaResumo }) {
  return (
    <Card className="group relative gap-0 py-4 transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3 px-4">
        <Avatar className="size-12">
          {pessoa.avatarUrl && <AvatarImage src={pessoa.avatarUrl} alt="" />}
          <AvatarFallback>{iniciais(pessoa.nome)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/diretorio/${pessoa.id}`}
            className="block truncate font-semibold text-primary after:absolute after:inset-0 group-hover:underline"
          >
            {pessoa.nome}
          </Link>
          <p className="truncate text-sm text-muted-foreground">{pessoa.cargo}</p>
          <p className="truncate text-xs text-muted-foreground">
            {pessoa.setor.nome} · {pessoa.unidade.nome.replace(/^(Matriz|Filial) /, "")}
          </p>
          <div className="relative z-10 mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <a href={`mailto:${pessoa.email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
              <Mail className="size-3.5" /> E-mail
            </a>
            {pessoa.ramal && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <PhoneCall className="size-3.5" /> Ramal {pessoa.ramal}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
