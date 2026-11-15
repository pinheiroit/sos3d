export type FiscalCustomer = {
  phone?: string | null; document?: string | null; street?: string | null;
  number?: string | null; neighborhood?: string | null; city?: string | null;
  state?: string | null; zip?: string | null; complement?: string | null;
}
const digits = (value?: string | null) => (value ?? '').replace(/\D/g, '')
export function missingFiscalFields(c: FiscalCustomer): string[] {
  const missing: string[] = []
  if (!/^\d{10,13}$/.test(digits(c.phone))) missing.push('Telefone')
  if (![11,14].includes(digits(c.document).length) || /^(\d)\1+$/.test(digits(c.document))) missing.push('CPF / CNPJ')
  for (const [key, label] of [['street','Endereço'],['number','Número'],['neighborhood','Bairro'],['city','Cidade'],['state','Estado']] as const) {
    if (!c[key]?.trim()) missing.push(label)
  }
  if (digits(c.zip).length !== 8) missing.push('CEP')
  return missing
}
export function assertFiscalCustomer(c: FiscalCustomer) {
  const missing = missingFiscalFields(c)
  if (missing.length) throw new Error(`Cadastro fiscal incompleto: ${missing.join(', ')}. Vá ao cadastro do cliente e atualize os dados antes de vender ou integrar.`)
}