// Estilos de marca SOS.3D para os e-mails transacionais.
// Paleta oficial: azul profundo #193752 | azul tech #126492 | laranja #E38233
export const brand = {
  deepBlue: '#193752',
  techBlue: '#126492',
  orange: '#E38233',
  steel: '#A5AEB5',
  mist: '#DAE1E6',
}

export const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }

export const container = { padding: '0 0 24px' }

export const header = {
  backgroundColor: brand.deepBlue,
  padding: '18px 25px',
}

export const headerText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0',
  letterSpacing: '0.5px',
}

export const headerAccent = {
  color: brand.orange,
}

export const content = { padding: '24px 25px 0' }

export const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: brand.deepBlue,
  margin: '0 0 20px',
}

export const text = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.5',
  margin: '0 0 25px',
}

export const link = { color: brand.techBlue, textDecoration: 'underline' }

export const button = {
  backgroundColor: brand.techBlue,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
}

export const footer = {
  fontSize: '12px',
  color: brand.steel,
  margin: '30px 0 0',
  borderTop: `1px solid ${brand.mist}`,
  paddingTop: '16px',
}

// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
export const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #126492 !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #126492 !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #126492 !important; color: #ffffff !important; }
`
