# 🛒 Monitor de Ofertas - Supermercado Promoções

> Projeto desenvolvido para a disciplina de **Programação para Dispositivos Móveis II**.

Aplicativo inteligente para monitoramento, captura e comparação de preços de mercadorias e encartes de supermercados concorrentes.

---

## 🚀 Funcionalidades

### 🤖 Reconhecimento Inteligente de Mercadoria (IA)
* **Visão Computacional em Tempo Real:** Utiliza TensorFlow.js e MobileNet para analisar as fotos tiradas pela câmera ou enviadas pela galeria.
* **Validação Comercial:**
  * ✅ **Mercadoria Válida:** Identifica alimentos, bebidas, hortifruti, padaria, produtos de limpeza e embalagens. Sugere automaticamente o nome e a categoria do produto.
  * 📰 **Encartes Promocionais:** Reconhece folhetos, tabloides e cardápios de ofertas de supermercado.
  * ⛔ **Rejeição de Não-Mercadorias:** Bloqueia automaticamente fotos que retratam pessoas, rostos/selfies, animais de estimação (cães/gatos), veículos ou móveis domésticos.
* **Validação Textual:** Impede o cadastro de nomes vazios ou caracteres aleatórios repetitivos.

### 🔊 Efeitos Sonoros Nativos (Web Audio API)
* **Bip de Sucesso:** Toca o clássico som agudo de leitor de código de barras de caixa de supermercado ao reconhecer uma mercadoria.
* **Bip de Erro:** Emite um aviso grave duplo quando a foto não é de uma mercadoria válida.

### 🔴 Mira Ótica com Laser na Câmera
* Animação contínua de escaneamento a laser na câmera ao vivo para facilitar o enquadramento de mercadorias e encartes.

### 🏷️ Código de Barras Comercial (EAN-13)
* Geração e vinculação automática de código de barras EAN-13 brasileiro padrão (prefixo `789` e dígito verificador) para cada item cadastrado.
* Pesquisa de produtos por nome, supermercado ou código EAN.

### 💰 Comparador de Preços em Tempo Real
* Análise instantânea enquanto o usuário digita o preço:
  * 🟢 **Menor preço da cidade** (calcula a economia em relação ao concorrente).
  * 🟡 **Preço dentro da média**.
  * 🔴 **Preço acima da média**.

---

## 📂 Arquivos do Projeto

* **`Monitor de Ofertas.html`**: Protótipo interativo completo que roda diretamente em qualquer navegador moderno sem necessidade de instalação.
* **`SupermercadoPromoApp.jsx`**: Componente React com integração aos plugins nativos do **Capacitor** (`@capacitor/camera`) para dispositivos móveis Android/iOS.

---

## 🧪 Como Executar

### Opção 1: Protótipo Web
Dê um duplo clique no arquivo `Monitor de Ofertas.html` para abrir diretamente no navegador (Google Chrome, Edge, Firefox, etc.).

### Opção 2: Projeto Capacitor / React
Importe o componente `SupermercadoPromoApp.jsx` no seu projeto React/Vite com Capacitor.
