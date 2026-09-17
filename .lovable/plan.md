# Entrada de estoque por XML de NF-e

## Objetivo
Adicionar ao painel administrativo um fluxo seguro para importar XMLs de compra, conferir os itens e atualizar o estoque sem alterar produtos por engano.

## Experiência no painel
- Criar uma aba **Entrada XML** ao lado da importação por planilha.
- Aceitar um ou vários arquivos `.xml` de NF-e e mostrar fornecedor, número da nota, emissão e totais.
- Listar cada item com código do fornecedor, EAN, descrição, quantidade e custo unitário.
- Sugerir automaticamente produtos já cadastrados por vínculo salvo, EAN/código e semelhança de nome.
- Permitir, item por item:
  - vincular a um produto existente;
  - cadastrar um produto novo, informando categoria, subcategoria, marca e preço de venda;
  - ignorar o item nesta entrada.
- Exibir um resumo antes da confirmação, com estoque atual e estoque resultante.

## Regras e segurança
- Somar a quantidade comprada ao estoque atual; o custo da nota não substituirá o preço de venda.
- Guardar o vínculo entre fornecedor/código/EAN e o produto para reconhecer compras futuras.
- Registrar cada nota e seus itens para auditoria.
- Impedir que a mesma chave de NF-e seja processada duas vezes.
- Aplicar toda a entrada de forma atômica: ou todos os itens válidos são atualizados, ou nenhum é.
- Restringir leitura e gravação a administradores.

## Dados
- Criar tabelas para vínculos de itens do fornecedor, entradas de estoque e itens das entradas, com permissões e políticas administrativas.
- Criar uma função transacional para validar a nota, criar produtos quando solicitado, incrementar os estoques e registrar a operação.
- Atualizar os tipos do banco após a migração.

## Validação
- Testar os dois XMLs enviados (Masterprint e Voolt), incluindo namespaces e `SEM GTIN`.
- Confirmar seleção de produto existente, cadastro de produto novo, item ignorado e bloqueio de nota duplicada.
- Verificar a tela em computador e celular e confirmar que o painel continua sem erros.
