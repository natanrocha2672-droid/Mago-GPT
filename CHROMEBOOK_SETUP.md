# Deploy pelo Chromebook com Linux

Este guia é para rodar o deploy do app WPPConnect Scheduler usando o terminal Linux do Chromebook.

## 1. Ativar Linux no Chromebook

No ChromeOS:

1. Abra **Configurações**.
2. Vá em **Desenvolvedores**.
3. Ative **Ambiente de desenvolvimento Linux**.
4. Abra o app **Terminal**.

## 2. Atualizar o Linux

```bash
sudo apt update && sudo apt upgrade -y
```

## 3. Instalar ferramentas básicas

```bash
sudo apt install -y git curl ca-certificates
```

## 4. Baixar o projeto

```bash
git clone https://github.com/natanrocha2672-droid/Mago-GPT.git
cd Mago-GPT
```

## 5. Instalar o Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

Adicione o Fly ao PATH:

```bash
echo 'export PATH="$HOME/.fly/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Teste:

```bash
fly version
```

## 6. Fazer login no Fly.io

```bash
fly auth login
```

O comando vai abrir uma página no navegador. Faça login ou crie sua conta no Fly.io.

## 7. Criar app no Fly.io

```bash
fly apps create mago-gpt-wpp-scheduler
```

Se o nome já estiver em uso, crie outro nome:

```bash
fly apps create mago-gpt-wpp-scheduler-natan
```

Se mudar o nome, altere também o arquivo `fly.toml` na linha:

```toml
app = "mago-gpt-wpp-scheduler"
```

## 8. Criar volume persistente

```bash
fly volumes create wpp_data --region gru --size 1 --app mago-gpt-wpp-scheduler
```

Se você mudou o nome do app, troque o nome no comando também.

## 9. Fazer deploy

```bash
fly deploy
```

## 10. Abrir o painel

```bash
fly open
```

No painel:

1. informe o número que vai enviar;
2. informe o número que vai receber;
3. escreva a mensagem;
4. salve;
5. clique em **Iniciar WhatsApp**;
6. escaneie o QR Code;
7. clique em **Enviar teste agora**.

## Problemas comuns

### fly: command not found

Rode:

```bash
source ~/.bashrc
```

Ou:

```bash
export PATH="$HOME/.fly/bin:$PATH"
```

### App name already taken

Use outro nome no comando `fly apps create` e atualize o `fly.toml`.

### Volume already exists

Você pode pular a criação do volume se ele já existir.

### Deploy falhou

Veja os logs:

```bash
fly logs --app mago-gpt-wpp-scheduler
```
