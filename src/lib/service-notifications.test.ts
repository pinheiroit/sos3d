import { beforeEach, describe, expect, it, vi } from 'vitest'
import { template } from './email-templates/service-order-notification'
import { notifyServiceOrder } from './service-notifications.server'
import type { Db } from './service.server'

const { send, single } = vi.hoisted(() => ({ send: vi.fn(), single: vi.fn() }))
vi.mock('./email-templates/send-email', () => ({ sendTemplateEmail: send }))
vi.mock('./service.server', () => ({ actorName: vi.fn().mockResolvedValue('Vendedor'), customerInfo: vi.fn().mockResolvedValue({ name: 'Cliente' }) }))
const db = { from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } as unknown as Db

beforeEach(() => {
  vi.clearAllMocks()
  single.mockResolvedValue({ data: { number: 42, user_id: 'customer-id', status: 'recebido', reported: { customer: { name: 'Cliente teste' } }, equipment: { brand: 'Marca', model: 'Modelo' } }, error: null })
  send.mockResolvedValue({ sent: true })
})

describe('Avisos de O.S.', () => {
  it('sempre usa o destinatário solicitado, nunca um endereço enviado pelo navegador', () => {
    expect(template.to).toBe('sos.ind.ac@gmail.com')
  })
  it('envia um aviso para uma criação com identidade estável do evento', async () => {
    await notifyServiceOrder(db, 'order-42', 'seller-id', 'criada', 'Nova O.S.', 'created')
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('service-order-notification', '', expect.objectContaining({ idempotencyKey: 'service-order-notification:order-42:created', templateData: expect.objectContaining({ action: 'criada', number: 'OS 0042' }) }))
  })
  it('envia um aviso para uma atualização', async () => {
    await notifyServiceOrder(db, 'order-42', 'seller-id', 'atualizada', 'Diagnóstico atualizado.', 'event-2')
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('service-order-notification', '', expect.objectContaining({ idempotencyKey: 'service-order-notification:order-42:event-2', templateData: expect.objectContaining({ action: 'atualizada' }) }))
  })
  it('não repete envio para destinatário suprimido', async () => {
    send.mockResolvedValue({ sent: false, reason: 'recipient_suppressed' })
    expect(await notifyServiceOrder(db, 'order-42', 'seller-id', 'atualizada', '', 'event-3')).toEqual({ sent: false, reason: 'recipient_suppressed' })
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('preserva a O.S. salva quando o domínio de envio não está verificado', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    send.mockRejectedValue({ code: 'domain_not_verified' })
    expect(await notifyServiceOrder(db, 'order-42', 'seller-id', 'criada', '', 'created')).toEqual({ sent: false, reason: 'notification_failed' })
    log.mockRestore()
  })
})