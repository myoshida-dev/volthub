import { LayoutSecao } from "@/components/layout/secao";

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return <LayoutSecao secao="/admin">{children}</LayoutSecao>;
}
