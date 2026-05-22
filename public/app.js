const form = document.querySelector('#configForm');
const senderPhone = document.querySelector('#senderPhone');
const receiverPhone = document.querySelector('#receiverPhone');
const message = document.querySelector('#message');
const cronExpression = document.querySelector('#cronExpression');
const enabled = document.querySelector('#enabled');
const statusBadge = document.querySelector('#statusBadge');
const sessionText = document.querySelector('#sessionText');
const schedulerText = document.querySelector('#schedulerText');
const startBtn = document.querySelector('#startBtn');
const stopBtn = document.querySelector('#stopBtn');
const refreshBtn = document.querySelector('#refreshBtn');
const sendTestBtn = document.querySelector('#sendTestBtn');
const qrBox = document.querySelector('#qrBox');
const qrImage = document.querySelector('#qrImage');
const lastSend = document.querySelector('#lastSend');
const toast = document.querySelector('#toast');

function showToast(text, isError = false) {
  toast.textContent = text;
  toast.className = `toast ${isError ? 'error' : 'success'}`;
  setTimeout(() => toast.classList.add('hidden'), 4500);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'Erro inesperado.');
  }

  return data;
}

function statusLabel(status) {
  const map = {
    not_started: 'Não iniciado',
    starting: 'Iniciando',
    qr_code: 'Aguardando QR Code',
    connected: 'Conectado',
    stopped: 'Parado',
    error: 'Erro',
    isLogged: 'Logado',
    qrReadSuccess: 'QR lido',
    browserClose: 'Navegador fechado',
    desconnectedMobile: 'Desconectado no celular'
  };

  return map[status] || status || 'Desconhecido';
}

function fillForm(config) {
  senderPhone.value = config.senderPhone || '';
  receiverPhone.value = config.receiverPhone || '';
  message.value = config.message || '';
  cronExpression.value = config.cronExpression || '0 9 1 * *';
  enabled.checked = Boolean(config.enabled);
}

function renderState(state) {
  const { config, whatsapp, scheduler } = state;

  fillForm(config);

  const readableStatus = statusLabel(whatsapp.status);
  statusBadge.textContent = readableStatus;
  statusBadge.dataset.status = whatsapp.status || 'unknown';

  sessionText.textContent = `Sessão: ${whatsapp.sessionName || '-'}`;
  schedulerText.textContent = scheduler.active
    ? `Agendamento ativo em ${scheduler.timezone}`
    : 'Agendamento inativo';

  if (whatsapp.qr) {
    qrImage.src = whatsapp.qr;
    qrBox.classList.remove('hidden');
  } else {
    qrBox.classList.add('hidden');
    qrImage.removeAttribute('src');
  }

  lastSend.textContent = state.lastSend
    ? JSON.stringify(state.lastSend, null, 2)
    : 'Nenhum envio ainda.';
}

async function loadStatus() {
  const response = await fetch('/api/status');
  const state = await response.json();
  renderState(state);
  return state;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const data = await requestJson('/api/config', {
      method: 'POST',
      body: JSON.stringify({
        senderPhone: senderPhone.value,
        receiverPhone: receiverPhone.value,
        message: message.value,
        cronExpression: cronExpression.value,
        enabled: enabled.checked
      })
    });

    renderState(data.state);
    showToast('Configuração salva com sucesso.');
  } catch (error) {
    showToast(error.message, true);
  }
});

startBtn.addEventListener('click', async () => {
  try {
    showToast('Iniciando WhatsApp. Aguarde o QR Code aparecer.');
    const data = await requestJson('/api/whatsapp/start', { method: 'POST' });
    renderState(data.state);
  } catch (error) {
    showToast(error.message, true);
    await loadStatus();
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    const data = await requestJson('/api/whatsapp/stop', { method: 'POST' });
    renderState(data.state);
    showToast('Sessão parada.');
  } catch (error) {
    showToast(error.message, true);
  }
});

refreshBtn.addEventListener('click', async () => {
  try {
    await loadStatus();
    showToast('Status atualizado.');
  } catch (error) {
    showToast(error.message, true);
  }
});

sendTestBtn.addEventListener('click', async () => {
  try {
    const data = await requestJson('/api/send-test', { method: 'POST' });
    renderState(data.state);
    showToast('Mensagem de teste enviada.');
  } catch (error) {
    showToast(error.message, true);
    await loadStatus();
  }
});

loadStatus().catch((error) => showToast(error.message, true));
setInterval(loadStatus, 5000);
