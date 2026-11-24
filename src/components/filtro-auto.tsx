"use client";

import { SelectNativo } from "@/components/ui/select-nativo";

/** Select de filtro que envia o formulário GET ao mudar. */
export function SelectFiltro(props: React.ComponentProps<typeof SelectNativo>) {
  return (
    <SelectNativo
      {...props}
      onChange={(e) => {
        props.onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
