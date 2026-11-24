"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export type PontoGrafico = { rotulo: string; valor: number };

type GraficoBarrasProps = {
  dados: PontoGrafico[];
  /** Nome da medida no tooltip e na tabela (ex.: "Chamados"). */
  medida: string;
  /** "vertical" = colunas; "horizontal" = barras deitadas (rótulos longos). */
  orientacao?: "vertical" | "horizontal";
  altura?: number;
};

// Série única: uma cor só (a principal da marca). Texto sempre em tokens de texto.
const COR_SERIE = "#0F3D4C";
const COR_GRADE = "#E3E9EC";
const COR_TEXTO = "#5A6B73";

function Dica({ active, payload, label, medida }: TooltipContentProps<number, string> & { medida: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
        <span className="size-2 rounded-sm" style={{ backgroundColor: COR_SERIE }} />
        {medida}: <span className="font-semibold text-foreground">{payload[0].value}</span>
      </p>
    </div>
  );
}

/**
 * Gráfico de barras de série única (sem legenda: o título do card nomeia a série).
 * Segue as specs do design: barra <= 24px, ponta arredondada de 4px, grade discreta,
 * tooltip no hover e tabela acessível com os mesmos dados.
 */
export function GraficoBarras({ dados, medida, orientacao = "vertical", altura = 240 }: GraficoBarrasProps) {
  const horizontal = orientacao === "horizontal";
  const eixoTexto = { fill: COR_TEXTO, fontSize: 12 };

  return (
    <div className="space-y-2">
      <div style={{ height: altura }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 16, bottom: 0, left: horizontal ? 8 : -16 }}
            barCategoryGap="30%"
          >
            <CartesianGrid stroke={COR_GRADE} strokeWidth={1} vertical={horizontal} horizontal={!horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" allowDecimals={false} tick={eixoTexto} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="rotulo" width={110} tick={eixoTexto} axisLine={false} tickLine={false} />
              </>
            ) : (
              <>
                <XAxis dataKey="rotulo" tick={eixoTexto} axisLine={{ stroke: COR_GRADE }} tickLine={false} />
                <YAxis allowDecimals={false} tick={eixoTexto} axisLine={false} tickLine={false} />
              </>
            )}
            <Tooltip
              cursor={{ fill: "rgba(15, 61, 76, 0.06)" }}
              content={(props) => <Dica {...(props as TooltipContentProps<number, string>)} medida={medida} />}
            />
            <Bar
              dataKey="valor"
              name={medida}
              fill={COR_SERIE}
              maxBarSize={24}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">Ver dados em tabela</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 font-medium">Categoria</th>
              <th className="py-1 text-right font-medium">{medida}</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.rotulo} className="border-b last:border-0">
                <td className="py-1">{d.rotulo}</td>
                <td className="py-1 text-right tabular-nums text-foreground">{d.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
