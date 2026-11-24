/**
 * Dados de demonstração dos módulos (comunicados, solicitações, chamados,
 * reservas, documentos e notificações). Usado por `prisma/seed.ts`.
 *
 * As datas são relativas ao dia em que o seed roda, para a demo parecer
 * sempre "viva": reservas nesta semana, férias em andamento etc.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

type Ids = {
  usuario: (email: string) => string;
  unidade: Record<"CPS" | "CWB" | "BHZ", string>;
  setor: Record<"DIR" | "COM" | "LOG" | "FIN" | "CMP" | "RH" | "TI", string>;
};

// ─── Datas relativas (fuso de Brasília, sem horário de verão) ──

const FUSO = "America/Sao_Paulo";
const diaISO = (deslocamento: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(Date.now() + deslocamento * 86_400_000));

/** Momento num dia relativo a hoje: quando(1, "14:30") = amanhã às 14h30. */
const quando = (dias: number, hora = "09:00") => new Date(`${diaISO(dias)}T${hora}:00-03:00`);

/** Coluna DATE (meia-noite UTC) relativa a hoje. */
const dia = (dias: number) => new Date(`${diaISO(dias)}T00:00:00.000Z`);

/** Deslocamento (em dias) do n-ésimo dia útil a partir de hoje (0 = hoje, se útil). */
function diaUtil(n: number) {
  let deslocamento = 0;
  let encontrados = -1;
  for (;;) {
    const semana = new Date(`${diaISO(deslocamento)}T12:00:00Z`).getUTCDay();
    if (semana !== 0 && semana !== 6) encontrados++;
    if (encontrados === n) return deslocamento;
    deslocamento++;
  }
}

/** Data do próximo sábado como "dd/mm". */
function proximoSabado() {
  for (let deslocamento = 1; ; deslocamento++) {
    const iso = diaISO(deslocamento);
    if (new Date(`${iso}T12:00:00Z`).getUTCDay() === 6) return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  }
}

// ─── Arquivos ────────────────────────────────────────────────

const PASTA_UPLOADS = path.join(process.cwd(), "uploads");

/** Gera um PDF simples de uma página (Helvetica, WinAnsi) sem dependências. */
function gerarPdf(titulo: string, linhas: string[]) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const texto = [
    "BT",
    "/F1 18 Tf",
    "56 780 Td",
    `(${esc(titulo)}) Tj`,
    "/F1 11 Tf",
    "0 -32 Td",
    ...linhas.flatMap((l) => [`(${esc(l)}) Tj`, "0 -17 Td"]),
    "0 -24 Td",
    "/F1 8 Tf",
    "(Volt Distribuidora - documento ficticio gerado para demonstracao do VoltHub.) Tj",
    "ET",
  ].join("\n");

  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(texto, "latin1")} >>\nstream\n${texto}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function salvarPdf(pasta: "documentos" | "solicitacoes", titulo: string, linhas: string[]) {
  const nome = `${randomUUID()}.pdf`;
  await mkdir(path.join(PASTA_UPLOADS, pasta), { recursive: true });
  const conteudo = gerarPdf(titulo, linhas);
  await writeFile(path.join(PASTA_UPLOADS, pasta, nome), conteudo);
  return { url: `/api/arquivos/${pasta}/${nome}`, tamanho: conteudo.length };
}

export async function limparUploads() {
  await rm(PASTA_UPLOADS, { recursive: true, force: true });
}

/** Gerador pseudoaleatório com semente (o seed fica igual a cada execução). */
function aleatorio(semente: number) {
  return () => {
    semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Criação ─────────────────────────────────────────────────

export async function criarDadosDemo(prisma: PrismaClient, ids: Ids) {
  const u = ids.usuario;
  const sorte = aleatorio(42);

  // ── Recursos ──
  const recurso = async (dados: Parameters<typeof prisma.recurso.create>[0]["data"]) =>
    (await prisma.recurso.create({ data: dados })).id;

  const salaItaipu = await recurso({ nome: "Sala Itaipu", tipo: "SALA", capacidade: 12, localizacao: "2º andar", descricao: "TV 65\" e videoconferência", unidadeId: ids.unidade.CPS });
  const salaFurnas = await recurso({ nome: "Sala Furnas", tipo: "SALA", capacidade: 6, localizacao: "Térreo", descricao: "Ideal para reuniões rápidas", unidadeId: ids.unidade.CPS });
  const auditorio = await recurso({ nome: "Auditório Volt", tipo: "SALA", capacidade: 40, localizacao: "Galpão 1", descricao: "Projetor e sistema de som", unidadeId: ids.unidade.CPS });
  const fiorino = await recurso({ nome: "Fiorino Branca", tipo: "VEICULO", modelo: "Fiat Fiorino 1.4", placa: "RVT4A21", kmAtual: 48_210, unidadeId: ids.unidade.CPS });
  const saveiro = await recurso({ nome: "Saveiro Prata", tipo: "VEICULO", modelo: "VW Saveiro Robust", placa: "SBX2C47", kmAtual: 72_550, unidadeId: ids.unidade.CPS });
  const salaAraucaria = await recurso({ nome: "Sala Araucária", tipo: "SALA", capacidade: 8, localizacao: "1º andar", unidadeId: ids.unidade.CWB });
  const strada = await recurso({ nome: "Strada Vermelha", tipo: "VEICULO", modelo: "Fiat Strada Freedom", placa: "BEE3F19", kmAtual: 35_120, unidadeId: ids.unidade.CWB });
  const salaPampulha = await recurso({ nome: "Sala Pampulha", tipo: "SALA", capacidade: 10, localizacao: "Mezanino", unidadeId: ids.unidade.BHZ });
  const salaLiberdade = await recurso({ nome: "Sala Liberdade", tipo: "SALA", capacidade: 4, localizacao: "Térreo", unidadeId: ids.unidade.BHZ });
  const montana = await recurso({ nome: "Montana Branca", tipo: "VEICULO", modelo: "Chevrolet Montana", placa: "QPL7H63", kmAtual: 51_800, unidadeId: ids.unidade.BHZ });

  // ── Reservas (dias úteis a partir de hoje) ──
  const d0 = diaUtil(0), d1 = diaUtil(1), d2 = diaUtil(2), d3 = diaUtil(3), d4 = diaUtil(4);
  await prisma.reserva.createMany({
    data: [
      { recursoId: salaItaipu, usuarioId: u("gestor@volt.demo"), titulo: "Reunião semanal de vendas", inicio: quando(d1, "09:00"), fim: quando(d1, "10:00") },
      { recursoId: salaItaipu, usuarioId: u("sandra.oliveira@volt.demo"), titulo: "Fechamento contábil", inicio: quando(d1, "14:00"), fim: quando(d1, "16:00") },
      { recursoId: salaItaipu, usuarioId: u("roberto.volpato@volt.demo"), titulo: "Comitê de diretoria", inicio: quando(d3, "08:30"), fim: quando(d3, "11:00") },
      { recursoId: salaFurnas, usuarioId: u("colaborador@volt.demo"), titulo: "Call com fornecedor de cabos", inicio: quando(d2, "10:00"), fim: quando(d2, "11:00") },
      { recursoId: salaFurnas, usuarioId: u("gustavo.martins@volt.demo"), titulo: "Negociação Prysmian", inicio: quando(d1, "15:00"), fim: quando(d1, "16:30") },
      { recursoId: auditorio, usuarioId: u("beatriz.santos@volt.demo"), titulo: "Treinamento NR-10 (turma 1)", inicio: quando(d2, "13:30"), fim: quando(d2, "17:30") },
      { recursoId: auditorio, usuarioId: u("beatriz.santos@volt.demo"), titulo: "Integração de novos colaboradores", inicio: quando(d4, "09:00"), fim: quando(d4, "12:00") },
      { recursoId: fiorino, usuarioId: u("rafael.gomes@volt.demo"), titulo: "Entrega urgente", destino: "Eletro Sul — Sorocaba/SP", inicio: quando(d1, "08:00"), fim: quando(d1, "13:00") },
      { recursoId: saveiro, usuarioId: u("felipe.andrade@volt.demo"), titulo: "Visita a clientes", destino: "Jundiaí e Itatiba/SP", inicio: quando(d2, "08:00"), fim: quando(d2, "18:00") },
      { recursoId: salaAraucaria, usuarioId: u("mariana.nowak@volt.demo"), titulo: "Apresentação para construtora", inicio: quando(d1, "10:00"), fim: quando(d1, "11:30") },
      { recursoId: strada, usuarioId: u("bruno.schmidt@volt.demo"), titulo: "Rota de entregas zona sul", destino: "Curitiba — zona sul", inicio: quando(d2, "07:30"), fim: quando(d2, "16:00") },
      { recursoId: salaPampulha, usuarioId: u("larissa.moreira@volt.demo"), titulo: "Treinamento de produto Schneider", inicio: quando(d3, "14:00"), fim: quando(d3, "16:00") },
      { recursoId: salaLiberdade, usuarioId: u("isabela.teixeira@volt.demo"), titulo: "Alinhamento de compras", inicio: quando(d1, "09:30"), fim: quando(d1, "10:30") },
      { recursoId: montana, usuarioId: u("henrique.carvalho@volt.demo"), titulo: "Visita técnica", destino: "Contagem/MG", inicio: quando(d1, "08:00"), fim: quando(d1, "17:00") },
      // Concluídas (histórico com quilometragem)
      { recursoId: fiorino, usuarioId: u("rafael.gomes@volt.demo"), titulo: "Coleta de devolução", destino: "Campinas — Distrito Industrial", inicio: quando(-6, "08:00"), fim: quando(-6, "12:00"), status: "CONCLUIDA", kmSaida: 48_090, kmRetorno: 48_210 },
      { recursoId: montana, usuarioId: u("diego.fonseca@volt.demo"), titulo: "Entregas Betim", destino: "Betim/MG", inicio: quando(-3, "07:30"), fim: quando(-3, "15:00"), status: "CONCLUIDA", kmSaida: 51_690, kmRetorno: 51_800 },
    ],
  });
  if (d0 === 0) {
    // Hoje é dia útil: a agenda de hoje da Juliana (conta demo) não fica vazia.
    await prisma.reserva.createMany({
      data: [
        { recursoId: auditorio, usuarioId: u("colaborador@volt.demo"), titulo: "Treinamento linha solar", inicio: quando(0, "11:00"), fim: quando(0, "12:00") },
        { recursoId: salaFurnas, usuarioId: u("colaborador@volt.demo"), titulo: "Revisão de pedidos", inicio: quando(0, "16:00"), fim: quando(0, "17:00") },
      ],
    });
  }

  // ── Metas do mês e ramais úteis (painel "Meu dia") ──
  const inicioMes = (deslocamentoMeses: number) => {
    const [ano, mes] = diaISO(0).split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1 + deslocamentoMeses, 1));
  };
  await prisma.metaMensal.createMany({
    data: [
      { titulo: "Meta comercial", mes: inicioMes(0), valorMeta: 2_000_000, valorRealizado: 1_840_000, setorId: ids.setor.COM },
      { titulo: "Meta comercial", mes: inicioMes(-1), valorMeta: 1_900_000, valorRealizado: 1_985_000, setorId: ids.setor.COM },
      { titulo: "Faturamento Volt", mes: inicioMes(0), valorMeta: 6_500_000, valorRealizado: 5_980_000 },
      { titulo: "Faturamento Volt", mes: inicioMes(-1), valorMeta: 6_200_000, valorRealizado: 6_310_000 },
    ],
  });
  await prisma.ramalUtil.createMany({
    data: [
      { nome: "Suporte TI", numero: "2040", ordem: 1 },
      { nome: "Expedição", numero: "2115", ordem: 2, unidadeId: ids.unidade.CPS },
      { nome: "Expedição", numero: "3115", ordem: 2, unidadeId: ids.unidade.CWB },
      { nome: "Expedição", numero: "4115", ordem: 2, unidadeId: ids.unidade.BHZ },
      { nome: "RH", numero: "2002", ordem: 3 },
      { nome: "Portaria", numero: "2000", ordem: 4, unidadeId: ids.unidade.CPS },
    ],
  });

  // ── Comunicados ──
  const todos = await prisma.usuario.findMany({ select: { id: true, unidadeId: true, setorId: true } });
  async function comunicado(
    dados: { titulo: string; conteudo: string; categoria: "GERAL" | "RH" | "TI" | "SEGURANCA" | "EVENTOS" | "COMERCIAL"; autor: string; diasAtras: number; fixado?: boolean },
    alvo: { unidades?: string[]; setores?: string[] } = {},
    taxaLeitura = 0.6,
  ) {
    const publicadoEm = quando(-dados.diasAtras, "08:30");
    const c = await prisma.comunicado.create({
      data: {
        titulo: dados.titulo,
        conteudo: dados.conteudo,
        categoria: dados.categoria,
        fixado: dados.fixado ?? false,
        publicadoEm,
        criadoEm: publicadoEm,
        autorId: u(dados.autor),
        unidades: { connect: (alvo.unidades ?? []).map((id) => ({ id })) },
        setores: { connect: (alvo.setores ?? []).map((id) => ({ id })) },
      },
    });
    const publico = todos.filter(
      (p) =>
        (!alvo.unidades?.length || alvo.unidades.includes(p.unidadeId)) &&
        (!alvo.setores?.length || alvo.setores.includes(p.setorId)),
    );
    // As contas demo começam sem ler os comunicados mais recentes.
    const demo = new Set(["colaborador@volt.demo", "gestor@volt.demo", "ti@volt.demo", "rh@volt.demo", "admin@volt.demo"].map(u));
    const leitores = publico.filter((p) => !(demo.has(p.id) && dados.diasAtras < 4) && sorte() < taxaLeitura);
    await prisma.leituraComunicado.createMany({
      data: leitores.map((p) => ({ comunicadoId: c.id, usuarioId: p.id, lidoEm: new Date(publicadoEm.getTime() + sorte() * 2 * 86_400_000) })),
    });
    return c.id;
  }

  await comunicado({
    titulo: "Bem-vindos ao VoltHub, o novo portal interno da Volt",
    categoria: "GERAL",
    autor: "admin@volt.demo",
    diasAtras: 12,
    fixado: true,
    conteudo:
      "A partir de hoje, comunicados, solicitações de RH, chamados de TI e reservas de salas e veículos ficam todos em um só lugar: o VoltHub.\n\nO que muda para você:\n• Férias, folgas e atestados são pedidos direto no portal e vão automaticamente para o seu gestor.\n• Problemas com computador, sistema ou impressora viram chamados com acompanhamento.\n• Salas e veículos são reservados no calendário, sem conflito de horário.\n\nDúvidas? Abra um chamado na categoria \"Outros\" que a TI ajuda.",
  }, {}, 0.8);

  await comunicado({
    titulo: "Recesso de fim de ano: calendário de funcionamento",
    categoria: "RH",
    autor: "beatriz.santos@volt.demo",
    diasAtras: 2,
    fixado: true,
    conteudo:
      "Confira o funcionamento das unidades no fim de ano:\n\n• 24/12 — expediente até 13h\n• 25/12 — fechado\n• 26/12 a 30/12 — expediente normal (escala reduzida no Comercial)\n• 31/12 — expediente até 13h\n• 01/01 — fechado\n\nQuem quiser emendar com férias deve fazer a solicitação no VoltHub até o dia 10/12.",
  }, {}, 0.35);

  await comunicado({
    titulo: "Treinamento obrigatório de NR-10: turmas de dezembro",
    categoria: "SEGURANCA",
    autor: "beatriz.santos@volt.demo",
    diasAtras: 5,
    conteudo:
      "A reciclagem de NR-10 (segurança em instalações e serviços com eletricidade) é obrigatória a cada dois anos para quem manuseia ou testa materiais elétricos.\n\nTurmas no Auditório Volt (Campinas) e por videoconferência nas filiais. A inscrição é feita com o seu gestor.\n\nLembre-se: sem certificado válido, não é permitido testar produtos na bancada.",
  }, { setores: [ids.setor.LOG, ids.setor.COM] }, 0.5);

  await comunicado({
    titulo: `ERP fora do ar sábado ${proximoSabado()}, 8h–14h`,
    categoria: "TI",
    autor: "thiago.rocha@volt.demo",
    diasAtras: 1,
    conteudo:
      "No sábado, das 8h às 14h, o ERP ficará fora do ar para atualização de versão.\n\nDurante a janela não será possível emitir notas fiscais nem consultar estoque. Pedidos urgentes devem ser alinhados com o Comercial até sexta-feira.\n\nSe algo não funcionar na segunda-feira, abra um chamado com prioridade Alta.",
  }, {}, 0.3);

  await comunicado({
    titulo: "Meta de novembro: 92% atingida, reta final!",
    categoria: "COMERCIAL",
    autor: "gestor@volt.demo",
    diasAtras: 3,
    conteudo:
      "Time, estamos com 92% da meta do mês. Destaques: linha de disjuntores (+18%) e cabos flexíveis (+11%).\n\nFoco nesta última semana: retomar orçamentos em aberto acima de R$ 10 mil e oferecer frete grátis para pedidos de construtoras.\n\nVamos juntos bater os 100%!",
  }, { setores: [ids.setor.COM] }, 0.7);

  await comunicado({
    titulo: "Confraternização de fim de ano em Campinas",
    categoria: "EVENTOS",
    autor: "beatriz.santos@volt.demo",
    diasAtras: 7,
    conteudo:
      "Nossa confraternização será no dia 19/12, a partir das 18h, no espaço de eventos ao lado da matriz.\n\nTeremos churrasco, música ao vivo e sorteio de brindes. Confirme sua presença com o RH até 12/12.",
  }, { unidades: [ids.unidade.CPS] }, 0.6);

  await comunicado({
    titulo: "Novo centro de distribuição em Curitiba começa a operar",
    categoria: "GERAL",
    autor: "roberto.volpato@volt.demo",
    diasAtras: 20,
    conteudo:
      "O novo CD da filial Curitiba, com 4.000 m², começou a operar nesta semana. Com ele, o prazo de entrega para Santa Catarina cai de 4 para 2 dias úteis.\n\nParabéns a toda a equipe de Logística pelo trabalho na mudança!",
  }, {}, 0.85);

  // ── Solicitações (com histórico na auditoria) ──
  async function solicitacao(dados: {
    tipo: "FERIAS" | "FOLGA" | "ATESTADO" | "ATUALIZACAO_DADOS";
    solicitante: string;
    aprovador: string | null;
    status?: "PENDENTE" | "APROVADA" | "REPROVADA";
    inicio?: number;
    fim?: number;
    criadaHa: number;
    decididaHa?: number;
    motivo?: string;
    observacao?: string;
    dados?: { campo: string; valor: string };
    anexo?: { titulo: string; linhas: string[]; nome: string };
  }) {
    const criadoEm = quando(-dados.criadaHa, "10:15");
    const anexo = dados.anexo ? await salvarPdf("solicitacoes", dados.anexo.titulo, dados.anexo.linhas) : null;
    const status = dados.status ?? "PENDENTE";
    const decididoEm = status !== "PENDENTE" ? quando(-(dados.decididaHa ?? dados.criadaHa - 1), "15:40") : null;
    const s = await prisma.solicitacao.create({
      data: {
        tipo: dados.tipo,
        status,
        solicitanteId: u(dados.solicitante),
        aprovadorId: dados.aprovador ? u(dados.aprovador) : null,
        dataInicio: dados.inicio !== undefined ? dia(dados.inicio) : null,
        dataFim: dados.fim !== undefined ? dia(dados.fim) : null,
        motivo: dados.motivo,
        dados: dados.dados,
        anexoUrl: anexo?.url,
        anexoNome: dados.anexo?.nome,
        observacaoAprovador: dados.observacao,
        decididoEm,
        criadoEm,
      },
    });
    await prisma.logAuditoria.create({
      data: { acao: "SOLICITACAO_CRIADA", entidade: "Solicitacao", entidadeId: s.id, usuarioId: u(dados.solicitante), dados: { tipo: dados.tipo }, criadoEm },
    });
    if (decididoEm && dados.aprovador) {
      await prisma.logAuditoria.create({
        data: { acao: status === "APROVADA" ? "SOLICITACAO_APROVADA" : "SOLICITACAO_REPROVADA", entidade: "Solicitacao", entidadeId: s.id, usuarioId: u(dados.aprovador), criadoEm: decididoEm },
      });
    }
    return s.id;
  }

  const feriasJuliana = await solicitacao({ tipo: "FERIAS", solicitante: "colaborador@volt.demo", aprovador: "gestor@volt.demo", inicio: 45, fim: 59, criadaHa: 1, motivo: "Viagem em família. Deixo os pedidos em aberto com o Felipe." });
  await solicitacao({ tipo: "FOLGA", solicitante: "felipe.andrade@volt.demo", aprovador: "gestor@volt.demo", inicio: 8, fim: 8, criadaHa: 2, motivo: "Banco de horas — feira em São Paulo no sábado." });
  await solicitacao({ tipo: "ATUALIZACAO_DADOS", solicitante: "mariana.nowak@volt.demo", aprovador: "gestor@volt.demo", criadaHa: 3, dados: { campo: "ENDERECO", valor: "Rua XV de Novembro, 1500, ap. 302 — Centro, Curitiba/PR" }, motivo: "Mudei de apartamento." });
  await solicitacao({ tipo: "ATESTADO", solicitante: "larissa.moreira@volt.demo", aprovador: "gestor@volt.demo", status: "APROVADA", inicio: -9, fim: -8, criadaHa: 9, decididaHa: 8, anexo: { titulo: "Atestado medico", nome: "atestado-larissa.pdf", linhas: ["Atesto, para os devidos fins, que a paciente Larissa Moreira", "necessita de 2 (dois) dias de afastamento de suas atividades.", "", "CID: J11 - Dr. Paulo Mendes - CRM/MG 00000 (ficticio)"] } });
  await solicitacao({ tipo: "FOLGA", solicitante: "colaborador@volt.demo", aprovador: "gestor@volt.demo", status: "REPROVADA", inicio: -20, fim: -20, criadaHa: 26, decididaHa: 25, observacao: "Nesse dia teremos o inventário da loja. Podemos remarcar para a semana seguinte?" });
  await solicitacao({ tipo: "FERIAS", solicitante: "rafael.gomes@volt.demo", aprovador: "marcos.pereira@volt.demo", status: "APROVADA", inicio: -3, fim: 6, criadaHa: 40, decididaHa: 38 });
  await solicitacao({ tipo: "FERIAS", solicitante: "roberto.volpato@volt.demo", aprovador: null, inicio: 30, fim: 44, criadaHa: 4, motivo: "Férias de janeiro." });
  await solicitacao({ tipo: "ATESTADO", solicitante: "vanessa.ribeiro@volt.demo", aprovador: "sandra.oliveira@volt.demo", inicio: -1, fim: -1, criadaHa: 1, anexo: { titulo: "Declaracao de comparecimento", nome: "declaracao-consulta.pdf", linhas: ["Declaro que Vanessa Ribeiro esteve em consulta medica", "neste consultorio no periodo da manha.", "", "Clinica Saude Campinas (ficticia)"] } });
  await solicitacao({ tipo: "FOLGA", solicitante: "ti@volt.demo", aprovador: "thiago.rocha@volt.demo", status: "APROVADA", inicio: -35, fim: -35, criadaHa: 60, decididaHa: 59 });
  await solicitacao({ tipo: "FERIAS", solicitante: "henrique.carvalho@volt.demo", aprovador: "gestor@volt.demo", status: "APROVADA", inicio: 20, fim: 34, criadaHa: 75, decididaHa: 74 });
  await solicitacao({ tipo: "ATUALIZACAO_DADOS", solicitante: "diego.fonseca@volt.demo", aprovador: "marcos.pereira@volt.demo", status: "APROVADA", criadaHa: 100, decididaHa: 99, dados: { campo: "DADOS_BANCARIOS", valor: "Banco 341 · Ag. 1234 · CC 56789-0" } });
  await solicitacao({ tipo: "FERIAS", solicitante: "camila.dias@volt.demo", aprovador: "sandra.oliveira@volt.demo", status: "APROVADA", inicio: -110, fim: -96, criadaHa: 140, decididaHa: 138 });
  await solicitacao({ tipo: "ATESTADO", solicitante: "paulo.zanetti@volt.demo", aprovador: "marcos.pereira@volt.demo", status: "APROVADA", inicio: -130, fim: -129, criadaHa: 130, decididaHa: 129, anexo: { titulo: "Atestado medico", nome: "atestado-paulo.pdf", linhas: ["Afastamento de 2 dias por recomendacao medica."] } });
  await solicitacao({ tipo: "FOLGA", solicitante: "aline.barbosa@volt.demo", aprovador: "marcos.pereira@volt.demo", status: "APROVADA", inicio: -150, fim: -150, criadaHa: 155, decididaHa: 154 });

  // ── Chamados ──
  async function chamado(dados: {
    titulo: string;
    descricao: string;
    categoria: "HARDWARE" | "SOFTWARE" | "REDE" | "ACESSO" | "EMAIL" | "IMPRESSORA" | "OUTROS";
    prioridade: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
    status: "ABERTO" | "EM_ANDAMENTO" | "AGUARDANDO_USUARIO" | "RESOLVIDO" | "FECHADO";
    solicitante: string;
    responsavel?: string;
    abertoHa: number;
    comentarios?: { autor: string; texto: string; horasDepois: number; interno?: boolean; minutosAtras?: number }[];
  }) {
    const criadoEm = quando(-dados.abertoHa, "09:20");
    const c = await prisma.chamado.create({
      data: {
        titulo: dados.titulo,
        descricao: dados.descricao,
        categoria: dados.categoria,
        prioridade: dados.prioridade,
        status: dados.status,
        solicitanteId: u(dados.solicitante),
        responsavelId: dados.responsavel ? u(dados.responsavel) : null,
        resolvidoEm: dados.status === "RESOLVIDO" || dados.status === "FECHADO" ? new Date(criadoEm.getTime() + 26 * 3_600_000) : null,
        criadoEm,
      },
    });
    for (const com of dados.comentarios ?? []) {
      await prisma.comentarioChamado.create({
        data: { chamadoId: c.id, autorId: u(com.autor), conteudo: com.texto, interno: com.interno ?? false, criadoEm: com.minutosAtras !== undefined ? new Date(Date.now() - com.minutosAtras * 60_000) : new Date(criadoEm.getTime() + com.horasDepois * 3_600_000) },
      });
    }
    await prisma.logAuditoria.create({
      data: { acao: "CHAMADO_ABERTO", entidade: "Chamado", entidadeId: c.id, usuarioId: u(dados.solicitante), dados: { numero: c.numero }, criadoEm },
    });
    return c;
  }

  await chamado({
    titulo: "Outlook não sincroniza e-mails no celular",
    descricao: "Desde ontem o aplicativo do Outlook no celular corporativo não baixa e-mails novos. No computador está normal.",
    categoria: "EMAIL", prioridade: "MEDIA", status: "EM_ANDAMENTO", solicitante: "colaborador@volt.demo", responsavel: "ti@volt.demo", abertoHa: 2,
    comentarios: [
      { autor: "ti@volt.demo", texto: "Oi, Juliana! Pode remover a conta do app e adicionar de novo? Se pedir aprovação, aceite no Authenticator.", horasDepois: 1 },
      { autor: "colaborador@volt.demo", texto: "Fiz isso, mas continua pedindo a senha toda hora.", horasDepois: 3 },
      { autor: "ti@volt.demo", texto: "Token de MFA expirado no Entra ID. Vou forçar a reemissão.", horasDepois: 4, interno: true },
      { autor: "ti@volt.demo", texto: "Reemiti seu acesso no celular. Pode testar agora?", horasDepois: 0, minutosAtras: 20 },
    ],
  });
  await chamado({
    titulo: "Impressora de etiquetas da expedição parou",
    descricao: "A Zebra da doca 2 parou de imprimir etiquetas de envio. Luz vermelha piscando. Estamos separando pedidos sem etiqueta.",
    categoria: "IMPRESSORA", prioridade: "URGENTE", status: "ABERTO", solicitante: "rafael.gomes@volt.demo", abertoHa: 0,
  });
  await chamado({
    titulo: "Sem acesso ao relatório de comissões no ERP",
    descricao: "Ao abrir Relatórios > Comercial > Comissões aparece \"Acesso negado\". Preciso para fechar o mês.",
    categoria: "ACESSO", prioridade: "ALTA", status: "AGUARDANDO_USUARIO", solicitante: "mariana.nowak@volt.demo", responsavel: "otavio.rezende@volt.demo", abertoHa: 3,
    comentarios: [
      { autor: "otavio.rezende@volt.demo", texto: "Mariana, preciso que seu gestor aprove o acesso. Pode pedir para o Ricardo responder aqui?", horasDepois: 2 },
      { autor: "otavio.rezende@volt.demo", texto: "Perfil 'Vendas-CWB' não tem o relatório. Avaliar criar perfil novo em vez de liberar individual.", horasDepois: 2.2, interno: true },
    ],
  });
  await chamado({
    titulo: "Teclado com teclas falhando",
    descricao: "As teclas A e S do teclado falham bastante, preciso apertar várias vezes.",
    categoria: "HARDWARE", prioridade: "BAIXA", status: "RESOLVIDO", solicitante: "colaborador@volt.demo", responsavel: "ti@volt.demo", abertoHa: 6,
    comentarios: [{ autor: "ti@volt.demo", texto: "Deixei um teclado novo na sua mesa. Pode confirmar se ficou tudo certo?", horasDepois: 26 }],
  });
  await chamado({
    titulo: "VPN cai quando estou em cliente",
    descricao: "Quando uso o 4G do celular em visitas, a VPN desconecta a cada 5 minutos e perco o pedido que estava digitando.",
    categoria: "REDE", prioridade: "ALTA", status: "ABERTO", solicitante: "henrique.carvalho@volt.demo", abertoHa: 1,
  });
  await chamado({
    titulo: "Planilha de fluxo de caixa travando",
    descricao: "A planilha de fluxo de caixa trava ao atualizar as conexões de dados.",
    categoria: "SOFTWARE", prioridade: "MEDIA", status: "FECHADO", solicitante: "vanessa.ribeiro@volt.demo", responsavel: "ti@volt.demo", abertoHa: 15,
    comentarios: [{ autor: "ti@volt.demo", texto: "Atualizei o Office e recriei a conexão ODBC. Deve estar ok agora.", horasDepois: 20 }],
  });
  await chamado({
    titulo: "Celular corporativo sem dados móveis",
    descricao: "O chip do celular da rota não conecta na internet desde segunda.",
    categoria: "OUTROS", prioridade: "MEDIA", status: "EM_ANDAMENTO", solicitante: "diego.fonseca@volt.demo", responsavel: "otavio.rezende@volt.demo", abertoHa: 4,
    comentarios: [{ autor: "otavio.rezende@volt.demo", texto: "Abri protocolo com a operadora. Prazo de 48h.", horasDepois: 5 }],
  });
  await chamado({
    titulo: "Coletor de dados do estoque não liga",
    descricao: "O coletor nº 3 não liga nem na base de carga. Estamos com um coletor a menos no inventário.",
    categoria: "HARDWARE", prioridade: "ALTA", status: "ABERTO", solicitante: "paulo.zanetti@volt.demo", abertoHa: 0,
  });
  await chamado({
    titulo: "Instalar leitor de PDF atualizado",
    descricao: "Preciso do leitor de PDF atualizado para assinar contratos de fornecedores.",
    categoria: "SOFTWARE", prioridade: "BAIXA", status: "FECHADO", solicitante: "gustavo.martins@volt.demo", responsavel: "otavio.rezende@volt.demo", abertoHa: 30,
  });

  // ── Documentos ──
  const documentos = [
    { titulo: "Código de Conduta e Ética", categoria: "POLITICA", setor: "RH", autor: "beatriz.santos@volt.demo", descricao: "Princípios e regras de conduta para todos os colaboradores.", linhas: ["1. Respeito e integridade nas relacoes de trabalho.", "2. Conflito de interesses e brindes de fornecedores.", "3. Uso de informacoes confidenciais.", "4. Canal de denuncias."] },
    { titulo: "Manual do Colaborador 2026", categoria: "MANUAL", setor: "RH", autor: "rh@volt.demo", descricao: "Benefícios, jornada, férias, ponto e dúvidas frequentes.", linhas: ["Jornada: 44h semanais, com 1h de almoco.", "Ferias: solicitar com 30 dias de antecedencia pelo VoltHub.", "Beneficios: VR, VA, plano de saude e odontologico."] },
    { titulo: "Formulário de reembolso de despesas", categoria: "FORMULARIO", setor: "FIN", autor: "sandra.oliveira@volt.demo", descricao: "Preencha e anexe os comprovantes. Prazo: até o dia 25 de cada mês.", linhas: ["Nome: ______________________  Setor: ____________", "Data | Descricao | Valor (R$)", "______________________________________________"] },
    { titulo: "Procedimento de trabalho com eletricidade (NR-10)", categoria: "PROCEDIMENTO", setor: "LOG", autor: "marcos.pereira@volt.demo", descricao: "Passo a passo para testes de bancada e manuseio seguro.", linhas: ["1. Use EPI adequado (luvas isolantes e oculos).", "2. Desenergize e bloqueie antes de qualquer teste.", "3. Teste a ausencia de tensao antes de tocar.", "4. Registre o teste na ficha da bancada."] },
    { titulo: "Política de uso dos veículos da frota", categoria: "POLITICA", setor: "LOG", autor: "marcos.pereira@volt.demo", descricao: "Regras de reserva, quilometragem, abastecimento e multas.", linhas: ["Reserve pelo VoltHub e registre o km na saida e no retorno.", "Abastecimento apenas em postos conveniados.", "Multas sao de responsabilidade do condutor."] },
    { titulo: "Modelo de proposta comercial", categoria: "MODELO", setor: "COM", autor: "gestor@volt.demo", descricao: "Modelo padrão com condições comerciais e prazos de entrega.", linhas: ["Cliente: ____________________", "Validade da proposta: 10 dias.", "Frete: CIF para pedidos acima de R$ 5.000."] },
    { titulo: "Guia de acesso remoto (VPN)", categoria: "MANUAL", setor: "TI", autor: "thiago.rocha@volt.demo", descricao: "Como instalar e conectar na VPN fora da empresa.", linhas: ["1. Instale o cliente VPN pelo Portal da Empresa.", "2. Entre com o e-mail corporativo e aprove no Authenticator.", "3. Em caso de queda, abra um chamado na categoria Rede."] },
  ] as const;
  for (const [i, d] of documentos.entries()) {
    const arquivo = await salvarPdf("documentos", d.titulo.normalize("NFD").replace(/[̀-ͯ]/g, ""), [...d.linhas]);
    const quandoCriado = quando(-(40 - i * 4), "11:00");
    await prisma.documento.create({
      data: {
        titulo: d.titulo,
        descricao: d.descricao,
        categoria: d.categoria,
        setorId: ids.setor[d.setor],
        autorId: u(d.autor),
        arquivoUrl: arquivo.url,
        arquivoNome: `${d.titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.pdf`,
        mimeType: "application/pdf",
        tamanhoBytes: arquivo.tamanho,
        criadoEm: quandoCriado,
        atualizadoEm: quandoCriado,
      },
    });
  }

  // ── Notificações contextuais para as contas demo ──
  await prisma.notificacao.createMany({
    data: [
      { usuarioId: u("gestor@volt.demo"), tipo: "SOLICITACAO", titulo: "Nova solicitação para analisar", mensagem: "Juliana Costa pediu: Férias.", link: `/solicitacoes/${feriasJuliana}`, criadoEm: quando(-1, "10:16") },
      { usuarioId: u("ti@volt.demo"), tipo: "CHAMADO", titulo: "Novo chamado · Urgente", mensagem: "Impressora de etiquetas da expedição parou", link: "/chamados/fila", criadoEm: quando(0, "09:21") },
      { usuarioId: u("colaborador@volt.demo"), tipo: "CHAMADO", titulo: "Chamado resolvido", mensagem: "A TI marcou seu chamado como resolvido. Confirme a solução ou reabra.", link: "/chamados?aba=encerrados", criadoEm: quando(-5, "11:30") },
      { usuarioId: u("rh@volt.demo"), tipo: "SOLICITACAO", titulo: "Nova solicitação para analisar", mensagem: "Roberto Volpato pediu: Férias.", link: "/solicitacoes/gestao?status=PENDENTE", criadoEm: quando(-4, "10:16") },
    ],
  });
}
