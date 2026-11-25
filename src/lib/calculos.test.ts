import { test } from "node:test";
import assert from "node:assert/strict";
import { calcular, distribuirIgualmente, dividir } from "./calculos.ts";
import { lerNumero, mesesEntre, data, reais } from "./formatos.ts";

test("divisão por zero não quebra", () => {
  assert.equal(dividir(10, 0), null);
  assert.equal(dividir(null, 5), null);
});

test("métricas calculadas", () => {
  const r = calcular(
    { faturamento: 30000, vendas_fechadas: 10, leads_novos: 100, avaliacoes_agendadas: 40,
      avaliacoes_realizadas: 30, investimento_anuncios: 2000 },
    40000,
  );
  assert.equal(r.ticketMedio, 3000);
  assert.equal(r.taxaAgendamento, 0.4);
  assert.equal(r.taxaComparecimento, 0.75);
  assert.equal(r.taxaConversao, 1 / 3);
  assert.equal(r.custoPorLead, 20);
  assert.equal(r.percentualMeta, 0.75);
});

test("distribuir igualmente fecha a soma exata", () => {
  const p = distribuirIgualmente(100000, 12);
  assert.equal(p.length, 12);
  assert.equal(Math.round(p.reduce((a, b) => a + b, 0) * 100), 10000000);
  assert.equal(p[0], 8333.34);
  assert.equal(p[11], 8333.33);
});

test("ler números no formato brasileiro", () => {
  assert.equal(lerNumero("1.234,56"), 1234.56);
  assert.equal(lerNumero("R$ 2.000"), 2000);
  assert.equal(lerNumero("1234,5"), 1234.5);
  assert.equal(lerNumero("150"), 150);
  assert.equal(lerNumero(""), null);
  assert.equal(lerNumero("abc"), null);
});

test("meses entre datas", () => {
  assert.deepEqual(mesesEntre("2026-11-15", "2027-02-01"), ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"]);
});

test("formatos de exibição", () => {
  assert.equal(data("2026-03-12"), "12/03/2026");
  assert.equal(reais(1234.5).replace(/\s/g, " "), "R$ 1.234,50");
});

import { segundaDaSemana, somarDias, diasEntre } from "./periodos.ts";
import { preencher, numeroWhatsapp } from "./whatsapp.ts";

test("períodos da rotina", () => {
  assert.equal(segundaDaSemana("2026-11-19"), "2026-11-16"); // quinta -> segunda
  assert.equal(segundaDaSemana("2026-11-16"), "2026-11-16");
  assert.equal(segundaDaSemana("2026-11-22"), "2026-11-16"); // domingo
  assert.equal(somarDias("2026-12-30", 3), "2027-01-02");
  assert.equal(diasEntre("2026-11-01", "2026-11-19"), 18);
});

test("whatsapp e variáveis", () => {
  assert.equal(numeroWhatsapp("(11) 98765-4321"), "5511987654321");
  assert.equal(numeroWhatsapp("+55 11 98765-4321"), "5511987654321");
  assert.equal(preencher("Oi, {nome}! {beneficio}", { nome: "Ana Souza", beneficio: "10%" }), "Oi, Ana! 10%");
});

import { gerarCsv, dataBr } from "./csv.ts";

test("planilha CSV", () => {
  const csv = gerarCsv(["Nome", "Valor"], [["Ana; Souza", 1234.5], ["=SOMA(A1)", null]]);
  assert.equal(csv, '﻿Nome;Valor\r\n"Ana; Souza";1234,5\r\n\'=SOMA(A1);');
  assert.equal(dataBr("2026-03-12"), "12/03/2026");
});

import { normalizarTelefone, lerData, sugerirMapeamento, converterLinha, avaliar, decodificarTexto } from "./importacao.ts";

test("importação: telefones", () => {
  assert.equal(normalizarTelefone("(11) 98765-4321"), "5511987654321");
  assert.equal(normalizarTelefone("+55 (21) 3456-7890"), "552134567890");
  assert.equal(normalizarTelefone("011987654321"), "5511987654321");
  assert.equal(normalizarTelefone(11987654321), "5511987654321");
  assert.equal(normalizarTelefone("5511987654321"), "5511987654321");
  assert.equal(normalizarTelefone("98765-4321"), null); // sem DDD
  assert.equal(normalizarTelefone(""), null);
});

test("importação: datas", () => {
  assert.equal(lerData("15/03/1990"), "1990-03-15");
  assert.equal(lerData("5/3/90"), "1990-03-05");
  assert.equal(lerData("2025-08-01"), "2025-08-01");
  assert.equal(lerData(45000), "2023-03-15"); // série do Excel
  assert.equal(lerData(new Date(Date.UTC(1988, 11, 25))), "1988-12-25");
  assert.equal(lerData("31/02/2020"), null);
  assert.equal(lerData("15/03"), null);
  assert.equal(lerData("15/03", true), "2000-03-15");
  assert.equal(lerData("ontem"), null);
});

test("importação: sugestão de colunas e conversão", () => {
  const cab = ["Nome da paciente", "Celular", "Insta", "Último procedimento", "Data de nascimento", "Obs", "Procedimento"];
  const m = sugerirMapeamento(cab);
  assert.deepEqual(m, { nome: 0, whatsapp: 1, instagram: 2, procedimento: 6, data_procedimento: 3, aniversario: 4, observacoes: 5 });
  const { dados, avisos } = converterLinha(["  Ana  Souza ", "(11) 98765-4321", "instagram.com/ana.souza", "10/01/2025", "15/03", "", "Toxina"], m);
  assert.equal(dados.nome, "Ana Souza");
  assert.equal(dados.whatsapp, "5511987654321");
  assert.equal(dados.instagram, "@ana.souza");
  assert.equal(dados.data_procedimento, "2025-01-10");
  assert.equal(dados.aniversario, "2000-03-15");
  assert.equal(dados.observacoes, null);
  assert.equal(avisos.length, 0);
  assert.equal(converterLinha(["Bia", "4321-1234"], { nome: 0, whatsapp: 1 }).avisos.length, 1);
});

test("importação: duplicadas", () => {
  const base = { instagram: null, procedimento: null, data_procedimento: null, aniversario: null, observacoes: null };
  const r = avaliar(
    [
      { ...base, linha: 2, nome: "Ana", whatsapp: "5511987654321" },
      { ...base, linha: 3, nome: "Bia", whatsapp: "5511900000000" },
      { ...base, linha: 4, nome: "Bia de novo", whatsapp: "5511900000000" },
      { ...base, linha: 5, nome: "", whatsapp: "5511911111111" },
      { ...base, linha: 6, nome: "Sem telefone", whatsapp: null },
    ],
    ["(11) 98765-4321"],
  );
  assert.deepEqual(r.map((x) => x.situacao), ["duplicada_crm", "importar", "duplicada_planilha", "sem_nome", "importar"]);
});

test("importação: CSV do Excel (Windows-1252)", () => {
  const bytes = new Uint8Array([0x4a, 0xfa, 0x6c, 0x69, 0x61]); // "Júlia" em Windows-1252
  assert.equal(decodificarTexto(bytes.buffer), "Júlia");
  assert.equal(decodificarTexto(new TextEncoder().encode("﻿Júlia").buffer as ArrayBuffer), "Júlia");
});

test("importação: sem WhatsApp compara pelo nome", () => {
  const base = { whatsapp: null, instagram: null, procedimento: null, data_procedimento: null, aniversario: null, observacoes: null };
  const r = avaliar(
    [
      { ...base, linha: 2, nome: "Paula Sem DDD" },
      { ...base, linha: 3, nome: "Tânia" },
      { ...base, linha: 4, nome: "tania " },
    ],
    [],
    ["Paula  sem DDD"],
  );
  assert.deepEqual(r.map((x) => x.situacao), ["duplicada_crm", "importar", "duplicada_planilha"]);
});
