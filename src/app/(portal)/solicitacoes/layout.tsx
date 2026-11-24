import { LayoutSecao } from "@/components/layout/secao";

export default function LayoutRh({ children }: { children: React.ReactNode }) {
  return <LayoutSecao secao="/solicitacoes">{children}</LayoutSecao>;
}
