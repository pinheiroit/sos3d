export const contaAzulRedirectUri = 'https://sos3d.com.br/callback'
export const contaAzulStateTtlMs = 15 * 60 * 1000

export function authorizationUrl(clientId: string, state: string) {
  const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: contaAzulRedirectUri, scope: 'openid profile aws.cognito.signin.user.admin', state })
  return `https://login.contaazul.com/#/oauth/authorize?${params}`
}

export async function hashOAuthState(state: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

export function validStateFormat(state: string) {
  return /^[A-Za-z0-9-]{32,200}$/.test(state)
}
