import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
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
  link,
  main,
  text,
} from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Você foi convidado para a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...header }}>
          <span style={headerText}>
            SOS<span style={headerAccent}>.3D</span>
          </span>
        </Text>
        <div style={content}>
          <Heading style={h1}>Você foi convidado</Heading>
          <Text style={text}>
            Você recebeu um convite para participar da{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            . Clique no botão abaixo para aceitar o convite e criar sua conta.
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Aceitar convite
          </Button>
          <Text style={footer}>
            Se você não esperava este convite, pode ignorar este e-mail com
            segurança.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
