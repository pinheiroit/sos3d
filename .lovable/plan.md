# Pesquisa de produto para vínculo da NF-e

## Objetivo
Tornar o vínculo de cada item da nota mais seguro e fácil, evitando a lista extensa e a seleção do produto errado.

## Alterações na tela
- Substituir o seletor aberto de produtos por um botão **Pesquisar produto**.
- Abrir uma janela dedicada ao item da NF-e atual, mantendo sua descrição, código e quantidade visíveis para comparação.
- Disponibilizar filtros combináveis por:
  - marca;
  - tipo, usando a subcategoria cadastrada do produto;
  - descrição ou nome do produto.
- Mostrar somente os produtos encontrados, com nome, marca, categoria/tipo e estoque atual.
- Permitir escolher um resultado explicitamente e confirmar o vínculo.
- Após a escolha, exibir no item da nota um resumo claro do produto vinculado e uma opção para trocar a seleção.
- Manter intactas as opções **Cadastrar novo** e **Ignorar item**.

## Comportamento
- A busca textual não diferenciará maiúsculas, minúsculas ou acentos.
- Os filtros poderão ser limpos de uma vez.
- A janela começará com a descrição do item da NF-e preenchida na busca para reduzir resultados misturados.
- Nenhuma alteração de estoque ou regra de processamento será feita; muda apenas a forma de selecionar o produto existente.

## Validação
- Conferir busca e filtros isolados e combinados.
- Confirmar que selecionar e trocar um produto atualiza corretamente a previsão de estoque.
- Verificar a janela em computador e celular, sem listas ultrapassando a tela.
