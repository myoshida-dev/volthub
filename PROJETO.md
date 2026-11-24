# VoltHub — Escopo do projeto

Portal interno (intranet) da **Volt Distribuidora**, empresa **fictícia** de materiais elétricos.
Projeto de portfólio: o foco é código limpo, bem organizado e fácil de rodar.

## A empresa

| | |
|---|---|
| Ramo | Distribuição de materiais elétricos |
| Colaboradores | ~140 |
| Unidades | Matriz em **Campinas/SP**, filiais em **Curitiba/PR** e **Belo Horizonte/MG** |
| Setores | Diretoria, Comercial, Logística, Financeiro, Compras, Recursos Humanos, Tecnologia da Informação |

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix UI)
- **PostgreSQL** + **Prisma**
- **Auth.js** (NextAuth v5) com login por credenciais e senhas com **bcrypt**
- **Recharts** (gráficos) e **FullCalendar** (reservas), a partir das etapas dos módulos
- Interface em **português do Brasil** e **responsiva**

## Perfis de acesso

| Perfil | Quem é | O que pode além do básico |
|---|---|---|
| `COLABORADOR` | Qualquer funcionário | Usa o portal: lê comunicados, abre solicitações e chamados, reserva recursos |
| `GESTOR` | Gestor de setor | Aprova ou reprova solicitações da sua equipe e publica comunicados para o setor |
| `EQUIPE` | Equipes de RH ou TI (campo `equipe`) | **RH:** gerencia solicitações, comunicados e documentos. **TI:** atende a fila de chamados |
| `ADMIN` | Administração do sistema | Acesso total: usuários, unidades, setores, recursos e auditoria |

> O campo `equipe` (`RH` ou `TI`) é independente do perfil. Um gestor de RH, por exemplo, tem
> perfil `GESTOR` com `equipe = RH` e por isso também acessa a gestão de RH.

As permissões ficam centralizadas em `src/lib/permissions.ts` e são checadas em dois níveis:

1. **`proxy.ts`**: checagem rápida de rota (redireciona para o login ou para `/acesso-negado`);
2. **Servidor**: `exigirPermissao()` em páginas e server actions, sem confiar só no menu ou na rota.

## Módulos do MVP

1. **Autenticação e "Meu perfil"**: login, sessão, dados do colaborador.
2. **Mural de comunicados**: categorias, público-alvo por unidade ou setor, fixar no topo, botão "estou ciente" com contador de leituras.
3. **Solicitações de RH**: férias, folga, atestado (com anexo) e atualização de dados; aprovação pelo gestor e histórico.
4. **Chamados de TI**: categoria, prioridade, status, responsável, comentários e anexo.
5. **Reservas de salas e veículos**: calendário sem sobreposição de horários; km de saída e de retorno para veículos.
6. **Diretório de colaboradores e biblioteca de documentos**.

## Entidades

| Entidade | Descrição |
|---|---|
| `Unidade` | Matriz e filiais |
| `Setor` | Setores da empresa (válidos para todas as unidades) |
| `Usuario` | Colaborador, com perfil, equipe, unidade, setor e gestor direto |
| `Comunicado` | Publicação do mural; público-alvo é N:N com `Unidade` e `Setor` (vazio = todos) |
| `LeituraComunicado` | Registro de "estou ciente" (único por usuário e comunicado) |
| `Solicitacao` | Pedido de RH com fluxo de aprovação |
| `Chamado` | Ticket de TI com número sequencial |
| `ComentarioChamado` | Conversa no chamado (pode ser interna da TI) |
| `Recurso` | Sala ou veículo reservável |
| `Reserva` | Reserva de recurso; veículos registram km de saída e de retorno |
| `Documento` | Arquivo da biblioteca (políticas, manuais, formulários…) |
| `Notificacao` | Aviso para o usuário (sino na barra superior) |
| `MetaMensal` | Meta do mês exibida no painel "Meu dia" (por setor ou geral) |
| `RamalUtil` | Ramais de atalho do painel (por unidade ou para todos) |
| `LogAuditoria` | Trilha de ações relevantes (login, aprovações, alterações) |

### Regras de negócio importantes

- **Reservas sem sobreposição:** validação na server action, dentro de uma transação, e também
  uma *exclusion constraint* no PostgreSQL (`btree_gist`), para que o banco recuse conflitos
  mesmo em requisições simultâneas.
- **Aprovação de solicitações:** vai para o `gestor` direto do solicitante; o RH acompanha todas.
- **Comunicados:** o público-alvo vazio significa "toda a empresa".
- **Auditoria:** login, aprovações e alterações administrativas geram `LogAuditoria`.

## Identidade visual

| Token | Cor | Uso |
|---|---|---|
| Principal | `#0F3D4C` (azul-petróleo) | Aba ativa, botões primários, cartão de meta |
| Destaque | `#F5B700` (amarelo) | Ações "faça agora", progresso, contadores |
| Fundo | `#F4F2ED` (off-white quente) | Fundo das páginas, com cartões brancos e borda suave |
| Tipografia | Figtree + JetBrains Mono | Texto geral; horários, ramais e rótulos em mono |

Layout: **barra superior** com abas (Meu dia, Comunicados, RH, TI, Reservas, Pessoas,
Documentos e Admin), busca com atalho `/`, notificações e avatar. Cada seção com telas de
gestão tem **sub-abas** (ex.: RH → Minhas solicitações · Aprovações · Gestão de RH), que só
aparecem para quem tem permissão. No celular, as abas viram uma gaveta.

A página inicial **"Meu dia"** reúne o que precisa de ação ("Precisa de você"), a meta do mês,
os comunicados recentes, a agenda de hoje, os aniversariantes e os ramais úteis.

## Roadmap

| Etapa | Entrega | Status |
|---|---|---|
| 1 | Estrutura, schema Prisma, seed, login, proteção por perfil, layout base | ✅ |
| 2 | Meu perfil (foto, ramal, troca de senha) e mural de comunicados | ✅ |
| 3 | Solicitações de RH com aprovação, anexos e histórico | ✅ |
| 4 | Chamados de TI com fila, comentários e notas internas | ✅ |
| 5 | Reservas de salas e veículos (FullCalendar) com km | ✅ |
| 6 | Diretório, documentos, busca global, notificações e painel com gráficos | ✅ |
| 7 | Administração (usuários, recursos, estrutura, auditoria) e testes | ✅ |
| 8 | Deploy (storage de objetos para uploads + hospedagem) | ⏳ |

### Ideias para evoluir

- Notificações em tempo real (SSE ou WebSocket) em vez de atualizar ao navegar
- Saldo de férias por colaborador e regras completas da CLT
- SLA de chamados com alertas de atraso
- Testes end-to-end (Playwright) dos fluxos principais
- Modo escuro
