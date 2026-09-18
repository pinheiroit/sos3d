import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import {
  button,
  container,
  content,
  darkModeCss,
  footer,
  h1,
  header,
  headerAccent,
  headerText,
  main,
  text,
} from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Redefina sua senha da {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...header }}>
          <span style={headerText}>
            SOS<span style={headerAccent}>.3D</span>
          </span>
        </Text>
        <div style={content}>
          <Heading style={h1}>Redefinir senha</Heading>
          <Text style={text}>
            Recebemos uma solicitação para redefinir a senha da sua conta na{' '}
            {siteName}. Clique no botão abaixo para escolher uma nova senha.
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Redefinir senha
          </Button>
          <Text style={footer}>
            Se você não solicitou a redefinição, pode ignorar este e-mail. Sua
            senha não será alterada.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
