/**
 * Seed de desenvolvimento do VoltHub.
 *
 * Recria do zero: 3 unidades, 7 setores e 26 colaboradores (incluindo as
 * contas de demonstração), mais dados de todos os módulos (ver dados-demo.ts).
 * Todos os usuários usam a senha "volt123". Apaga também a pasta ./uploads.
 *
 * Uso:  npm run db:seed
 */
import { PrismaClient, type Equipe, type Perfil } from "@prisma/client";
import bcrypt from "bcryptjs";

import { criarDadosDemo, limparUploads } from "./dados-demo";

const prisma = new PrismaClient();

const SENHA_PADRAO = "volt123";

// ─── Unidades ────────────────────────────────────────────────

const UNIDADES = {
  CPS: {
    nome: "Matriz Campinas",
    cidade: "Campinas",
    uf: "SP",
    endereco: "Av. John Boyd Dunlop, 3900 — Jardim Ipaussurama",
    telefone: "(19) 3242-7000",
    matriz: true,
  },
  CWB: {
    nome: "Filial Curitiba",
    cidade: "Curitiba",
    uf: "PR",
    endereco: "Rod. BR-116, 15200 — Fanny",
    telefone: "(41) 3376-4100",
    matriz: false,
  },
  BHZ: {
    nome: "Filial Belo Horizonte",
    cidade: "Belo Horizonte",
    uf: "MG",
    endereco: "Av. Cristiano Machado, 8800 — Vila Cloris",
    telefone: "(31) 3427-5200",
    matriz: false,
  },
} as const;

type ChaveUnidade = keyof typeof UNIDADES;

// ─── Setores ─────────────────────────────────────────────────

const SETORES = {
  DIR: "Diretoria",
  COM: "Comercial",
  LOG: "Logística",
  FIN: "Financeiro",
  CMP: "Compras",
  RH: "Recursos Humanos",
  TI: "Tecnologia da Informação",
} as const;

type SiglaSetor = keyof typeof SETORES;

// ─── Colaboradores ───────────────────────────────────────────

type ColaboradorSeed = {
  nome: string;
  email: string;
  cargo: string;
  perfil: Perfil;
  equipe?: Equipe;
  unidade: ChaveUnidade;
  setor: SiglaSetor;
  /** E-mail do gestor direto (precisa aparecer antes na lista). */
  gestor?: string;
  telefone: string;
  ramal: string;
  admissao: string;
  nascimento: string;
};

/**
 * A ordem importa: gestores vêm antes dos subordinados.
 * Contas de demonstração: *@volt.demo com nomes curtos (colaborador, gestor, ti, rh, admin).
 */
const COLABORADORES: ColaboradorSeed[] = [
  // Diretoria
  {
    nome: "Roberto Volpato",
    email: "roberto.volpato@volt.demo",
    cargo: "Diretor-Geral",
    perfil: "GESTOR",
    unidade: "CPS",
    setor: "DIR",
    telefone: "(19) 99812-4410",
    ramal: "7001",
    admissao: "2008-02-04",
    nascimento: "1968-07-19",
  },

  // Gestores de setor (Matriz)
  {
    nome: "Ricardo Almeida",
    email: "gestor@volt.demo",
    cargo: "Gerente Comercial",
    perfil: "GESTOR",
    unidade: "CPS",
    setor: "COM",
    gestor: "roberto.volpato@volt.demo",
    telefone: "(19) 99731-2208",
    ramal: "7101",
    admissao: "2012-05-14",
    nascimento: "1979-03-02",
  },
  {
    nome: "Marcos Pereira",
    email: "marcos.pereira@volt.demo",
    cargo: "Gerente de Logística",
    perfil: "GESTOR",
    unidade: "CPS",
    setor: "LOG",
    gestor: "roberto.volpato@volt.demo",
    telefone: "(19) 99654-8821",
    ramal: "7201",
    admissao: "2014-09-01",
    nascimento: "1981-11-23",
  },
  {
    nome: "Sandra Oliveira",
    email: "sandra.oliveira@volt.demo",
    cargo: "Gerente Financeira",
    perfil: "GESTOR",
    unidade: "CPS",
    setor: "FIN",
    gestor: "roberto.volpato@volt.demo",
    telefone: "(19) 99588-3017",
    ramal: "7301",
    admissao: "2011-03-21",
    nascimento: "1976-01-09",
  },
  {
    nome: "Eduardo Lima",
    email: "eduardo.lima@volt.demo",
    cargo: "Gerente de Compras",
    perfil: "GESTOR",
    unidade: "CPS",
    setor: "CMP",
    gestor: "roberto.volpato@volt.demo",
    telefone: "(19) 99472-6650",
    ramal: "7401",
    admissao: "2016-06-06",
    nascimento: "1983-08-30",
  },
  {
    nome: "Beatriz Santos",
    email: "beatriz.santos@volt.demo",
    cargo: "Gerente de Recursos Humanos",
    perfil: "GESTOR",
    equipe: "RH",
    unidade: "CPS",
    setor: "RH",
    gestor: "roberto.volpato@volt.demo",
    telefone: "(19) 99361-1194",
    ramal: "7501",
    admissao: "2013-10-07",
    nascimento: "1980-04-15",
  },
  {
    nome: "Thiago Rocha",
    email: "thiago.rocha@volt.demo",
    cargo: "Coordenador de TI",
    perfil: "GESTOR",
    equipe: "TI",
    unidade: "CPS",
    setor: "TI",
    gestor: "roberto.volpato@volt.demo",
    telefone: "(19) 99245-7732",
    ramal: "7601",
    admissao: "2017-01-16",
    nascimento: "1987-12-03",
  },

  // Contas de demonstração (Matriz)
  {
    nome: "Juliana Costa",
    email: "colaborador@volt.demo",
    cargo: "Vendedora Interna",
    perfil: "COLABORADOR",
    unidade: "CPS",
    setor: "COM",
    gestor: "gestor@volt.demo",
    telefone: "(19) 99118-5520",
    ramal: "7112",
    admissao: "2021-08-02",
    nascimento: "1995-06-27",
  },
  {
    nome: "Lucas Ferreira",
    email: "ti@volt.demo",
    cargo: "Analista de Suporte",
    perfil: "EQUIPE",
    equipe: "TI",
    unidade: "CPS",
    setor: "TI",
    gestor: "thiago.rocha@volt.demo",
    telefone: "(19) 99087-4436",
    ramal: "7612",
    admissao: "2020-02-10",
    nascimento: "1994-09-11",
  },
  {
    nome: "Patrícia Souza",
    email: "rh@volt.demo",
    cargo: "Analista de Recursos Humanos",
    perfil: "EQUIPE",
    equipe: "RH",
    unidade: "CPS",
    setor: "RH",
    gestor: "beatriz.santos@volt.demo",
    telefone: "(19) 98976-2281",
    ramal: "7512",
    admissao: "2019-04-15",
    nascimento: "1991-02-18",
  },
  {
    nome: "Carla Mendes",
    email: "admin@volt.demo",
    cargo: "Administradora de Sistemas",
    perfil: "ADMIN",
    equipe: "TI",
    unidade: "CPS",
    setor: "TI",
    gestor: "thiago.rocha@volt.demo",
    telefone: "(19) 98843-9065",
    ramal: "7610",
    admissao: "2018-07-23",
    nascimento: "1989-10-05",
  },

  // Demais colaboradores — Matriz Campinas
  {
    nome: "Felipe Andrade",
    email: "felipe.andrade@volt.demo",
    cargo: "Vendedor Externo",
    perfil: "COLABORADOR",
    unidade: "CPS",
    setor: "COM",
    gestor: "gestor@volt.demo",
    telefone: "(19) 98712-3349",
    ramal: "7113",
    admissao: "2022-03-07",
    nascimento: "1993-05-21",
  },
  {
    nome: "Rafael Gomes",
    email: "rafael.gomes@volt.demo",
    cargo: "Conferente de Expedição",
    perfil: "COLABORADOR",
    unidade: "CPS",
    setor: "LOG",
    gestor: "marcos.pereira@volt.demo",
    telefone: "(19) 98654-0127",
    ramal: "7212",
    admissao: "2020-11-03",
    nascimento: "1990-01-30",
  },
  {
    nome: "Aline Barbosa",
    email: "aline.barbosa@volt.demo",
    cargo: "Assistente de Logística",
    perfil: "COLABORADOR",
    unidade: "CPS",
    setor: "LOG",
    gestor: "marcos.pereira@volt.demo",
    telefone: "(19) 98533-6618",
    ramal: "7213",
    admissao: "2023-01-09",
    nascimento: "1998-08-14",
  },
  {
    nome: "Vanessa Ribeiro",
    email: "vanessa.ribeiro@volt.demo",
    cargo: "Analista Financeira",
    perfil: "COLABORADOR",
    unidade: "CPS",
    setor: "FIN",
    gestor: "sandra.oliveira@volt.demo",
    telefone: "(19) 98421-7790",
    ramal: "7312",
    admissao: "2019-09-16",
    nascimento: "1992-03-08",
  },
  {
    nome: "Gustavo Martins",
    email: "gustavo.martins@volt.demo",
    cargo: "Comprador",
    perfil: "COLABORADOR",
    unidade: "CPS",
    setor: "CMP",
    gestor: "eduardo.lima@volt.demo",
    telefone: "(19) 98307-1452",
    ramal: "7412",
    admissao: "2021-05-17",
    nascimento: "1988-11-02",
  },

  // Filial Curitiba
  {
    nome: "Mariana Nowak",
    email: "mariana.nowak@volt.demo",
    cargo: "Vendedora Interna",
    perfil: "COLABORADOR",
    unidade: "CWB",
    setor: "COM",
    gestor: "gestor@volt.demo",
    telefone: "(41) 99204-8873",
    ramal: "8112",
    admissao: "2022-07-11",
    nascimento: "1996-12-19",
  },
  {
    nome: "Bruno Schmidt",
    email: "bruno.schmidt@volt.demo",
    cargo: "Motorista de Entregas",
    perfil: "COLABORADOR",
    unidade: "CWB",
    setor: "LOG",
    gestor: "marcos.pereira@volt.demo",
    telefone: "(41) 99137-2206",
    ramal: "8212",
    admissao: "2018-10-01",
    nascimento: "1985-04-26",
  },
  {
    nome: "Paulo Zanetti",
    email: "paulo.zanetti@volt.demo",
    cargo: "Estoquista",
    perfil: "COLABORADOR",
    unidade: "CWB",
    setor: "LOG",
    gestor: "marcos.pereira@volt.demo",
    telefone: "(41) 99058-6634",
    ramal: "8213",
    admissao: "2023-04-03",
    nascimento: "1999-07-07",
  },
  {
    nome: "Camila Dias",
    email: "camila.dias@volt.demo",
    cargo: "Assistente Financeira",
    perfil: "COLABORADOR",
    unidade: "CWB",
    setor: "FIN",
    gestor: "sandra.oliveira@volt.demo",
    telefone: "(41) 98966-4410",
    ramal: "8312",
    admissao: "2021-02-22",
    nascimento: "1997-09-13",
  },

  // Filial Belo Horizonte
  {
    nome: "Larissa Moreira",
    email: "larissa.moreira@volt.demo",
    cargo: "Vendedora Interna",
    perfil: "COLABORADOR",
    unidade: "BHZ",
    setor: "COM",
    gestor: "gestor@volt.demo",
    telefone: "(31) 99281-5547",
    ramal: "9112",
    admissao: "2020-06-15",
    nascimento: "1994-02-04",
  },
  {
    nome: "Henrique Carvalho",
    email: "henrique.carvalho@volt.demo",
    cargo: "Vendedor Externo",
    perfil: "COLABORADOR",
    unidade: "BHZ",
    setor: "COM",
    gestor: "gestor@volt.demo",
    telefone: "(31) 99174-0386",
    ramal: "9113",
    admissao: "2019-01-28",
    nascimento: "1986-10-17",
  },
  {
    nome: "Diego Fonseca",
    email: "diego.fonseca@volt.demo",
    cargo: "Motorista de Entregas",
    perfil: "COLABORADOR",
    unidade: "BHZ",
    setor: "LOG",
    gestor: "marcos.pereira@volt.demo",
    telefone: "(31) 99063-2291",
    ramal: "9212",
    admissao: "2022-09-05",
    nascimento: "1991-06-12",
  },
  {
    nome: "Isabela Teixeira",
    email: "isabela.teixeira@volt.demo",
    cargo: "Analista de Compras",
    perfil: "COLABORADOR",
    unidade: "BHZ",
    setor: "CMP",
    gestor: "eduardo.lima@volt.demo",
    telefone: "(31) 98952-7714",
    ramal: "9412",
    admissao: "2021-10-18",
    nascimento: "1993-12-28",
  },
  {
    nome: "Otávio Rezende",
    email: "otavio.rezende@volt.demo",
    cargo: "Técnico de Suporte",
    perfil: "EQUIPE",
    equipe: "TI",
    unidade: "BHZ",
    setor: "TI",
    gestor: "thiago.rocha@volt.demo",
    telefone: "(31) 98841-3359",
    ramal: "9612",
    admissao: "2022-01-24",
    nascimento: "1997-03-25",
  },
  {
    nome: "Renata Campos",
    email: "renata.campos@volt.demo",
    cargo: "Assistente de Departamento Pessoal",
    perfil: "EQUIPE",
    equipe: "RH",
    unidade: "BHZ",
    setor: "RH",
    gestor: "beatriz.santos@volt.demo",
    telefone: "(31) 98730-6602",
    ramal: "9512",
    admissao: "2020-08-31",
    nascimento: "1990-05-06",
  },
];

const CONTAS_DEMO = [
  "colaborador@volt.demo",
  "gestor@volt.demo",
  "ti@volt.demo",
  "rh@volt.demo",
  "admin@volt.demo",
];

// ─── Execução ────────────────────────────────────────────────

/** Converte "AAAA-MM-DD" para Date em UTC (coluna DATE, sem fuso). */
const data = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** "Patrícia Souza" → "patricia.souza" (primeiro e último nome, sem acentos). */
function gerarLogin(nome: string) {
  const partes = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/);
  return `${partes[0]}.${partes[partes.length - 1]}`;
}

async function limparBanco() {
  await limparUploads();
  // Ordem respeita as chaves estrangeiras.
  await prisma.logAuditoria.deleteMany();
  await prisma.notificacao.deleteMany();
  await prisma.leituraComunicado.deleteMany();
  await prisma.comunicado.deleteMany();
  await prisma.comentarioChamado.deleteMany();
  await prisma.chamado.deleteMany();
  // Numeração "realista" dos chamados (#1040, #1041…) a cada novo seed.
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Chamado_numero_seq" RESTART WITH 1040`);
  await prisma.solicitacao.deleteMany();
  await prisma.reserva.deleteMany();
  await prisma.recurso.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.metaMensal.deleteMany();
  await prisma.ramalUtil.deleteMany();
  await prisma.usuario.updateMany({ data: { gestorId: null } });
  await prisma.usuario.deleteMany();
  await prisma.setor.deleteMany();
  await prisma.unidade.deleteMany();
}

async function main() {
  console.log("🧹 Limpando dados anteriores…");
  await limparBanco();

  console.log("🏢 Criando unidades…");
  const idUnidade = {} as Record<ChaveUnidade, string>;
  for (const [chave, dados] of Object.entries(UNIDADES) as [ChaveUnidade, (typeof UNIDADES)[ChaveUnidade]][]) {
    const unidade = await prisma.unidade.create({ data: { ...dados } });
    idUnidade[chave] = unidade.id;
  }

  console.log("🗂️  Criando setores…");
  const idSetor = {} as Record<SiglaSetor, string>;
  for (const [sigla, nome] of Object.entries(SETORES) as [SiglaSetor, string][]) {
    const setor = await prisma.setor.create({ data: { nome, sigla } });
    idSetor[sigla] = setor.id;
  }

  console.log("👥 Criando colaboradores…");
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  const idPorEmail = new Map<string, string>();

  for (const [indice, c] of COLABORADORES.entries()) {
    const gestorId = c.gestor ? idPorEmail.get(c.gestor) : undefined;
    if (c.gestor && !gestorId) {
      throw new Error(`Gestor ${c.gestor} de ${c.nome} precisa aparecer antes na lista.`);
    }

    const usuario = await prisma.usuario.create({
      data: {
        nome: c.nome,
        email: c.email,
        login: gerarLogin(c.nome),
        matricula: String(10001 + indice),
        senhaHash,
        perfil: c.perfil,
        equipe: c.equipe ?? null,
        cargo: c.cargo,
        telefone: c.telefone,
        ramal: c.ramal,
        dataAdmissao: data(c.admissao),
        dataNascimento: data(c.nascimento),
        unidadeId: idUnidade[c.unidade],
        setorId: idSetor[c.setor],
        gestorId,
      },
    });
    idPorEmail.set(c.email, usuario.id);
  }

  console.log("🔔 Criando notificações de boas-vindas…");
  await prisma.notificacao.createMany({
    data: CONTAS_DEMO.map((email) => ({
      usuarioId: idPorEmail.get(email)!,
      tipo: "SISTEMA" as const,
      titulo: "Bem-vindo(a) ao VoltHub!",
      mensagem: "Este é o novo portal interno da Volt. Confira seus dados em Meu perfil.",
      link: "/perfil",
      criadoEm: new Date(Date.now() - 12 * 86_400_000),
    })),
  });

  console.log("📦 Criando comunicados, solicitações, chamados, reservas e documentos…");
  await criarDadosDemo(prisma, {
    usuario: (email) => {
      const id = idPorEmail.get(email);
      if (!id) throw new Error(`Usuário ${email} não existe no seed.`);
      return id;
    },
    unidade: idUnidade,
    setor: idSetor,
  });

  const [comunicados, solicitacoes, chamados, reservas, documentos] = await Promise.all([
    prisma.comunicado.count(),
    prisma.solicitacao.count(),
    prisma.chamado.count(),
    prisma.reserva.count(),
    prisma.documento.count(),
  ]);
  console.log(
    `\n✅ Seed concluído: ${Object.keys(UNIDADES).length} unidades, ` +
      `${Object.keys(SETORES).length} setores, ${COLABORADORES.length} colaboradores, ` +
      `${comunicados} comunicados, ${solicitacoes} solicitações, ${chamados} chamados, ` +
      `${reservas} reservas e ${documentos} documentos.`,
  );
  console.log(`   Contas demo (senha "${SENHA_PADRAO}"): ${CONTAS_DEMO.join(", ")}`);
}

main()
  .catch((erro) => {
    console.error("❌ Erro no seed:", erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
