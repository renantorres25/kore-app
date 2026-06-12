import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Valida a assinatura HMAC da Terra. Header: "t=<timestamp>,v1=<hmac_hex>".
// A mensagem assinada é `${t}.${corpoBruto}` com HMAC-SHA256 e o segredo do webhook.
function assinaturaTerraValida(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false
  const partes: Record<string, string> = {}
  for (const p of header.split(',')) {
    const [k, v] = p.split('=')
    if (k && v) partes[k.trim()] = v.trim()
  }
  const t = partes['t']
  const v1 = partes['v1']
  if (!t || !v1) return false
  const esperado = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(esperado, 'hex'))
  } catch {
    return false
  }
}

function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function parseDateBR(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export async function POST(req: NextRequest) {
  try {
    // Lê o corpo bruto (necessário para validar a assinatura antes de parsear).
    const raw = await req.text()

    // Enforcement seguro: só exige assinatura quando o segredo está configurado.
    // Assim a ingestão não quebra antes de você definir TERRA_WEBHOOK_SECRET.
    const secret = process.env.TERRA_WEBHOOK_SECRET
    if (secret) {
      if (!assinaturaTerraValida(raw, req.headers.get('terra-signature'), secret)) {
        return NextResponse.json({ erro: 'Assinatura inválida' }, { status: 401 })
      }
    }

    const body = JSON.parse(raw)
    const { user, type, data } = body

    if (!user?.reference_id) {
      return NextResponse.json({ ok: true }) // ignorar webhooks sem usuário
    }

    const usuarioId = user.reference_id
    const terraUserId = user.user_id
    const provider = user.provider ?? 'UNKNOWN'

    // Registrar/atualizar conexão
    await supabase.from('terra_connections').upsert({
      usuario_id: usuarioId,
      terra_user_id: terraUserId,
      provider,
      last_sync: new Date().toISOString(),
      ativo: true,
    }, { onConflict: 'usuario_id' })

    // ── SONO ──────────────────────────────────────────────────────
    if (type === 'sleep' && Array.isArray(data)) {
      for (const sleep of data) {
        if (!sleep.metadata?.start_time) continue
        const dataSono = parseDateBR(sleep.metadata.start_time)

        const duraMinutos = sleep.sleep_durations_data?.duration_light_sleep_state_seconds != null
          ? Math.round((
              (sleep.sleep_durations_data?.duration_light_sleep_state_seconds ?? 0) +
              (sleep.sleep_durations_data?.duration_REM_sleep_state_seconds ?? 0) +
              (sleep.sleep_durations_data?.duration_deep_sleep_state_seconds ?? 0)
            ) / 60)
          : sleep.sleep_durations_data?.duration_asleep_state_seconds
            ? Math.round(sleep.sleep_durations_data.duration_asleep_state_seconds / 60)
            : null

        const hrv = sleep.heart_rate_data?.hrv?.sdnn_sleep_samples?.length
          ? Math.round(sleep.heart_rate_data.hrv.sdnn_sleep_samples.reduce((a: number, s: any) => a + (s.hrv ?? 0), 0) / sleep.heart_rate_data.hrv.sdnn_sleep_samples.length)
          : sleep.heart_rate_data?.hrv?.avg_hrv_sdnn ?? null

        const fcRepouso = sleep.heart_rate_data?.resting_hr_bpm ?? null
        const scoreRaw = sleep.sleep_score ?? null
        // Normaliza scores de diferentes wearables para 0-100
        const score = scoreRaw ? Math.min(100, Math.round(scoreRaw)) : null

        const sonoData: any = {
          usuario_id: usuarioId,
          data: dataSono,
          duracao_minutos: duraMinutos,
          hrv,
          fc_repouso: fcRepouso,
          score_recuperacao: score,
          origem: `terra_${provider.toLowerCase()}`,
        }

        // Remove campos nulos
        Object.keys(sonoData).forEach(k => sonoData[k] == null && delete sonoData[k])

        await supabase.from('sono').upsert(sonoData, { onConflict: 'usuario_id,data' })
      }
    }

    // ── ATIVIDADES ────────────────────────────────────────────────
    if (type === 'activity' && Array.isArray(data)) {
      for (const activity of data) {
        if (!activity.metadata?.start_time) continue

        const dataAtividade = parseDateBR(activity.metadata.start_time)
        const duracaoSegundos = activity.active_durations_data?.activity_seconds
          ?? activity.metadata?.upload_type?.seconds
          ?? null
        const duracaoMin = duracaoSegundos ? Math.round(duracaoSegundos / 60) : null
        if (!duracaoMin || duracaoMin < 5) continue // ignora atividades < 5 min

        const modalidadeRaw = activity.metadata?.type?.toLowerCase() ?? 'outro'
        const MODALIDADE_MAP: Record<string, string> = {
          'running': 'corrida', 'cycling': 'bike', 'swimming': 'natacao',
          'strength_training': 'musculacao', 'yoga': 'outro', 'walking': 'outro',
          'hiit': 'crossfit', 'crossfit': 'crossfit',
        }
        const modalidade = MODALIDADE_MAP[modalidadeRaw] ?? 'outro'

        const calorias = activity.calories_data?.total_burned_calories
          ? Math.round(activity.calories_data.total_burned_calories)
          : null
        const distanciaKm = activity.distance_data?.distance_meters
          ? Math.round(activity.distance_data.distance_meters / 100) / 10
          : null
        const fcMedia = activity.heart_rate_data?.avg_hr_bpm ?? null

        const atividadeData: any = {
          usuario_id: usuarioId,
          data: dataAtividade,
          modalidade,
          duracao_min: duracaoMin,
          distancia_km: distanciaKm,
          calorias_estimadas: calorias,
          intensidade: fcMedia && fcMedia > 150 ? 5 : fcMedia && fcMedia > 130 ? 4 : fcMedia && fcMedia > 110 ? 3 : 2,
          notas: `${provider} · ${activity.metadata?.name ?? modalidade}`,
        }

        Object.keys(atividadeData).forEach(k => atividadeData[k] == null && delete atividadeData[k])

        await supabase.from('atividades_livres').insert(atividadeData)
      }
    }

    // ── CORPO (peso, composição) ───────────────────────────────────
    if (type === 'body' && Array.isArray(data)) {
      for (const body of data) {
        if (!body.metadata?.start_time) continue
        const dataBody = parseDateBR(body.metadata.start_time)

        const peso = body.weight_kg ?? null
        const gorduraPct = body.body_fat_percentage ?? null

        if (!peso) continue

        await supabase.from('evolucao_medidas').upsert({
          cliente_id: usuarioId,
          data: dataBody,
          peso,
          gordura_pct: gorduraPct,
        }, { onConflict: 'cliente_id,data' })

        // Atualiza peso no perfil também
        await supabase.from('perfis').update({ peso: Math.round(peso) }).eq('id', usuarioId)
      }
    }

    // ── DAILY (dados diários consolidados) ────────────────────────
    if (type === 'daily' && Array.isArray(data)) {
      for (const daily of data) {
        if (!daily.metadata?.start_time) continue
        const dataDaily = parseDateBR(daily.metadata.start_time)

        // FC repouso diário → atualiza sono se existir registro do dia
        const fcRepouso = daily.heart_rate_data?.resting_hr_bpm ?? null
        if (fcRepouso) {
          await supabase.from('sono')
            .update({ fc_repouso: fcRepouso })
            .eq('usuario_id', usuarioId)
            .eq('data', dataDaily)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Terra Webhook] Erro:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// Terra faz GET para verificar que o endpoint existe
export async function GET() {
  return NextResponse.json({ status: 'Terra webhook ativo — KORE' })
}
