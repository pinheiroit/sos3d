import { describe, expect, it } from 'vitest'
import { buildSalePayload, customerKey, initialStock, formatDocument, paymentType, rioBrancoDate } from './conta-azul-sales'

describe('Conta Azul sale mapping', () => {
  it('maps site payment methods to Conta Azul payment types', () => {
    expect(paymentType('pix')).toBe('PIX_PAGAMENTO_INSTANTANEO')
    expect(paymentType('cartao')).toBe('CARTAO_CREDITO')
    expect(paymentType('boleto')).toBe('BOLETO_BANCARIO')
  })
  it('formats CPF and CNPJ and keys customers by document first', () => {
    expect(formatDocument('12345678900')).toBe('123.456.789-00')
    expect(formatDocument('12345678000190')).toBe('12.345.678/0001-90')
    expect(customerKey({ id: 'o', customer_document: '123.456.789-00', customer_email: 'a@b.c' })).toBe('doc:12345678900')
    expect(customerKey({ id: 'o', customer_document: '', customer_email: ' A@B.C ' })).toBe('email:a@b.c')
  })
  it('never identifies a customer by a shared store e-mail', () => {
    expect(customerKey({ id: 'o1', customer_document: '', customer_email: 'televendas@sos3d.com.br' })).toBe('order:o1')
  })
  it('creates missing products with the stock held before this order', () => {
    expect(initialStock(5, 1)).toBe(6)
    expect(initialStock(-2, 3)).toBe(3)
  })
  it('sends one cash installment equal to items + freight - discount', () => {
    const p = buildSalePayload({ order: { reference: 'SOS-1', payment_method: 'pix', shipping: 20, discount: 5, total: 215, notes: null }, items: [{ productExternalId: 'p1', name: 'PLA', qty: 2, unitPrice: 100 }], customerId: 'c1', numero: 7, situacao: 'EM_ANDAMENTO', date: '2026-11-13' })
    expect(p.condicao_pagamento.parcelas[0]?.valor).toBe(215)
    expect(p.composicao_de_valor).toEqual({ frete: 20, desconto: { tipo: 'VALOR', valor: 5 } })
    expect(p.itens[0]).toEqual({ id: 'p1', descricao: 'PLA', quantidade: 2, valor: 100 })
    expect(p.situacao).toBe('EM_ANDAMENTO')
  })
  it('uses the Rio Branco calendar day', () => {
    expect(rioBrancoDate('2026-11-14T01:00:00Z')).toBe('2026-11-13')
  })
})
