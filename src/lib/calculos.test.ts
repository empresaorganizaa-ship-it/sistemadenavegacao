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
