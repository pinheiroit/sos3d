import { sendTemplateEmail } from './email-templates/send-email'
import { osNumber, ORDER_STATUS } from './service'
import { actorName, customerInfo, type Db } from './service.server'

/** One fixed-recipient email per completed O.S. mutation; never rolls back a saved O.S. */
export async function notifyServiceOrder(db: Db, orderId: string, actorId: string, action: 'criada' | 'atualizada', summary: string, eventId: string) {
  try {
    const { data: order, error } = await db.from('service_orders')
      .select('number, user_id, status, reported, equipment:equipment_id(brand, model)').eq('id', orderId).single()
    if (error || !order) throw new Error('notification_order_unavailable')
    const customer = order.reported?.customer ?? await customerInfo(db, order.user_id)
    const equipment = Array.isArray(order.equipment) ? order.equipment[0] : order.equipment
    return await sendTemplateEmail('service-order-notification', '', {
      idempotencyKey: `service-order-notification:${orderId}:${eventId}`,
      templateData: {
        number: osNumber(Number(order.number)), action,
        customer: customer.name || 'Não informado',
        equipment: order.reported?.equipment || `${equipment?.brand ?? ''} ${equipment?.model ?? ''}`.trim(),
        status: ORDER_STATUS[order.status] ?? order.status,
        actor: await actorName(db, actorId), summary,
      },
    })
  } catch (error) {
    // Log only the error code, never customer data, addresses or credentials.
    console.error('[service-notification] send failed', error && typeof error === 'object' && 'code' in error ? error.code : 'notification_failed')
    return { sent: false, reason: 'notification_failed' } as const
  }
}