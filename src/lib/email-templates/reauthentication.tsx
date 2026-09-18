import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import {
  brand,
  container,
  content,
  footer,
  h1,
  header,
  headerAccent,
  headerText,
  main,
  text,
} from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...header }}>
          <span style={headerText}>
            SOS<span style={headerAccent}>.3D</span>
          </span>
        </Text>
        <div style={content}>
          <Heading style={h1}>Confirme sua identidade</Heading>
          <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            Este código expira em breve. Se você não fez esta solicitação, pode
            ignorar este e-mail com segurança.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: brand.deepBlue,
  letterSpacing: '4px',
  margin: '0 0 30px',
}
