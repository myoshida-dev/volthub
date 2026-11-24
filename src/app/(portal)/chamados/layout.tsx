import { LayoutSecao } from "@/components/layout/secao";

export default function LayoutTi({ children }: { children: React.ReactNode }) {
  return <LayoutSecao secao="/chamados">{children}</LayoutSecao>;
}
