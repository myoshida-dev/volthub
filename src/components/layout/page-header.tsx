type PageHeaderProps = {
  titulo: string;
  descricao?: string;
  /** Linha pequena acima do título (ex.: data e unidade). */
  sobretitulo?: string;
  /** Botões de ação à direita (ex.: "Novo chamado"). */
  acoes?: React.ReactNode;
};

export function PageHeader({ titulo, descricao, sobretitulo, acoes }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {sobretitulo && <p className="text-sm text-muted-foreground">{sobretitulo}</p>}
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-foreground sm:text-[32px]">
          {titulo}
        </h1>
        {descricao && <p className="text-[15px] text-muted-foreground">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
