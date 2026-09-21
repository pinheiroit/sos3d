# Serviço de NF-e (NFeWizard-io)

Este serviço roda separado do site, em um servidor Node (VPS, Render, Railway, Docker, etc.).
Ele é necessário porque a emissão de NF-e exige o certificado digital A1 e conexão direta com a SEFAZ,
o que a hospedagem do site não permite.

## Como subir

1. Copie a pasta `nfe-service` para o servidor.
2. Coloque o certificado A1 (`.pfx`) dentro da pasta.
3. Copie `.env.example` para `.env` e preencha os dados da empresa, o caminho/senha do certificado
   e um `NFE_SERVICE_TOKEN` forte (ex.: `openssl rand -hex 32`).
4. Instale e inicie:

```bash
npm install
npm start
```

5. Publique o serviço em um endereço HTTPS (ex.: `https://nfe.sos3d.com.br`).
6. No painel do site, salve os segredos `NFE_SERVICE_URL` (o endereço acima) e `NFE_SERVICE_TOKEN`
   (o mesmo token do `.env`).

Comece com `NFE_AMBIENTE=2` (homologação). As notas emitidas nesse modo são de teste e não têm valor fiscal.
Só mude para `1` depois de validar todo o fluxo.

## Rotas

Todas exigem o cabeçalho `Authorization: Bearer <NFE_SERVICE_TOKEN>`.

- `GET /health` — verifica se o serviço está no ar e se o certificado foi carregado.
- `POST /nfe/emitir` — emite a nota. Recebe destinatário, itens e pagamento; devolve chave, número,
  protocolo e os caminhos do XML e do DANFE.
- `POST /nfe/cancelar` — cancela a nota. Recebe `chave`, `protocolo` e `justificativa` (mínimo 15 caracteres).
- `GET /arquivos/...` — baixa o XML/DANFE gerado.
