import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/conta-azul-auth')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleContaAzulAuth } = await import('@/lib/conta-azul-auth.server')
        return handleContaAzulAuth(request)
      },
    },
  },
})