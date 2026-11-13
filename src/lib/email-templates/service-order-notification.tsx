import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { main, header, headerText, content, h1, text, button } from './brand'

interface Props {
  number?: string
  action?: string
  customer?: string
  equipment?: string
  status?: string
  actor?: string
  summary?: string
}

const ServiceOrderEmail = ({ number = 'O.S.', action = 'atualizada', customer = 'Não informado', equipment = 'Não informado', status = '', actor = 'Atendimento', summary = '' }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{number} {action} — {customer}</Preview>
    <Body style={main}>
      <Container style={{ maxWidth: '600px', paddingBottom: '24px' }}>
        <Section style={header}><Text style={headerText}>SOS.3D · Assistência técnica</Text></Section>
        <Section style={content}>
          <Heading style={h1}>{number} {action}</Heading>
          <Text style={text}><strong>Cliente:</strong> {customer}<br /><strong>Equipamento:</strong> {equipment}<br /><strong>Status:</strong> {status}<br /><strong>Responsável:</strong> {actor}</Text>
          <Text style={text}>{summary}</Text>
          <Button href="https://sos3d.com.br/admin" style={button}>Abrir painel de atendimento</Button>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ServiceOrderEmail,
  subject: (data) => `SOS.3D: ${data['number'] || 'O.S.'} ${data['action'] || 'atualizada'}`,
  displayName: 'Aviso de ordem de serviço',
  to: 'sos.ind.ac@gmail.com',
  previewData: { number: 'OS 0042', action: 'criada', customer: 'Cliente exemplo', equipment: 'Impressora 3D', status: 'Recebido', actor: 'Atendimento', summary: 'Nova ordem de serviço criada.' },
} satisfies TemplateEntry