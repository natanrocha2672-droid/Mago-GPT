require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const wppconnect = require('@wppconnect-team/wppconnect');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const TOKEN_DIR = path.join(DATA_DIR, 'tokens');
const TIMEZONE = process.env.TZ || 'America/Sao_Paulo';

let client = null;
let startPromise = null;
let scheduledTask = null;
let latestQr = null;
let latestStatus = 'not_started';
let latestSessionName = null;
let lastSend = null;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(TOKEN_DIR, { recursive: true });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

function defaultConfig() {
  return {
    senderPhone: '',
    receiverPhone: '',
    message: 'Olá! Esta é sua mensagem mensal automática.',
    cronExpression: '0 9 1 * *',
    enabled: true
  };
}

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return defaultConfig();
  }

  try {
    return { ...defaultConfig(), ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch (error) {
    console.error('Erro ao ler config:', error);
    return defaultConfig();
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function sessionFromSender(senderPhone) {
  const digits = onlyDigits(senderPhone);
  return digits ? `sender_${digits}` : 'sender_default';
}

function toWhatsappId(phone) {
  const digits = onlyDigits(phone);
  if (!digits) {
    throw new Error('Número de destino inválido. Use formato internacional, exemplo: 5588999999999.');
  }
  return `${digits}@c.us`;
}

function validateConfig(input) {
  const next = {
    senderPhone: onlyDigits(input.senderPhone),
    receiverPhone: onlyDigits(input.receiverPhone),
    message: String(input.message || '').trim(),
    cronExpression: String(input.cronExpression || '').trim(),
    enabled: Boolean(input.enabled)
  };

  if (next.senderPhone.length < 10) {
    throw new Error('Informe o número que vai enviar no formato internacional. Exemplo: 5588999999999.');
  }

  if (next.receiverPhone.length < 10) {
    throw new Error('Informe o número que vai receber no formato internacional. Exemplo: 5588999999999.');
  }

  if (!next.message) {
    throw new Error('Informe a mensagem.');
  }

  if (!cron.validate(next.cronExpression)) {
    throw new Error('Expressão cron inválida. Exemplo mensal: 0 9 1 * *.');
  }

  return next;
}

function publicState() {
  const config = readConfig();
  return {
    config,
    whatsapp: {
      status: latestStatus,
      sessionName: latestSessionName,
      hasClient: Boolean(client),
      hasQr: Boolean(latestQr),
      qr: latestQr
    },
    scheduler: {
      active: Boolean(scheduledTask),
      timezone: TIMEZONE
    },
    lastSend
  };
}

async function stopClient() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (client) {
    try {
      await client.close();
    } catch (error) {
      console.error('Erro ao fechar cliente:', error);
    }
  }

  client = null;
  startPromise = null;
  latestStatus = 'stopped';
}

async function sendConfiguredMessage() {
  const config = readConfig();

  if (!client) {
    throw new Error('WhatsApp não está conectado. Inicie a sessão e escaneie o QR Code.');
  }

  const destination = toWhatsappId(config.receiverPhone);
  await client.sendText(destination, config.message);

  lastSend = {
    ok: true,
    destination,
    sentAt: new Date().toISOString()
  };

  return lastSend;
}

function configureScheduler() {
  const config = readConfig();

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!config.enabled) {
    return;
  }

  scheduledTask = cron.schedule(
    config.cronExpression,
    async () => {
      try {
        console.log('Executando envio agendado...');
        await sendConfiguredMessage();
        console.log('Envio agendado concluído.');
      } catch (error) {
        lastSend = {
          ok: false,
          error: error.message,
          sentAt: new Date().toISOString()
        };
        console.error('Erro no envio agendado:', error);
      }
    },
    { timezone: TIMEZONE }
  );
}

async function startClient() {
  const config = readConfig();
  const sessionName = sessionFromSender(config.senderPhone);

  if (client && latestSessionName === sessionName) {
    configureScheduler();
    return client;
  }

  if (startPromise) {
    return startPromise;
  }

  if (client && latestSessionName !== sessionName) {
    await stopClient();
  }

  latestQr = null;
  latestStatus = 'starting';
  latestSessionName = sessionName;

  startPromise = wppconnect
    .create({
      session: sessionName,
      folderNameToken: TOKEN_DIR,
      headless: true,
      logQR: true,
      catchQR: (base64Qrimg, asciiQR) => {
        latestQr = base64Qrimg;
        latestStatus = 'qr_code';
        console.log('\nEscaneie o QR Code pelo painel ou pelo terminal:\n');
        console.log(asciiQR);
      },
      statusFind: (statusSession, session) => {
        latestStatus = statusSession;
        latestSessionName = session;
        console.log(`Status da sessão ${session}: ${statusSession}`);
      },
      puppeteerOptions: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer'
        ]
      }
    })
    .then((createdClient) => {
      client = createdClient;
      latestQr = null;
      latestStatus = 'connected';
      configureScheduler();
      return client;
    })
    .catch((error) => {
      latestStatus = 'error';
      startPromise = null;
      console.error('Erro ao iniciar WPPConnect:', error);
      throw error;
    });

  return startPromise;
}

app.get('/api/status', (req, res) => {
  res.json(publicState());
});

app.post('/api/config', async (req, res) => {
  try {
    const previous = readConfig();
    const next = validateConfig(req.body);
    writeConfig(next);
    configureScheduler();

    if (previous.senderPhone && previous.senderPhone !== next.senderPhone) {
      await stopClient();
    }

    res.json({ ok: true, state: publicState() });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post('/api/whatsapp/start', async (req, res) => {
  try {
    await startClient();
    res.json({ ok: true, state: publicState() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, state: publicState() });
  }
});

app.post('/api/whatsapp/stop', async (req, res) => {
  try {
    await stopClient();
    res.json({ ok: true, state: publicState() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/send-test', async (req, res) => {
  try {
    const result = await sendConfiguredMessage();
    res.json({ ok: true, result, state: publicState() });
  } catch (error) {
    lastSend = {
      ok: false,
      error: error.message,
      sentAt: new Date().toISOString()
    };
    res.status(400).json({ ok: false, error: error.message, state: publicState() });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  configureScheduler();

  const config = readConfig();
  if (config.senderPhone && config.receiverPhone && process.env.AUTO_START === 'true') {
    startClient().catch((error) => console.error('Falha no AUTO_START:', error));
  }
});
