import { signOut } from "@/auth";

/**
 * Encerra uma sessão que deixou de ser válida (usuário desativado ou removido).
 * O logout normal do menu usa a server action `sair()`.
 */
export async function GET() {
  await signOut({ redirectTo: "/login?expirada=1" });
}
