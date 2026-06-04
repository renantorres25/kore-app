'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function StravaDebug() {
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  async function testar() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setResultado({ erro: 'Não logado' }); setLoading(false); return }
    const r = await fetch('/api/strava/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId: session.user.id }),
    })
    setResultado(await r.json())
    setLoading(false)
  }

  async function sincronizar() {
    setSyncing(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSyncResult({ erro: 'Não logado' }); setSyncing(false); return }
    const r = await fetch('/api/strava/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId: session.user.id }),
    })
    setSyncResult(await r.json())
    setSyncing(false)
  }

  useEffect(() => { testar() }, [])

  return (
    <div style={{ background: '#0a0e0c', minHeight: '100vh', padding: 32, color: '#fff', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24 }}>Strava Debug</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={testar} disabled={loading}
          style={{ background: '#2dd4a7', color: '#000', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}>
          {loading ? 'Testando...' : '🔍 Testar conexão Strava'}
        </button>
        <button onClick={sincronizar} disabled={syncing}
          style={{ background: '#f97316', color: '#000', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}>
          {syncing ? 'Sincronizando...' : '⚡ Forçar sync'}
        </button>
      </div>

      {resultado && (
        <div style={{ background: '#111', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h2 style={{ color: '#2dd4a7', marginBottom: 12 }}>Resultado do teste:</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <p>👤 Atleta: <strong>{resultado.athlete_name ?? '—'}</strong></p>
            <p>🔑 Token expirado: <strong style={{ color: resultado.token_expirado ? '#f87171' : '#4ade80' }}>{resultado.token_expirado ? 'SIM ❌' : 'NÃO ✅'}</strong></p>
            <p>🔄 Token renovado: <strong>{resultado.token_refreshed ? 'Sim' : 'Não'}</strong></p>
            <p>📋 Scope: <strong>{resultado.scope ?? 'null (não salvo)'}</strong></p>
            <p>🌐 Status API Strava: <strong style={{ color: resultado.strava_status === 200 ? '#4ade80' : '#f87171' }}>{resultado.strava_status}</strong></p>
            <p>🏃 Atividades retornadas pelo Strava: <strong style={{ color: resultado.total_retornado > 0 ? '#4ade80' : '#f87171' }}>{resultado.total_retornado}</strong></p>
          </div>
          {resultado.primeiras_atividades?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ color: '#94a3b8', marginBottom: 8 }}>Primeiras atividades:</h3>
              {resultado.primeiras_atividades.map((a: any, i: number) => (
                <div key={i} style={{ background: '#1a1a2e', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <p>🎯 {a.name} ({a.type})</p>
                  <p>📅 {a.date} | ⏱ {a.duration_min}min | 📍 {a.distance_km}km | 🔥 {a.calories}kcal</p>
                </div>
              ))}
            </div>
          )}
          {resultado.erro && <p style={{ color: '#f87171', marginTop: 12 }}>❌ Erro: {JSON.stringify(resultado.erro)}</p>}
        </div>
      )}

      {syncResult && (
        <div style={{ background: '#111', borderRadius: 12, padding: 20 }}>
          <h2 style={{ color: '#f97316', marginBottom: 12 }}>Resultado do sync:</h2>
          <p>✅ Inseridos: <strong style={{ color: '#4ade80' }}>{syncResult.inseridos}</strong></p>
          <p>❌ Erros: <strong style={{ color: syncResult.erros > 0 ? '#f87171' : '#4ade80' }}>{syncResult.erros}</strong></p>
          <p>📊 Total processado: <strong>{syncResult.total}</strong></p>
          {syncResult.erro && <p style={{ color: '#f87171' }}>Erro: {JSON.stringify(syncResult.erro)}</p>}
        </div>
      )}
    </div>
  )
}
