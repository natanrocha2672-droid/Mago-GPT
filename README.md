# WPPConnect Monthly Scheduler

Aplicação com frontend e backend para configurar uma mensagem mensal enviada pelo WhatsApp usando WPPConnect.

## O que tem no projeto

- Painel web para configurar:
  - número remetente;
  - número destinatário;
  - mensagem;
  - expressão cron;
  - ativar/desativar envio automático.
- Backend Express.
- WPPConnect para conectar o WhatsApp via QR Code.
- Agendamento com node-cron.
- Persistência em volume Fly.io usando `/data`.

## Rodando localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Acesse:

```txt
http://localhost:3000
```

## Formato dos números

Use formato internacional, sem `+`, espaços ou parênteses.

Exemplo Brasil:

```txt
55 + DDD + número
```

Exemplo:

```txt
5588999999999
```

## Cron mensal

O padrão é:

```txt
0 9 1 * *
```

Isso envia todo dia 1 de cada mês às 09:00 no fuso `America/Sao_Paulo`.

## Deploy no Fly.io

Instale o Fly CLI e faça login:

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

Crie o app. Se quiser usar o nome do `fly.toml`:

```bash
fly apps create mago-gpt-wpp-scheduler
```

Crie o volume persistente na região de São Paulo:

```bash
fly volumes create wpp_data --region gru --size 1
```

Faça o deploy:

```bash
fly deploy
```

Abra o app:

```bash
fly open
```

No painel:

1. preencha o número que vai enviar;
2. preencha o número que vai receber;
3. escreva a mensagem;
4. salve a configuração;
5. clique em **Iniciar WhatsApp**;
6. escaneie o QR Code com o WhatsApp do número remetente;
7. clique em **Enviar teste agora** para testar.

## Importante

O WPPConnect automatiza o WhatsApp Web. Não é a API oficial da Meta. Evite disparos em massa, spam ou mensagens sem consentimento.

## Segurança

Este app ainda não tem login/senha. Se for deixar público, adicione autenticação antes de usar em produção.

Enquanto não tiver autenticação, use com cuidado porque qualquer pessoa com acesso ao link pode alterar os números e enviar teste.
