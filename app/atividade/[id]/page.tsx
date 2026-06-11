'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { gerarNarrativaBloco, type BlocoNarrativa, type ModalidadeNarrativa } from '../../lib/narrativa-treino'

type Atividade = {
  id: string
  usuario_id: string
  data: string
  modalidade: string
  duracao_min: number | null
  distancia_km: number | null
  distancia_m: number | null
  fc_media: number | null
  fc_max: number | null
  elevacao: number | null
  calorias_wearable: number | null
  calorias_estimadas: number | null
  cadencia: number | null
  potencia_media: number | null
  potencia_max: number | null
  ritmo_medio: string | null
  ritmo_natacao: string | null
  zona_fc: string | null
  voltas: number | null
  strava_activity_id: number | null
}

type SessaoPrescrita = {
  tipo_sessao: string | null
  duracao_min: number | null
  distancia_km: number | null
  status: string
  blocos: BlocoNarrativa[]
}

const MODALIDADE_INFO: Record<string, { label: string; icone: string }> = {
  corrida: { label: 'Corrida', icone: '🏃' },
  bike: { label: 'Bike', icone: '🚴' },
  natacao: { label: 'Natação', icone: '🏊' },
  musculacao: { label: 'Musculação', icone: '🏋️' },
  crossfit: { label: 'Crossfit', icone: '🔥' },
  outro: { label: 'Atividade', icone: '⚡' },
}

const TIPO_SESSAO_LABEL: Record<string, string> = {
  continuo: 'Contínuo', intervalado: 'Intervalado', longo: 'Longo', regenerativo: 'Regenerativo',
  fartlek: 'Fartlek', ritmo: 'Ritmo', tecnico: 'Técnico',
}

function formatDuracaoMin(min: number): string {
  const horas = Math.floor(min / 60)
  const resto = min % 60
  return horas > 0 ? `${horas}h ${resto}min` : `${resto}min`
}

function formatSecToPace(sec: number): string {
  const min = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${min}:${s.toString().padStart(2, '0')}`
}

function compararIndicador(prescrito: number | null, realizado: number | null, tolerancia: number, relativo: boolean): '✅' | '⚠️' | null {
  if (prescrito == null || realizado == null) return null
  const diff = relativo ? Math.abs(realizado - prescrito) / prescrito : Math.abs(realizado - prescrito)
  return diff <= tolerancia ? '✅' : '⚠️'
}

function formatDataLonga(data: string): string {
  return new Date(data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo',
  })
}

export default function AtividadeDetalhe() {
  const router = useRouter()
  const params = useParams()
  const atividadeId = params.id as string

  const [carregando, setCarregando] = useState(true)
  const [atividade, setAtividade] = useState<Atividade | null>(null)
  const [sessao, setSessao] = useState<SessaoPrescrita | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: ativ, error } = await supabase
        .from('atividades_livres')
        .select('id, usuario_id, data, modalidade, duracao_min, distancia_km, distancia_m, fc_media, fc_max, elevacao, calorias_wearable, calorias_estimadas, cadencia, potencia_media, potencia_max, ritmo_medio, ritmo_natacao, zona_fc, voltas, strava_activity_id')
        .eq('id', atividadeId)
        .single()

      if (error || !ativ) { router.replace('/treino'); return }
      setAtividade(ativ as Atividade)

      const { data: sessoes } = await supabase
        .from('sessoes_prescritas')
        .select('tipo_sessao, duracao_min, distancia_km, status, blocos_sessao(*)')
        .eq('atleta_id', ativ.usuario_id)
        .eq('data', ativ.data)
        .eq('modalidade', ativ.modalidade)
        .limit(1)

      const sp = sessoes?.[0] as any
      if (sp) {
        setSessao({
          tipo_sessao: sp.tipo_sessao,
          duracao_min: sp.duracao_min,
          distancia_km: sp.distancia_km,
          status: sp.status,
          blocos: (sp.blocos_sessao ?? [])
            .slice()
            .sort((a: any, b: any) => a.ordem - b.ordem)
            .map((b: any) => ({
              nome: b.nome, duracao_min: b.duracao_min, distancia_km: b.distancia_km,
              repeticoes: b.repeticoes, zona_fc: b.zona_fc, fc_min: b.fc_min, fc_max: b.fc_max,
              pace_alvo: b.pace_alvo, ftp_pct: b.ftp_pct, watts_alvo: b.watts_alvo, observacao: b.observacao,
            })),
        })
      }

      setCarregando(false)
    }
    carregar()
  }, [atividadeId, router])

  if (carregando) return (
    <main className="min-h-[100dvh] flex items-center justify-center text-white">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (!atividade) return null

  const mod = MODALIDADE_INFO[atividade.modalidade] ?? MODALIDADE_INFO.outro
  const calorias = atividade.calorias_wearable ?? atividade.calorias_estimadas

  // ── Estatísticas ──
  const stats: { icone: string; label: string; valor: string }[] = []

  if (atividade.duracao_min != null) stats.push({ icone: '⏱️', label: 'Duração', valor: formatDuracaoMin(atividade.duracao_min) })
  if (atividade.distancia_km != null) stats.push({ icone: '📍', label: 'Distância', valor: `${atividade.distancia_km.toFixed(1).replace('.', ',')} km` })
  if (atividade.fc_media != null) stats.push({ icone: '❤️', label: 'FC Média', valor: `${atividade.fc_media} bpm` })
  if (atividade.fc_max != null) stats.push({ icone: '💓', label: 'FC Máxima', valor: `${atividade.fc_max} bpm` })

  if (atividade.modalidade === 'bike' && atividade.distancia_km != null && atividade.duracao_min) {
    const kmh = atividade.distancia_km / (atividade.duracao_min / 60)
    stats.push({ icone: '⚡', label: 'Velocidade média', valor: `${kmh.toFixed(1).replace('.', ',')} km/h` })
  }
  if (atividade.modalidade === 'corrida' && atividade.distancia_km != null && atividade.duracao_min) {
    const sec = (atividade.duracao_min * 60) / atividade.distancia_km
    stats.push({ icone: '🏃', label: 'Pace médio', valor: `${formatSecToPace(sec)} min/km` })
  }
  if (atividade.modalidade === 'natacao') {
    if (atividade.ritmo_natacao) {
      stats.push({ icone: '🏊', label: 'Pace', valor: atividade.ritmo_natacao })
    } else if (atividade.distancia_m != null && atividade.duracao_min) {
      const sec = (atividade.duracao_min * 60) / (atividade.distancia_m / 100)
      stats.push({ icone: '🏊', label: 'Pace', valor: `${formatSecToPace(sec)} min/100m` })
    }
  }

  if (atividade.elevacao != null) stats.push({ icone: '⛰️', label: 'Elevação', valor: `${atividade.elevacao} m` })
  if (calorias != null) stats.push({ icone: '🔥', label: 'Calorias', valor: `${calorias} kcal` })
  if (atividade.cadencia != null) stats.push({ icone: '🦵', label: 'Cadência', valor: `${atividade.cadencia} rpm` })
  if (atividade.modalidade === 'bike' && atividade.potencia_media != null) stats.push({ icone: '⚡', label: 'Potência média', valor: `${atividade.potencia_media} w` })
  if (atividade.modalidade === 'bike' && atividade.potencia_max != null) stats.push({ icone: '⚡', label: 'Potência máxima', valor: `${atividade.potencia_max} w` })
  if (atividade.modalidade === 'natacao' && atividade.voltas != null) stats.push({ icone: '🏊', label: 'Voltas', valor: `${atividade.voltas} voltas` })

  // ── Compliance ──
  let indDuracao: { prescrito: string; realizado: string; icone: '✅' | '⚠️' | null } | null = null
  let indFC: { prescrito: string; realizado: string; icone: '✅' | '⚠️' | null } | null = null

  if (sessao) {
    const durSomaBlocos = sessao.blocos.reduce((acc, b) => acc + (b.duracao_min ?? 0), 0)
    const prescritoMin = durSomaBlocos > 0 ? durSomaBlocos : sessao.duracao_min
    const realizadoMin = atividade.duracao_min
    if (prescritoMin != null && realizadoMin != null) {
      indDuracao = {
        prescrito: `${prescritoMin}min`,
        realizado: `${realizadoMin}min`,
        icone: compararIndicador(prescritoMin, realizadoMin, 0.15, true),
      }
    }

    const blocosComFC = sessao.blocos.filter(b => b.fc_min != null && b.fc_max != null)
    if (blocosComFC.length > 0 && atividade.fc_media != null) {
      const fcMinPrescrito = Math.round(blocosComFC.reduce((acc, b) => acc + b.fc_min!, 0) / blocosComFC.length)
      const fcMaxPrescrito = Math.round(blocosComFC.reduce((acc, b) => acc + b.fc_max!, 0) / blocosComFC.length)
      const tolerancia = 7
      indFC = {
        prescrito: `${fcMinPrescrito}–${fcMaxPrescrito}bpm`,
        realizado: `${atividade.fc_media}bpm`,
        icone: (atividade.fc_media >= fcMinPrescrito - tolerancia && atividade.fc_media <= fcMaxPrescrito + tolerancia) ? '✅' : '⚠️',
      }
    }
  }

  return (
    <main className="min-h-[100dvh] text-white">
      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 1.5rem))' }}>

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-zinc-600 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-zinc-400 transition-colors">
            ← Voltar
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{mod.icone}</span>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">{mod.label}</h1>
              <p className="text-zinc-500 text-xs capitalize">{formatDataLonga(atividade.data)}</p>
            </div>
          </div>
          <div className="mt-3">
            {sessao ? (
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                <span>✅</span><span>Realizado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold text-zinc-400 bg-white/[0.05] border-white/[0.14]">
                <span>⬜</span><span>Realizado sem planejamento</span>
              </span>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 mb-3">Estatísticas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="rounded-2xl p-3 border border-white/[0.10]" style={{ background: 'var(--surface-1)' }}>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">{s.icone} {s.label}</p>
                <p className="text-white font-bold text-xl">{s.valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mapa placeholder */}
        <div className="mb-5 rounded-2xl p-6 border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Mapa disponível em breve 🗺️</p>
        </div>

        {/* Treino prescrito */}
        {sessao && (
          <div className="mb-5 rounded-2xl p-4 border border-white/[0.10]" style={{ background: 'var(--surface-1)' }}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 mb-3">Treino Prescrito</p>
            <p className="text-white font-bold text-sm mb-1">
              {sessao.tipo_sessao ? (TIPO_SESSAO_LABEL[sessao.tipo_sessao] ?? sessao.tipo_sessao) : mod.label}
              {sessao.duracao_min != null && ` · ${sessao.duracao_min}min`}
              {sessao.distancia_km != null && ` · ${sessao.distancia_km}km`}
            </p>
            {sessao.blocos.length > 0 && (
              <div className="space-y-2 mt-3">
                {sessao.blocos.map((b, i) => (
                  <div key={i} className="bg-white/[0.05] rounded-xl p-3 text-zinc-300 text-xs leading-relaxed">
                    {gerarNarrativaBloco(b, atividade.modalidade as ModalidadeNarrativa)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compliance */}
        {(indDuracao || indFC) && (
          <div className="mb-5 rounded-2xl p-4 border border-white/[0.10]" style={{ background: 'var(--surface-1)' }}>
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 mb-3">Compliance</p>
            <div className="space-y-1.5">
              {indDuracao && (
                <p className="text-zinc-400 text-xs">
                  {indDuracao.icone ? `${indDuracao.icone} ` : '· '}Duração: {indDuracao.prescrito} → {indDuracao.realizado}
                </p>
              )}
              {indFC && (
                <p className="text-zinc-400 text-xs">
                  {indFC.icone ? `${indFC.icone} ` : '· '}FC: {indFC.prescrito} → {indFC.realizado}
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
