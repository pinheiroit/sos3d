import { describe, expect, it } from 'vitest'
import { canSendSale, findCustomer, findProduct, productDifferences } from './conta-azul-comparison'

describe('Conta Azul comparison', () => {
  it('compares products by SKU and detects price and stock differences', () => {
    const remote = { id: 'p1', nome: 'Filamento PLA', codigo_sku: 'pla', valor_venda: 90, estoque: 6 }
    expect(findProduct({ name: 'Filamento PLA', slug: 'pla' }, [remote])?.id).toBe('p1')
    expect(productDifferences({ name: 'Filamento PLA', price: 80, stock: 5 }, remote)).toEqual(['Preço', 'Estoque'])
  })
  it('never matches ambiguous names', () => {
    expect(findProduct({ name: 'PLA', slug: 'new' }, [{ id: '1', nome: 'PLA' }, { id: '2', nome: 'PLA' }])).toBeUndefined()
  })
  it('matches clients by document, never shared store email', () => {
    expect(findCustomer({ document: '123.456.789-00', email: '' }, [{ id: 'c', documento: '12345678900' }])?.id).toBe('c')
    expect(findCustomer({ document: '', email: 'televendas@sos3d.com.br' }, [{ id: 'c', email: 'televendas@sos3d.com.br' }])).toBeUndefined()
  })
  it('blocks forcing already sent, in-flight and cancelled sales', () => {
    expect(canSendSale('pago', 'enviado')).toBe(false)
    expect(canSendSale('pago', 'enviando')).toBe(false)
    expect(canSendSale('cancelado')).toBe(false)
    expect(canSendSale('pago', 'erro')).toBe(true)
  })
})