# Gestão de consignação SOS.3D

## Objetivo e decisões confirmadas
Implantar o ciclo do documento enviado dentro do painel administrativo, utilizando os clientes já cadastrados no site e nas televendas. A operação será feita somente pela equipe interna, sem novas telas de consignação no portal do cliente. O financeiro será integrado à Conta Azul.

## 1. Credenciamento de clientes
- Adicionar a opção **Habilitado para consignação** no cadastro de clientes; apenas o administrador pode conceder ou retirar a habilitação.
- Manter a liberação independente de Membro, Vendedor ou Administrador.
- Configurar limite em valor ou quantidade, preços de fornecimento e revenda sugerida, periodicidade de fechamento, prazo de pagamento, reposição, devolução e responsabilidade por perdas.
- Registrar contrato, condições acordadas, histórico e bloqueio de novas remessas. Desabilitar não apaga estoque nem dívidas existentes.

## 2. Área Consignação no painel
Organizar em **Visão geral, Parceiros, Remessas, Estoque e vendas, Fechamentos, Financeiro, Devoluções e inventários**. Administradores e vendedores operam o atendimento; credenciamento, condições comerciais, ajustes e decisões financeiras ficam sob controle administrativo.

## 3. Remessas e estoque
- Reutilizar catálogo e estoque central existentes; não criar um segundo cadastro de produtos.
- Montar remessas com produtos, quantidades, preços negociados, lote e número de série quando aplicável.
- Fluxo: preparação, separação, expedição, em trânsito e recebimento conferido. Retirar do estoque central na expedição; disponibilizar no parceiro após confirmação do recebimento.
- Validar estoque central, habilitação, bloqueios e limite antes da expedição. Permitir reposições e múltiplas remessas simultâneas.
- A remessa movimenta mercadorias, mas não cria venda nem cobrança. Controlar origem, localização, saldo e histórico de cada item.

## 4. Vendas e fechamento misto
- Registrar vendas individuais ou consolidadas pela equipe, com rastreabilidade da remessa e preço de fornecimento preservado.
- Impedir vendas superiores ao saldo disponível.
- Permitir fechamento parcial, periódico ou integral, cobrando somente unidades vendidas ainda não incluídas em fechamento.
- Gerar demonstrativo com cliente, período, remessas, produtos, quantidades, preços e totais, para PDF e impressão.
- Separar encerramento de estoque de quitação financeira: uma remessa encerrada pode continuar com cobranças pendentes.

## 5. Conta Azul e financeiro
- Concluir a conexão autorizada com a Conta Azul e verificar o que a conta permite antes de enviar dados reais.
- Vincular os clientes e produtos existentes aos respectivos registros na Conta Azul.
- Enviar a venda apenas após aprovação do fechamento, nunca na remessa. Preservar a decisão anterior de estoque oficial na Conta Azul, conciliando a movimentação de consignação para não dar baixa duas vezes.
- Vincular cada cobrança ao fechamento, com vencimento, pagamentos parciais, saldo, situação e histórico. Sincronizar recebimentos e cancelamentos com rastreabilidade e proteção contra duplicidade.
- A emissão de NF-e ocorre na Conta Azul; o site acompanha e busca os documentos disponíveis. O tratamento fiscal das remessas, devoluções e vendas precisa ser definido com a contabilidade, sem inventar CFOP ou tributação.
- Mostrar pendências de integração e permitir retomada segura sem duplicar vendas ou cobranças.

## 6. Devoluções, perdas e inventário
- Registrar solicitação, autorização, transporte, recebimento e conferência de devoluções pela equipe.
- Produtos íntegros retornam ao estoque central; danos e divergências ficam separados para análise, sem aumentar o estoque disponível indevidamente.
- Registrar inventário esperado versus físico, justificativa, responsável e decisão autorizada. Nunca apagar movimentações para corrigir saldo.
- Cobranças por perdas ou avarias somente mediante decisão administrativa registrada.

## 7. Indicadores
Filtros por período, parceiro, produto, categoria e situação. Exibir estoque central/distribuído/em trânsito, capital consignado, vendas, faturamento, saldo a receber, atrasos, giro, estoque parado e necessidade de reposição, com visão consolidada e por parceiro.

## Detalhes técnicos e validação
- Funções autenticadas com verificação de papéis; registros operacionais privados e contratos em armazenamento privado.
- Movimentações e fechamentos atômicos com bloqueio dos saldos, valores monetários precisos e histórico rastreável.
- Integração externa somente no servidor; credenciais fora do código e identificadores de sincronização persistidos.
- Testar: habilitação obrigatória, limite comercial, saldo não negativo, remessa sem cobrança, múltiplas remessas, fechamento sem duplicidade, pagamentos parciais, devoluções e bloqueio de acesso indevido.
- Validar no painel o cenário do documento: 50 × R$ 65,00; fechamento de 20 unidades por R$ 1.300,00; pagamento de R$ 1.000,00; reposição de 20 unidades; fechamento das 30 restantes por R$ 1.950,00; saldo financeiro de R$ 2.250,00 e nova remessa ainda disponível.
- Conferir os fluxos no computador e celular, com listas roláveis e ações acessíveis.

## Dependências para concluir a implantação
Conexão autorizada com a Conta Azul e orientação fiscal/contábil para consignação. As telas e regras internas podem ser implementadas antes, mas o envio fiscal/financeiro real só será declarado concluído após validação na conta conectada.