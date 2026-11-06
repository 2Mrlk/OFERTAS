# 🏦 PoupaMais Finanças - Banco Digital & Notificações Nativas

<div align="center">

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Android](https://img.shields.io/badge/Android-API_36-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![License](https://img.shields.io/badge/Licença-MIT-emerald?style=for-the-badge)

<p align="center">
  <b>Aplicativo móvel desenvolvido para a disciplina de Programação para Dispositivos Móveis II</b><br>
  Uma solução completa de banco digital com gestão de saldo, caixinhas de economia e integração profunda com o sistema de <b>notificações locais nativas do Android</b> via <code>@capacitor/local-notifications</code>.
</p>

</div>

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Arquitetura e Fluxo Nativo](#-arquitetura-e-fluxo-nativo)
- [Funcionalidades em Detalhes](#-funcionalidades-em-detalhes)
  - [1. Gerenciamento de Permissões Nativas](#1-gerenciamento-de-permissões-nativas-android-13)
  - [2. Notificação Imediata de Pix](#2-notificação-imediata-de-pix-id-269)
  - [3. Alertas Agendados com Temporizador](#3-alertas-agendados-com-temporizador-5s-10s-15s)
  - [4. Desafio Extra: Gerenciamento de Pendentes](#4-desafio-extra-gerenciador-de-alertas-pendentes)
  - [5. Módulo de Gestão Financeira](#5-módulo-de-gestão-financeira--caixinhas)
  - [6. Efeitos Sonoros com Web Audio API](#6-efeitos-sonoros-nativos-web-audio-api)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Guia de Instalação e Execução](#-guia-de-instalação-e-execução)
  - [Ambiente Web](#modo-desenvolvimento-web)
  - [Gerando e Executando o APK Android](#gerando-e-executando-o-apk-android)
- [Automação e CI/CD](#-automação-e-cicd-github-actions)
- [Autoria](#-autoria)

---

## 🎯 Visão Geral

O **PoupaMais Finanças** foi construído com foco em alta fidelidade visual (tema dark fintech inspirado em Nubank e Revolut) e total conformidade com os requisitos da disciplina de Dispositivos Móveis II:

* **Controle Total de Notificações Locais:** Disparo imediato, agendamento futuro no sistema operacional, escuta de eventos nativos (`localNotificationReceived` e `localNotificationActionPerformed`) e manipulação de fila pendente (`getPending` e `cancel`).
* **Adaptação às Políticas Modernas do Android:** Suporte transparente ao Android 13+ (permissão em tempo de execução `POST_NOTIFICATIONS`) e Android 14+ (`SCHEDULE_EXACT_ALARM`).
* **Experiência Financeira Completa:** Controle de saldo com modo privacidade, extrato de transações dinâmico, caixinhas de rendimento CDI a 105% e simulação em tempo real de transferências Pix.

---

## 🏛️ Arquitetura e Fluxo Nativo

O aplicativo utiliza o **Capacitor 8** como ponte bidirecional entre o código JavaScript/React e os serviços nativos do Android (`NotificationManager` e `AlarmManager`):

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React 18 + Vite)               │
│          src/components/PoupaMaisApp.jsx               │
└──────────────────────────┬─────────────────────────────┘
                           │ Chamadas de API (@capacitor)
                           ▼
┌────────────────────────────────────────────────────────┐
│                    Capacitor Bridge                    │
│             @capacitor/local-notifications             │
└──────────────────────────┬─────────────────────────────┘
                           │ Intent / PendingIntent
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Android OS Services                  │
│   • AlarmManager (Agendamento exato allowWhileIdle)    │
│   • NotificationManager (Canais & Exibição na bandeja) │
│   • BroadcastReceiver (Acionamento mesmo minimizado)   │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Funcionalidades em Detalhes

### 1. Gerenciamento de Permissões Nativas (Android 13+)

A partir do Android 13 (API 33), as notificações requerem consentimento explícito do usuário em tempo de execução:
- **Verificação Automática:** Ao carregar, o app executa `LocalNotifications.checkPermissions()`.
- **Solicitação Assistida:** Caso o estado seja `prompt` ou `denied`, ao tentar disparar ou clicar no badge superior, o app invoca `LocalNotifications.requestPermissions()`, abrindo a caixa de diálogo nativa do sistema.
- **Badge de Status:** Exibe em tempo real no cabeçalho se a permissão está:
  - `Permissão Ativa ✅` (Verde esmeralda)
  - `Bloqueada ⛔` (Vermelho)
  - `Pendente ⚠️` (Âmbar)

### 2. Notificação Imediata de Pix (ID: 269)

Permite simular o recebimento de uma transferência bancária instantânea:
- **Campos Customizáveis:** Permite informar o valor desejado (ex.: `R$ 150,00`) e o nome do remetente (ex.: `Maria Souza`).
- **Disparo Nativo:** Executa `LocalNotifications.schedule()` sem a propriedade `schedule`, fazendo com que o Android entregue a notificação imediatamente no topo da tela e na barra de notificações.
- **Efeitos Colaterais:** 
  1. Incrementa o saldo da conta na interface instantaneamente.
  2. Adiciona o registro com tag `Pix` no topo do extrato.
  3. Sintetiza um som bancário característico de confirmação.

### 3. Alertas Agendados com Temporizador (5s, 10s, 15s)

Utiliza o `AlarmManager` do Android para agendar notificações precisas no futuro:
- **5 Segundos (ID: 271):** *Lembrete de Vencimento de Fatura do Cartão*.
- **10 Segundos (ID: 270):** *Parabéns! Meta Poupança Atingida (R$ 500 guardados)* — payload padrão da atividade prática.
- **15 Segundos (ID: 272):** *Alerta de Segurança e Verificação de Dispositivo*.
- **Execução em Segundo Plano:** Configurado com `allowWhileIdle: true`, garantindo que o alerta seja entregue mesmo com a tela bloqueada ou o aplicativo fechado/minimizado.

### 4. Desafio Extra: Gerenciador de Alertas Pendentes

Resolve o desafio complementar da disciplina:
- **Consulta em Tempo Real:** Sempre que um alerta é agendado ou concluído, a função `LocalNotifications.getPending()` é executada para sincronizar a lista de alarmes agendados no sistema.
- **Visualização:** Mostra cards com o identificador fixo (`#270`, `#271`, `#272`), título e corpo do alerta.
- **Cancelamento Individual:** Botão `✕ Cancelar` por card que executa `LocalNotifications.cancel({ notifications: [{ id }] })`.
- **Cancelamento em Lote:** Botão `Cancelar Todos` que varre a lista de pendentes e limpa a fila inteira de uma só vez.

### 5. Módulo de Gestão Financeira & Caixinhas

Interface estilo fintech desenvolvida com Tailwind CSS:
- **Modo Privacidade:** Botão de olho (👁️) para alternar entre exibir o saldo real ou ocultá-lo (`••••••`).
- **Caixinhas de Economia:**
  - *Reserva de Emergência:* Meta de R$ 5.000 (Rendimento de 105% do CDI diário).
  - *Viagem de Férias:* Meta de R$ 2.000.
  - *Novo Notebook / Setup:* Meta de R$ 3.000.
  - Barras de progresso com cálculo percentual dinâmico e gradientes modernos.
- **Extrato Financeiro:** Histórico detalhado de entradas (verdes com seta para baixo) e saídas (faturas e despesas com seta para cima).

### 6. Efeitos Sonoros Nativos (Web Audio API)

Sem dependência de arquivos de áudio externos (MP3/WAV pesados):
- Sons sintetizados matematicamente via `AudioContext`:
  - **Som de Pix:** Tríade harmônica ascendente (D5, A5, D6).
  - **Som de Agendamento:** Tom triangular suave de relógio/alarme.
  - **Som de Cancelamento:** Frequência descendente linear para remoção.

---

## 📂 Estrutura do Projeto

```text
OFERTAS-main/
├── .github/
│   └── workflows/
│       └── build-apk.yml           # Pipeline CI/CD para compilação automática do APK
├── android/
│   ├── app/
│   │   ├── build.gradle            # Configurações do módulo Android (Java 17, SDK 36)
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # Permissões POST_NOTIFICATIONS e SCHEDULE_EXACT_ALARM
│   │       └── res/values/
│   │           └── strings.xml     # Nome do app: "PoupaMais Finanças"
│   ├── build.gradle                # Buildscript do projeto Android (Gradle 8.14)
│   └── variables.gradle            # Versões de SDK e dependências AndroidX
├── src/
│   ├── components/
│   │   └── PoupaMaisApp.jsx        # Componente principal unificado (Finanças + Notificações)
│   ├── App.jsx                     # Ponto de entrada do React
│   ├── index.css                   # Tailwind e estilos de scroll/safe-area
│   └── main.jsx                    # Inicializador DOM do React
├── capacitor.config.json           # Configuração do Capacitor (appId: com.controle.de.dados)
├── index.html                      # Template HTML com fonte Plus Jakarta Sans
├── package.json                    # Dependências e scripts do Node.js
├── tailwind.config.js              # Tema, cores e keyframes de animação
└── vite.config.js                  # Configuração do empacotador Vite
```

---

## 🛠️ Guia de Instalação e Execução

### Pré-requisitos
* **Node.js:** Versão 18 ou superior.
* **Java JDK:** OpenJDK 17 ou 21 configurado no `JAVA_HOME`.
* **Android SDK:** Configurado no `ANDROID_HOME` com Build-Tools 35+ e Platform 36.

---

### Modo Desenvolvimento Web
Para testar a interface e a lógica de simulação direto no navegador:

```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Iniciar o servidor de desenvolvimento Vite
npm run dev
```

Acesse no navegador: `http://localhost:5173`.

---

### Gerando e Executando o APK Android

Para compilar e executar o aplicativo nativo no emulador ou dispositivo físico:

```bash
# 1. Compilar o frontend React para a pasta dist
npm run build

# 2. Sincronizar os recursos web com o projeto Android do Capacitor
npx cap sync android

# 3. Entrar na pasta do Android e compilar o APK Debug
cd android
./gradlew assembleDebug
```

O arquivo compilado estará disponível em:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Instalação e Execução via ADB:
```bash
# Instalar no emulador ou dispositivo conectado
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Iniciar a Activity principal
adb shell am start -n com.controle.de.dados/com.controle.de.dados.MainActivity
```

---

## 🤖 Automação e CI/CD (GitHub Actions)

O repositório conta com uma esteira de integração contínua configurada em `.github/workflows/build-apk.yml`. 

A cada `git push` na branch `main`:
1. Um container Ubuntu é instanciado.
2. Java JDK 21 e Node.js 22 são provisionados.
3. As dependências são instaladas e o build do Vite é executado.
4. O Capacitor sincroniza os assets.
5. O Gradle compila o APK debug (`assembleDebug`).
6. O artefato `poupamais-financas-apk` fica disponível para download direto na aba **Actions** do GitHub.

---

## 👤 Autoria

* **Desenvolvedor:** 2Mrlk
* **Repositório Oficial:** [github.com/2Mrlk/OFERTAS](https://github.com/2Mrlk/OFERTAS)
* **Disciplina:** Programação para Dispositivos Móveis II
* **Instituição de Ensino:** 2026
