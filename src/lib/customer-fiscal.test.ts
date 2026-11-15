import { describe, expect, it } from 'vitest'
import { assertFiscalCustomer, missingFiscalFields } from './customer-fiscal'
const complete = { phone: '(68) 99948-4082', document: '55.891.067/0001-55', street: 'Travessa do Canal', number: '60', neighborhood: 'Distrito Industrial', city: 'Rio Branco', state: 'AC', zip: '69920-199' }
describe('mandatory fiscal customer data', () => {
  for (const [key,label] of [['phone','Telefone'],['document','CPF / CNPJ'],['street','Endereço'],['neighborhood','Bairro'],['city','Cidade'],['zip','CEP']] as const) {
    it(`blocks sales and integration without ${key}`, () => {
      expect(missingFiscalFields({ ...complete, [key]: '' })).toContain(label)
      expect(() => assertFiscalCustomer({ ...complete, [key]: '' })).toThrow('Vá ao cadastro do cliente')
    })
  }
  it('accepts complete CNPJ and CPF customers', () => {
    expect(missingFiscalFields(complete)).toEqual([])
    expect(missingFiscalFields({ ...complete, document: '529.982.247-25' })).toEqual([])
  })
  it('rejects malformed phone, document and CEP', () => {
    expect(missingFiscalFields({ ...complete, phone: '123', document: '11111111111', zip: '123' })).toEqual(['Telefone','CPF / CNPJ','CEP'])
  })
})