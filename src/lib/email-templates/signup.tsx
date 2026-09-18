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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirme seu e-mail para acessar a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={{ ...header }}>
          <span style={headerText}>
            SOS<span style={headerAccent}>.3D</span>
          </span>
        </Text>
        <div style={content}>
          <Heading style={h1}>Confirme seu e-mail</Heading>
          <Text style={text}>
            Obrigado por se cadastrar na{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            !
          </Text>
          <Text style={text}>
            Para confirmar o endereço de e-mail (
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            ), clique no botão abaixo:
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Confirmar e-mail
          </Button>
          <Text style={footer}>
            Se você não criou uma conta, pode ignorar este e-mail com
            segurança.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
