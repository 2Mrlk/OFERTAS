import React, { useEffect, useState, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * PoupaMais Finanças - Banco Digital & Gestão Inteligente
 * Disciplina: Programação para Dispositivos Móveis II
 *
 * Funcionalidades Nativas e Regras de Negócio:
 * - Verificação e solicitação nativa de permissões (Android 13+ e iOS)
 * - Disparo imediato de notificação com feedback sonoro e visual (ID: 269)
 * - Agendamento de alertas financeiros (5s: ID 271, 10s: ID 270, 15s: ID 272)
 * - Desafio Extra: Listagem em tempo real de notificações pendentes (getPending)
 * - Cancelamento individual de notificação por ID e cancelamento global
 * - Extrato interativo com saldo dinâmico atualizado via Pix
 * - Metas financeiras (Caixinhas) com barras de progresso
 */

const ID_IMEDIATA = 269;
const ID_AGENDADOS = { 5: 271, 10: 270, 15: 272 };

// Sintetizador de sons bancários via Web Audio API
function tocarSom(tipo = 'pix') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (tipo === 'pix') {
      // Tom de sucesso estilo banco digital (agudo e harmônico)
      const freqs = [587.33, 880, 1174.66]; // D5, A5, D6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.15);
      });
    } else if (tipo === 'agendado') {
      // Alerta sutil de confirmação
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (tipo === 'cancelar') {
      // Tom suave de remoção
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    console.debug('Áudio indisponível:', e);
  }
}

const horaCurta = (data) =>
  new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatarDinheiro = (val) =>
  Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PoupaMaisApp() {
  const [permissao, setPermissao] = useState('desconhecida');
  const [pendentes, setPendentes] = useState([]);
  const [status, setStatus] = useState({ tipo: '', texto: '' });
  const [ocupado, setOcupado] = useState(false);
  const [verSaldo, setVerSaldo] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('alertas'); // 'alertas' | 'extrato' | 'metas'

  // Dados financeiros do usuário
  const [saldo, setSaldo] = useState(4850.2);
  const [pixValor, setPixValor] = useState('150,00');
  const [pixRemetente, setPixRemetente] = useState('Maria Souza');

  const [transacoes, setTransacoes] = useState([
    { id: 1, tipo: 'entrada', titulo: 'Pix Recebido - Maria Souza', valor: 150.0, data: 'Hoje, 10:15', tag: 'Pix' },
    { id: 2, tipo: 'entrada', titulo: 'Rendimento Automático CDI', valor: 14.5, data: 'Hoje, 06:00', tag: 'Investimento' },
    { id: 3, tipo: 'saida', titulo: 'Pagamento Fatura Cartão', valor: 320.0, data: 'Ontem', tag: 'Fatura' },
    { id: 4, tipo: 'saida', titulo: 'Supermercado Mensal', valor: 89.4, data: '04 Nov', tag: 'Alimentação' },
  ]);

  const metas = [
    { id: 1, titulo: 'Reserva de Emergência', atual: 3500, total: 5000, icone: '🛡️', cor: 'from-emerald-500 to-teal-400' },
    { id: 2, titulo: 'Viagem de Férias', atual: 1450, total: 2000, icone: '✈️', cor: 'from-sky-500 to-blue-500' },
    { id: 3, titulo: 'Novo Notebook / Setup', atual: 2400, total: 3000, icone: '💻', cor: 'from-amber-500 to-orange-400' },
  ];

  const atualizarPendentes = async () => {
    try {
      const { notifications } = await LocalNotifications.getPending();
      setPendentes(notifications || []);
    } catch (e) {
      console.warn('Erro ao ler notificações pendentes:', e);
    }
  };

  useEffect(() => {
    let recebidaSub;
    let tocadaSub;

    (async () => {
      try {
        const atual = await LocalNotifications.checkPermissions();
        setPermissao(atual.display);
      } catch (e) {
        console.warn('Erro checando permissões:', e);
      }
      await atualizarPendentes();

      try {
        recebidaSub = await LocalNotifications.addListener('localNotificationReceived', (n) => {
          tocarSom('pix');
          setStatus({ tipo: 'ok', texto: `🔔 Alerta recebido na tela: ${n.title} - ${n.body}` });
          atualizarPendentes();
        });

        tocadaSub = await LocalNotifications.addListener('localNotificationActionPerformed', (acao) => {
          tocarSom('pix');
          setStatus({ tipo: 'ok', texto: `👆 Você abriu o alerta: ${acao.notification.title}` });
          atualizarPendentes();
        });
      } catch (e) {
        console.warn('Listeners de notificação não suportados no ambiente atual:', e);
      }
    })();

    return () => {
      recebidaSub?.remove?.();
      tocadaSub?.remove?.();
    };
  }, []);

  const solicitarPermissao = async () => {
    try {
      let estado = await LocalNotifications.checkPermissions();
      if (estado.display !== 'granted') {
        estado = await LocalNotifications.requestPermissions();
      }
      setPermissao(estado.display);
      if (estado.display === 'granted') {
        tocarSom('pix');
        setStatus({ tipo: 'ok', texto: 'Permissão concedida! Os alertas nativos serão exibidos no seu celular.' });
        return true;
      }
      setStatus({
        tipo: 'erro',
        texto: 'Permissão negada. Ative as notificações nas configurações do seu celular.',
      });
      return false;
    } catch (e) {
      setStatus({ tipo: 'erro', texto: `Erro ao solicitar permissão: ${e.message || 'desconhecido'}` });
      return false;
    }
  };

  const garantirPermissao = async () => {
    if (permissao === 'granted') return true;
    return solicitarPermissao();
  };

  // Disparo Imediato (Pix Recebido)
  const dispararPixImediato = async () => {
    setOcupado(true);
    setStatus({ tipo: '', texto: '' });
    try {
      if (!(await garantirPermissao())) return;

      const numValor = parseFloat(pixValor.replace(/\./g, '').replace(',', '.')) || 150.0;
      const remetente = pixRemetente.trim() || 'Maria Souza';

      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'PoupaMais Finanças 💸',
            body: `Pix recebido! Você recebeu R$ ${formatarDinheiro(numValor)} de ${remetente}.`,
            id: ID_IMEDIATA,
            sound: null,
            attachments: null,
            actionTypeId: '',
            extra: { origem: 'imediata', tipo: 'pix', valor: numValor, remetente },
          },
        ],
      });

      tocarSom('pix');
      setSaldo((s) => s + numValor);
      setTransacoes((prev) => [
        {
          id: Date.now(),
          tipo: 'entrada',
          titulo: `Pix Recebido - ${remetente}`,
          valor: numValor,
          data: 'Agora',
          tag: 'Pix',
        },
        ...prev,
      ]);

      setStatus({
        tipo: 'ok',
        texto: `Notificação imediata enviada! Saldo atualizado (+R$ ${formatarDinheiro(numValor)}).`,
      });
      await atualizarPendentes();
    } catch (error) {
      console.error(error);
      setStatus({ tipo: 'erro', texto: `Falha ao enviar notificação: ${error.message || 'desconhecido'}` });
    } finally {
      setOcupado(false);
    }
  };

  // Disparo Agendado (5s, 10s, 15s)
  const agendarAlerta = async (segundos, titulo, mensagem) => {
    setOcupado(true);
    setStatus({ tipo: '', texto: '' });
    try {
      if (!(await garantirPermissao())) return;

      const tempoFuturo = new Date(Date.now() + segundos * 1000);
      const idNotif = ID_AGENDADOS[segundos] || (270 + segundos);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: titulo || 'PoupaMais Alerta',
            body: mensagem || 'Lembrete financeiro agendado.',
            id: idNotif,
            schedule: { at: tempoFuturo, allowWhileIdle: true },
            extra: { origem: 'agendada', segundos, idNotif },
          },
        ],
      });

      tocarSom('agendado');
      setStatus({
        tipo: 'ok',
        texto: `⏰ Alerta agendado para ${horaCurta(tempoFuturo)} (em ${segundos}s). Pode minimizar o aplicativo!`,
      });
      await atualizarPendentes();
    } catch (error) {
      console.error(error);
      setStatus({ tipo: 'erro', texto: `Falha ao agendar: ${error.message || 'desconhecido'}` });
    } finally {
      setOcupado(false);
    }
  };

  // Desafio Extra: Cancelar alerta individual
  const cancelarAlerta = async (id) => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      tocarSom('cancelar');
      setStatus({ tipo: 'aviso', texto: `Alerta #${id} cancelado com sucesso.` });
      await atualizarPendentes();
    } catch (error) {
      console.error(error);
      setStatus({ tipo: 'erro', texto: 'Não foi possível cancelar o alerta.' });
    }
  };

  // Desafio Extra: Cancelar todos os alertas
  const cancelarTodos = async () => {
    try {
      const { notifications } = await LocalNotifications.getPending();
      if (!notifications || notifications.length === 0) {
        setStatus({ tipo: 'aviso', texto: 'Não há alertas pendentes para cancelar.' });
        return;
      }
      await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
      tocarSom('cancelar');
      setStatus({ tipo: 'aviso', texto: `${notifications.length} alerta(s) cancelado(s) com sucesso.` });
      await atualizarPendentes();
    } catch (error) {
      console.error(error);
      setStatus({ tipo: 'erro', texto: 'Não foi possível cancelar os alertas pendentes.' });
    }
  };

  const badgePermissao = {
    granted: { txt: 'Permissão Ativa ✅', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    denied: { txt: 'Bloqueada ⛔', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    prompt: { txt: 'Pendente ⚠️', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    'prompt-with-rationale': { txt: 'Pendente ⚠️', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    desconhecida: { txt: 'Verificando...', cls: 'bg-slate-700/50 text-slate-300 border-slate-600' },
  }[permissao] || { txt: permissao, cls: 'bg-slate-700/50 text-slate-300 border-slate-600' };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 shadow-2xl border-x border-slate-800/40 selection:bg-emerald-500 selection:text-white">
      {/* Top Bar / Header */}
      <header className="relative overflow-hidden bg-gradient-to-b from-emerald-950/60 via-slate-900 to-slate-950 px-5 pt-8 pb-6 border-b border-emerald-500/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-emerald-400 text-base">
                PM
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Banco Digital</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">PoupaMais</h1>
            </div>
          </div>

          <button
            onClick={solicitarPermissao}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border backdrop-blur-md transition-all ${badgePermissao.cls}`}
          >
            {badgePermissao.txt}
          </button>
        </div>

        {/* Card do Saldo Principal */}
        <div className="relative mt-5 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 p-5 border border-slate-700/50 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Saldo disponível</span>
            <button
              onClick={() => setVerSaldo(!verSaldo)}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/50"
            >
              <span>{verSaldo ? '👁️' : '🙈'}</span>
              <span className="text-[11px]">{verSaldo ? 'Ocultar' : 'Mostrar'}</span>
            </button>
          </div>

          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-sm font-semibold text-emerald-400">R$</span>
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {verSaldo ? formatarDinheiro(saldo) : '••••••'}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
            <span>📈</span>
            <span className="font-semibold">+ R$ 142,50 este mês (105% CDI)</span>
          </div>

          {/* Ações Rápidas do Banco */}
          <div className="mt-5 grid grid-cols-4 gap-2 pt-4 border-t border-slate-800">
            <button
              onClick={() => setAbaAtiva('alertas')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/60 active:scale-95 transition-all text-slate-300 hover:text-emerald-400"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg">
                💸
              </div>
              <span className="text-[11px] font-bold">Pix</span>
            </button>
            <button
              onClick={() => setAbaAtiva('alertas')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/60 active:scale-95 transition-all text-slate-300 hover:text-emerald-400"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-lg">
                🔔
              </div>
              <span className="text-[11px] font-bold">Alertas</span>
            </button>
            <button
              onClick={() => setAbaAtiva('metas')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/60 active:scale-95 transition-all text-slate-300 hover:text-emerald-400"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-lg">
                💰
              </div>
              <span className="text-[11px] font-bold">Metas</span>
            </button>
            <button
              onClick={() => setAbaAtiva('extrato')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/60 active:scale-95 transition-all text-slate-300 hover:text-emerald-400"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-lg">
                📊
              </div>
              <span className="text-[11px] font-bold">Extrato</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navegação por Abas */}
      <div className="px-5 pt-3">
        <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800">
          <button
            onClick={() => setAbaAtiva('alertas')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              abaAtiva === 'alertas'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔔 Notificações ({pendentes.length})
          </button>
          <button
            onClick={() => setAbaAtiva('metas')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              abaAtiva === 'metas'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎯 Caixinhas
          </button>
          <button
            onClick={() => setAbaAtiva('extrato')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              abaAtiva === 'extrato'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📑 Extrato
          </button>
        </div>
      </div>

      {/* Toast / Mensagens de Status */}
      {status.texto && (
        <div className="px-5 pt-3">
          <div
            className={`rounded-2xl p-3.5 text-xs font-semibold flex items-center justify-between border shadow-lg animate-in fade-in duration-200 ${
              status.tipo === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : status.tipo === 'aviso'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{status.tipo === 'ok' ? '✅' : status.tipo === 'aviso' ? 'ℹ️' : '⛔'}</span>
              <span>{status.texto}</span>
            </div>
            <button
              onClick={() => setStatus({ tipo: '', texto: '' })}
              className="text-slate-400 hover:text-white font-bold ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo das Abas */}
      <main className="flex-1 px-5 pt-4 space-y-5">
        {abaAtiva === 'alertas' && (
          <>
            {/* Bloco 1: Notificação Imediata (Pix) */}
            <section className="rounded-3xl bg-slate-900/80 p-5 border border-slate-800 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Ação Instantânea</span>
                  <h2 className="text-base font-extrabold text-white">Disparo Imediato de Notificação</h2>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">
                  ⚡
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Dispara um alerta nativo imediato no celular notificando um recebimento de Pix (ID: {ID_IMEDIATA}).
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    value={pixValor}
                    onChange={(e) => setPixValor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="150,00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Quem enviou</label>
                  <input
                    type="text"
                    value={pixRemetente}
                    onChange={(e) => setPixRemetente(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Nome do pagador"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={dispararPixImediato}
                disabled={ocupado}
                className="mt-4 w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>💸</span>
                <span>{ocupado ? 'Enviando alerta...' : 'Disparar Notificação de Pix Imediata'}</span>
              </button>
            </section>

            {/* Bloco 2: Alertas Agendados (5s, 10s, 15s) */}
            <section className="rounded-3xl bg-slate-900/80 p-5 border border-slate-800 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">Temporizador Nativo</span>
                  <h2 className="text-base font-extrabold text-white">Alertas Agendados</h2>
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold">
                  ⏱️
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Agenda lembretes em background. Pode fechar ou minimizar o app que a notificação chegará!
              </p>

              <div className="mt-4 space-y-2.5">
                {/* 5 segundos */}
                <button
                  type="button"
                  onClick={() =>
                    agendarAlerta(5, 'PoupaMais - Lembrete Fatura ⏱️', 'Sua fatura de R$ 320,00 vence em breve. Fique em dia!')
                  }
                  disabled={ocupado}
                  className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/40 transition-all text-left flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-teal-400">
                      5s
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-teal-400 transition-colors">
                        Alerta em 5 segundos (ID 271)
                      </div>
                      <div className="text-[11px] text-slate-400">Lembrete de fechamento de fatura</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
                    Agendar ➔
                  </span>
                </button>

                {/* 10 segundos - Payload original da disciplina (ID 270) */}
                <button
                  type="button"
                  onClick={() =>
                    agendarAlerta(10, 'PoupaMais Alerta 🎉', 'Parabéns! Você guardou R$ 500 este mês na sua caixinha!')
                  }
                  disabled={ocupado}
                  className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-emerald-500/30 hover:border-emerald-500/60 transition-all text-left flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
                      10s
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        Alerta em 10 segundos (ID 270) ⭐
                      </div>
                      <div className="text-[11px] text-slate-400">Meta mensal de R$ 500 atingida</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    Agendar ➔
                  </span>
                </button>

                {/* 15 segundos */}
                <button
                  type="button"
                  onClick={() =>
                    agendarAlerta(15, 'PoupaMais Segurança 🛡️', 'Nova tentativa de login detectada em seu aparelho. Tudo certo?')
                  }
                  disabled={ocupado}
                  className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/40 transition-all text-left flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-bold text-sky-400">
                      15s
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                        Alerta em 15 segundos (ID 272)
                      </div>
                      <div className="text-[11px] text-slate-400">Aviso de segurança e proteção</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                    Agendar ➔
                  </span>
                </button>
              </div>
            </section>

            {/* Bloco 3: Desafio Extra - Notificações Pendentes (getPending & cancel) */}
            <section className="rounded-3xl bg-slate-900/80 p-5 border border-slate-800 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Desafio Extra</span>
                  <h2 className="text-base font-extrabold text-white">
                    Alertas Pendentes ({pendentes.length})
                  </h2>
                </div>
                {pendentes.length > 0 && (
                  <button
                    type="button"
                    onClick={cancelarTodos}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/30 transition-colors"
                  >
                    Cancelar Todos
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Consulta nativa via <code className="text-amber-300 font-mono">LocalNotifications.getPending()</code>.
              </p>

              <div className="mt-3">
                {pendentes.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center">
                    <span className="text-xl">📭</span>
                    <p className="mt-1 text-xs text-slate-500">Nenhum alerta agendado pendente no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendentes.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              #{item.id}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{item.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.body}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => cancelarAlerta(item.id)}
                          className="shrink-0 p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all"
                          title="Cancelar este alerta"
                        >
                          ✕ Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {abaAtiva === 'metas' && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-slate-900/80 p-5 border border-slate-800 shadow-lg">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Poupança Automática</span>
              <h2 className="text-base font-extrabold text-white">Minhas Caixinhas</h2>
              <p className="mt-1 text-xs text-slate-400">
                Seu dinheiro rendendo 105% do CDI diariamente com resgate imediato.
              </p>

              <div className="mt-4 space-y-3.5">
                {metas.map((m) => {
                  const perc = Math.round((m.atual / m.total) * 100);
                  return (
                    <div key={m.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{m.icone}</span>
                          <div>
                            <div className="text-xs font-bold text-white">{m.titulo}</div>
                            <div className="text-[11px] text-slate-400">
                              R$ {formatarDinheiro(m.atual)} de R$ {formatarDinheiro(m.total)}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-emerald-400">{perc}%</span>
                      </div>
                      <div className="mt-3 w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${m.cor} rounded-full transition-all duration-500`}
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => agendarAlerta(10, 'Meta PoupaMais', 'Você acabou de guardar R$ 100 na Reserva de Emergência! 💰')}
                className="mt-4 w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <span>➕</span>
                <span>Guardar dinheiro na Caixinha (+ Alerta 10s)</span>
              </button>
            </div>
          </section>
        )}

        {abaAtiva === 'extrato' && (
          <section className="rounded-3xl bg-slate-900/80 p-5 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Movimentações</span>
                <h2 className="text-base font-extrabold text-white">Extrato da Conta</h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-xl">
                Novembro / 2026
              </span>
            </div>

            <div className="space-y-2.5">
              {transacoes.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                        t.tipo === 'entrada'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {t.tipo === 'entrada' ? '↓' : '↑'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{t.titulo}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{t.data}</span>
                        <span>•</span>
                        <span className="bg-slate-800 px-1.5 py-0.2 rounded text-[10px] text-slate-300">
                          {t.tag}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-xs font-extrabold ${
                      t.tipo === 'entrada' ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {t.tipo === 'entrada' ? '+' : '-'} R$ {formatarDinheiro(t.valor)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-6 py-3 flex items-center justify-around z-20">
        <button
          onClick={() => setAbaAtiva('alertas')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
            abaAtiva === 'alertas' ? 'text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-lg">🔔</span>
          <span>Alertas</span>
        </button>
        <button
          onClick={() => setAbaAtiva('metas')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
            abaAtiva === 'metas' ? 'text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-lg">💰</span>
          <span>Caixinhas</span>
        </button>
        <button
          onClick={() => setAbaAtiva('extrato')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
            abaAtiva === 'extrato' ? 'text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-lg">📑</span>
          <span>Extrato</span>
        </button>
      </nav>
    </div>
  );
}
