# 🏦 PoupaMais Finanças - Banco Digital & Notificações Nativas

> Aplicativo móvel desenvolvido para a disciplina de **Programação para Dispositivos Móveis II**.

Aplicativo moderno de gestão financeira, simulação bancária e notificações nativas em tempo real no Android via **@capacitor/local-notifications**.

---

## 🚀 Funcionalidades

### 🔔 Notificações Locais e Alertas Nativos (@capacitor/local-notifications)
* **Permissão Nativa no Android 13+:** Verificação e solicitação do canal de permissões de notificação do sistema operacional.
* **Disparo Imediato:** Simulação de recebimento instantâneo de Pix com notificação em tempo real na barra de status do celular (ID 269).
* **Alertas Temporizados / Agendados:**
  * ⏱️ **5s (ID 271):** Lembrete de vencimento de fatura do cartão.
  * ⏱️ **10s (ID 270):** Notificação comemorativa de meta financeira poupada (R$ 500 guardados).
  * ⏱️ **15s (ID 272):** Alerta de proteção e monitoramento de segurança da conta.
* **Desafio Extra - Gerenciamento de Pendentes:**
  * Consulta em tempo real das notificações na fila do sistema via `LocalNotifications.getPending()`.
  * Cancelamento individual por ID ou cancelamento em lote de todos os alertas ativos.

### 💰 Gestão Financeira & Banco Digital
* **Saldo Interativo & Extrato:** Consulta com botão de visualização/ocultação de saldo e atualização automática após recebimentos.
* **Caixinhas PoupaMais:** Metas financeiras com rendimento diário de 105% do CDI e barras de progresso visuais.
* **Feedback Sonoro (Web Audio API):** Síntese nativa de efeito sonoro de Pix e alertas bancários.

---

## 🛠️ Tecnologias Utilizadas

* **React 18** + **Vite 5**
* **Tailwind CSS** (Tema Dark Fintech Nubank/Revolut)
* **Capacitor 8** + **@capacitor/local-notifications** + **@capacitor/android**
* **Google Fonts (Plus Jakarta Sans)**

---

## 📱 Como Executar

### Desenvolvimento Web:
```bash
npm install
npm run dev
```

### Build & Sincronização Android:
```bash
npm run build
npx cap sync android
```

### Compilar APK Debug:
```bash
cd android
./gradlew assembleDebug
```
