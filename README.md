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

## ☁️ Persistência na Nuvem (Supabase)

* **Storage:** a foto capturada pelo `@capacitor/camera` (URI/webPath) é convertida em `Blob` e enviada ao bucket público `fotos-ofertas` com `supabase.storage.from().upload()`.
* **Database:** os dados da oferta (produto, preço, mercado, EAN, tag da IA e a URL pública da foto) ficam na tabela `public.ofertas`.
* Ao remover uma oferta, o registro **e** o arquivo no bucket são apagados.

### Configuração
1. No painel do Supabase, abra **SQL Editor** e execute `supabase/schema.sql` (cria tabela, view, bucket e políticas RLS).
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
3. Para o APK no GitHub Actions, cadastre os mesmos dois valores em **Settings → Secrets and variables → Actions**.

> ⚠️ As políticas RLS liberam o papel `anon` (o app não tem login). Ao adicionar Supabase Auth, troque para `authenticated`.

---

## 📂 Arquivos do Projeto

* **`Monitor de Ofertas.html`**: Protótipo interativo completo (sem nuvem) que roda direto no navegador.
* **`src/components/SupermercadoPromoApp.jsx`**: Componente React com `@capacitor/camera` + Supabase.
* **`src/services/supabase.js`** e **`src/services/ofertas.js`**: cliente Supabase, conversão da foto para Blob, upload, listagem e remoção.
* **`supabase/schema.sql`**: SQL do banco e do Storage.

---

## 🧪 Como Executar

```bash
npm install
cp .env.example .env   # preencha as chaves do Supabase
npm run dev            # navegador
npm run build && npx cap sync android   # Android
```
