# ⚡ VoltHub

Portal interno (intranet) da **Volt Distribuidora**, uma distribuidora **fictícia** de materiais
elétricos com matriz em Campinas e filiais em Curitiba e Belo Horizonte.

> Projeto de portfólio. Escopo completo, perfis, entidades e roadmap em [PROJETO.md](PROJETO.md).

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-0F3D4C)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8)
![Testes](https://img.shields.io/badge/testes-Vitest-F5B700)

## Funcionalidades

| Módulo | O que faz |
|---|---|
| **Autenticação e perfil** | Login com Auth.js + bcrypt, sessão JWT de 10 h, quatro perfis de acesso, foto, ramal e troca de senha |
| **Comunicados** | Mural com categorias, público-alvo por unidade/setor, fixar no topo, expiração, "Estou ciente" com % de leitura e lista de quem leu |
| **Solicitações de RH** | Férias, folga, atestado (com anexo protegido) e atualização de dados; aprovação pelo gestor direto, histórico em linha do tempo, painel do RH com ausentes do dia |
| **Chamados de TI** | Abertura com categoria, prioridade e anexo; fila da TI ordenada por prioridade, responsável, conversa com notas internas, confirmação de solução pelo usuário |
| **Reservas** | Calendário (FullCalendar) de salas e veículos, sem sobreposição (validada na aplicação **e** no banco), registro de km de saída e retorno |
| **Diretório e documentos** | Busca de colegas com hierarquia (gestor e equipe direta), biblioteca de documentos com upload e download |
| **Meu dia** (início) | "Precisa de você" com ações diretas (confirmar leitura, aprovar, responder a TI, devolver veículo), meta do mês, agenda de hoje, aniversariantes com "Parabenizar" e ramais úteis |
| **Indicadores** | Gráficos (Recharts) nas telas de gestão: Fila de TI, Gestão de RH, Aprovações e Admin |
| **Busca global** | Pessoas, comunicados, documentos e chamados num só lugar |
| **Notificações** | Sino com contador e página própria; avisos automáticos a cada aprovação, comentário, atribuição… |
| **Administração** | Usuários (com senha temporária), salas e veículos, unidades e setores, metas e ramais do painel, trilha de auditoria |

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) ·
PostgreSQL · Prisma · Auth.js v5 · Zod · Recharts · FullCalendar · Sonner · Vitest

## Como rodar localmente

### 1. Pré-requisitos

- **Node.js 20.9+** (recomendado: 22 LTS ou mais novo)
- **PostgreSQL 15+** rodando localmente
  (ou use `docker compose up -d` com o [docker-compose.yml](docker-compose.yml) incluído)

No Windows, dá para instalar os dois com o `winget`:

```powershell
winget install OpenJS.NodeJS.LTS
winget install PostgreSQL.PostgreSQL.17 --interactive
```

### 2. Instalar as dependências

```bash
cd volthub
npm install
```

### 3. Configurar o ambiente

Copie o arquivo de exemplo e ajuste a senha do PostgreSQL:

```bash
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão com o PostgreSQL. O banco `volthub` é criado automaticamente pelo Prisma. Caracteres especiais na senha (`@ # / % :`) precisam ser codificados (`%40`, `%23`…). |
| `AUTH_SECRET` | Segredo da sessão. Gere com `npx auth secret`. |
| `AUTH_TRUST_HOST` | `true` para rodar o build de produção localmente. |

### 4. Criar o banco e popular os dados

```bash
npm run db:migrate   # cria o banco e aplica as migrations
npm run db:seed      # unidades, setores, colaboradores e dados de todos os módulos
```

O seed gera datas relativas ao dia em que roda (reservas nesta semana, férias em andamento…),
então a demonstração sempre parece "viva". Rode de novo quando quiser zerar os dados.

### 5. Subir o projeto

```bash
npm run dev
```

Acesse **http://localhost:3000**.

## Contas de demonstração

Todas usam a senha **`volt123`**. Dá para entrar com o **usuário**, a **matrícula** ou o
**e-mail**. Na tela de login, abra "Contas de demonstração" e clique numa conta para preencher.

| Usuário | E-mail | Perfil | O que vale a pena testar |
|---|---|---|---|
| `juliana.costa` | `colaborador@volt.demo` | Colaborador | "Meu dia", pedir férias, abrir chamado, reservar sala, "Li e concordo" |
| `ricardo.almeida` | `gestor@volt.demo` | Gestor (Comercial) | **Aprovações** (3 pedidos pendentes), publicar comunicado, gráficos da equipe |
| `patricia.souza` | `rh@volt.demo` | Equipe · RH | **Gestão de RH**, ausentes do dia, decidir pedido sem gestor, documentos |
| `lucas.ferreira` | `ti@volt.demo` | Equipe · TI | **Fila de TI**, assumir chamado, nota interna, mudar status |
| `carla.mendes` | `admin@volt.demo` | Administrador | **Administração**: usuários, recursos, estrutura, metas e ramais, auditoria |

Os demais colaboradores do seed também entram com `nome.sobrenome` e `volt123`.
"Manter conectado" deixa a sessão aberta por 30 dias; sem ele, a sessão dura 10 horas.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes unitários (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos do TypeScript |
| `npm run format` | Prettier |
| `npm run db:migrate` | Cria/aplica migrations (`prisma migrate dev`) |
| `npm run db:seed` | Recria os dados de demonstração |
| `npm run db:reset` | Apaga o banco, reaplica as migrations e roda o seed |
| `npm run db:studio` | Abre o Prisma Studio para navegar nos dados |

## Estrutura de pastas

```
prisma/
  schema.prisma            # 13 entidades + enums
  migrations/              # inclui a constraint de reservas sem sobreposição
  seed.ts  dados-demo.ts   # dados de demonstração
src/
  app/
    (auth)/login/          # tela de login
    (portal)/              # área logada (layout com menu lateral)
      comunicados/  solicitacoes/  chamados/  reservas/
      diretorio/  documentos/  busca/  notificacoes/  perfil/  admin/
    api/arquivos/          # download de anexos com checagem de permissão
    api/auth/              # rotas do Auth.js
  components/
    ui/                    # componentes shadcn/ui
    layout/                # barra superior, sub-abas por seção, menus
    formulario.tsx         # Campo, BotaoEnviar, useAcaoFormulario…
  features/<modulo>/       # actions, schemas (Zod), regras, componentes do módulo
  lib/
    permissions.ts         # regras de acesso por perfil (fonte única)
    auth-guard.ts          # exigirSessao() / exigirPermissao()
    uploads.ts             # armazenamento de arquivos
    notificacoes.ts  auditoria.ts  rotulos.ts  utils.ts
  auth.ts  auth.config.ts
  proxy.ts                 # proteção de rotas
```

## Decisões técnicas

- **Permissões em um único arquivo** (`lib/permissions.ts`): proxy, páginas, server actions e
  menu consultam as mesmas regras, então não há duas fontes de verdade.
- **Proteção em camadas:** o `proxy.ts` barra a navegação; `exigirPermissao()` protege páginas e
  server actions (que podem ser chamadas diretamente); cada action ainda checa a regra do
  registro (ex.: só o gestor direto aprova, ninguém aprova o próprio pedido).
- **Sessão revalidada no banco:** usuário desativado perde o acesso na hora, sem esperar o JWT expirar.
- **Reservas sem sobreposição em duas camadas:** checagem amigável na action e uma
  *exclusion constraint* (`btree_gist`) no PostgreSQL, que resolve inclusive requisições simultâneas.
- **Decisão idempotente:** aprovações usam `updateMany … where status = PENDENTE`, então dois
  cliques ou duas abas não decidem duas vezes.
- **Anexos fora de `public/`:** servidos por `/api/arquivos`, que confere quem pode ver cada
  arquivo (um atestado só é visível ao colaborador, ao gestor e ao RH), com `no-store` para
  arquivos sensíveis e proteção contra *path traversal*.
- **Histórico via auditoria:** a linha do tempo das solicitações é montada a partir do
  `LogAuditoria`, sem tabela duplicada.
- **Formulários sem perda de dados:** `useAcaoFormulario` envia para a server action sem o reset
  automático do React 19, então o que o usuário digitou continua lá quando a validação falha.
- **Regras puras e testadas:** permissões, fluxo de aprovação, validação de férias e regras de
  reserva ficam em funções puras, cobertas pelo Vitest.
- **Gráficos acessíveis:** série única numa cor, tooltip no hover e tabela com os dados.
- **Navegação guiada por permissões:** as abas e sub-abas saem do mesmo `nav-config.ts` e são
  filtradas pelas regras de `permissions.ts`, então cada perfil vê só o que pode usar.
- **"Precisa de você" calculado, não armazenado:** as pendências do painel são montadas na hora
  a partir dos dados (leituras obrigatórias, aprovações, respostas da TI…), sem tabela extra
  para manter em sincronia.

## Deploy

O projeto roda em qualquer host Node com PostgreSQL (Railway, Render, Fly.io, VPS).
Para Vercel + Neon/Supabase, um ponto exige atenção: **os uploads são gravados em disco local**
(`./uploads`), que não persiste em ambiente serverless. Troque `src/lib/uploads.ts` e a rota
`/api/arquivos` por um storage de objetos (S3, Cloudflare R2, Vercel Blob); o resto do código
não muda.
