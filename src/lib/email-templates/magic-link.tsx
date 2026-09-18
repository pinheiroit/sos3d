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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Seu link de acesso à {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...header }}>
          <span style={headerText}>
            SOS<span style={headerAccent}>.3D</span>
          </span>
        </Text>
        <div style={content}>
          <Heading style={h1}>Seu link de acesso</Heading>
          <Text style={text}>
            Clique no botão abaixo para entrar na {siteName}. Este link expira
            em breve.
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Entrar
          </Button>
          <Text style={footer}>
            Se você não solicitou este link, pode ignorar este e-mail com
            segurança.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
