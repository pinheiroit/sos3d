export const contaAzulRedirectUri = 'https://sos3d.com.br/callback'
export const contaAzulStateCookie = 'conta_azul_oauth_state'

export function authorizationUrl(clientId: string, state: string) {
  const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: contaAzulRedirectUri, scope: 'openid profile aws.cognito.signin.user.admin', state })
  return `https://login.contaazul.com/#/oauth/authorize?${params}`
}

export function validOAuthState(state: string, cookie: string | undefined, userId: string, now: number) {
  if (!cookie) return false
  try {
    const stored = JSON.parse(cookie) as { state?: string; userId?: string; expires?: number }
    return state.length >= 32 && stored.state === state && stored.userId === userId && typeof stored.expires === 'number' && stored.expires > now
  } catch { return false }
}