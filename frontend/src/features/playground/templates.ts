import type { JsonObject } from '@/types'

export const initialTemplate = 'order.paid'

export const eventTemplates: Record<string, JsonObject> = {
  'order.created': { order_id: 123, customer_id: 42, amount: 5000, currency: 'KZT' },
  'order.paid': { order_id: 123, amount: 5000, currency: 'KZT' },
  'payment.failed': { payment_id: 'pay_123', order_id: 123, reason: 'insufficient_funds' },
  'user.registered': { user_id: 42, email: 'developer@example.com' },
  'subscription.created': { subscription_id: 'sub_123', customer_id: 42, plan: 'monthly' },
  'custom.event': { message: 'Hello, Evently' },
}
