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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirme a troca de e-mail da sua conta {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...header }}>
          <span style={headerText}>
            SOS<span style={headerAccent}>.3D</span>
          </span>
        </Text>
        <div style={content}>
          <Heading style={h1}>Confirme a troca de e-mail</Heading>
          <Text style={text}>
            Você solicitou a alteração do e-mail da sua conta na {siteName} de{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>
              {oldEmail}
            </Link>{' '}
            para{' '}
            <Link href={`mailto:${newEmail}`} style={link}>
              {newEmail}
            </Link>
            .
          </Text>
          <Text style={text}>
            Clique no botão abaixo para confirmar esta alteração:
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Confirmar novo e-mail
          </Button>
          <Text style={footer}>
            Se você não solicitou esta alteração, proteja sua conta
            imediatamente.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
