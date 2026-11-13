import { describe, expect, it } from 'vitest'
import { availableQty, financialStatus, lineTotal, canOperateConsignment, canAdminConsignment, supplyPrice, shipmentBalance, settlementTotal, unreservedQty, validQuantity, paymentAllowed, dueDateFor } from './consignment'

describe('Consignação: regras do escopo', () => {
  it('devolução em trânsito reserva 3 das 10 unidades disponíveis', () => expect(unreservedQty({id:'item',qty:10,sold_qty:0,returned_qty:0,lost_qty:0},[{item_id:'item',qty:3,status:'em_transito'}])).toBe(7))
  it('devolução recebida não desconta reserva novamente', () => expect(unreservedQty({id:'item',qty:10,sold_qty:0,returned_qty:3,lost_qty:0},[{item_id:'item',qty:3,status:'recebida'}])).toBe(7))
  it('venda não excede o saldo disponível nem aceita fração de unidade', () => {
    expect(validQuantity(8,7)).toBe(false)
    expect(validQuantity(1.5,7)).toBe(false)
    expect(validQuantity(7,7)).toBe(true)
  })
  it('pagamento não excede saldo de R$45', () => {
    expect(paymentAllowed(46,45)).toBe(false)
    expect(paymentAllowed(45,45)).toBe(true)
    expect(paymentAllowed(0,45)).toBe(false)
  })
  it('7 dias a partir de 13/11 vencem em 20/11 sem variar com horário UTC', () => expect(dueDateFor('2026-11-13',7)).toBe('2026-11-20'))
  it('sem preço negociado exige fornecimento explícito, sem copiar varejo', () => expect(supplyPrice()).toBe(0))
  it('fornecimento preserva R$65 negociados em vez do preço de varejo', () => expect(supplyPrice({supply:65})).toBe(65))
  it('fechamento cobra somente vendas selecionadas pelo fornecimento', () => expect(settlementTotal([{id:'venda',qty:20,supply_price:65,settlement_id:null}], ['venda'])).toBe(1300))
  it('venda já fechada não compõe uma nova cobrança', () => expect(settlementTotal([{id:'venda',qty:20,supply_price:65,settlement_id:'fechamento'}], ['venda'])).toBe(0))
  it('20 vendidos e 30 devolvidos zeram saldo da remessa de 50', () => expect(shipmentBalance([{qty:50,sold_qty:20,returned_qty:30,lost_qty:0}])).toBe(0))
  it('50 rolos a R$65 correspondem a R$3250', () => expect(lineTotal(50,65)).toBe(3250))
  it('primeiro fechamento de 20 unidades vale R$1300', () => expect(lineTotal(20,65)).toBe(1300))
  it('20 vendidos deixam 30 consignados', () => expect(availableQty({qty:50,sold_qty:20,returned_qty:0,lost_qty:0})).toBe(30))
  it('fechamento das 30 restantes vale R$1950', () => expect(lineTotal(30,65)).toBe(1950))
  it('pagamento de R$1000 deixa R$300 do primeiro fechamento', () => expect(lineTotal(20,65)-1000).toBe(300))
  it('total faturado menos R$1000 recebidos deixa R$2250', () => expect(lineTotal(20,65)+lineTotal(30,65)-1000).toBe(2250))
  it('remessa encerrada pode manter dívida parcialmente paga', () => {
    expect(availableQty({qty:50,sold_qty:50,returned_qty:0,lost_qty:0})).toBe(0)
    expect(financialStatus(3250,1000,'2026-11-20',false,'2026-11-13')).toBe('Parcialmente paga')
  })
  it('nova remessa de 20 unidades continua disponível', () => expect(availableQty({qty:20,sold_qty:0,returned_qty:0,lost_qty:0})).toBe(20))
  it('devoluções e perdas são deduzidas separadamente', () => expect(availableQty({qty:20,sold_qty:5,returned_qty:3,lost_qty:2})).toBe(10))
  it('apenas equipe interna opera consignação', () => {
    expect(canOperateConsignment(['admin'])).toBe(true)
    expect(canOperateConsignment(['seller'])).toBe(true)
    expect(canOperateConsignment(['member'])).toBe(false)
    expect(canOperateConsignment([])).toBe(false)
  })
  it('credenciamento e financeiro exigem administrador', () => {
    expect(canAdminConsignment(['admin'])).toBe(true)
    expect(canAdminConsignment(['seller'])).toBe(false)
  })
  it('saldo não pago após vencimento fica vencido', () => expect(financialStatus(1950,1000,'2026-11-12',false,'2026-11-13')).toBe('Vencida'))
  it('pagamento integral quita a cobrança', () => expect(financialStatus(1950,1950,'2026-11-12',false,'2026-11-13')).toBe('Quitada'))
})