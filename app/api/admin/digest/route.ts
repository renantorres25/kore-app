import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin, requireAdmin } from '../../../lib/supabaseAdmin'

const resend = new Resend(process.env.RESEND_API_KEY)
const PRECOS: Record<string, number> = { solo: 79, conectado: 129 }

async function cnt(build: () => any): Promise<number> {
  try {
    const { count } = await build()
    return count ?? 0
  } catch {
    return 0
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, ['super_admin', 'admin'])
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  try {
    const total = await cnt(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }))
    const atletas = await cnt(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', 'cliente'))
    const personais = await cnt(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', 'personal'))
    const nutris = await cnt(() => supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true }).eq('tipo', 'nutricionista'))
    const vinculos = await cnt(() => supabaseAdmin.from('vinculos').select('*', { count: 'exact', head: true }))
    const ticketsAbertos = await cnt(() => supabaseAdmin.from('tickets_sac').select('*', { count: 'exact', head: true }).eq('status', 'aberto'))

    let assinaturasAtivas = 0
    let mrr = 0
    try {
      const { data: assin } = await supabaseAdmin.from('assinaturas').select('plano, status')
      const a = (assin || []).filter((x: any) => x.status === 'ativa')
      assinaturasAtivas = a.length
      mrr = a.reduce((s: number, x: any) => s + (PRECOS[x.plano] || 0), 0)
    } catch { /* sem assinaturas */ }

    let novos7 = 0
    try {
      const d7 = Date.now() - 7 * 24 * 3600 * 1000
      for (let pg = 1; pg <= 50; pg++) {
        const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ page: pg, perPage: 1000 })
        const us = (lista?.users || []) as any[]
        for (const u of us) if (u.created_at && new Date(u.created_at).getTime() >= d7) novos7 = novos7 + 1
        if (us.length < 1000) break
      }
    } catch { /* segue */ }

    // Destinatários: admins ativos
    const { data: adminsRows } = await supabaseAdmin.from('admin_users').select('user_id').eq('ativo', true)
    const ids = (adminsRows || []).map((a: any) => a.user_id).filter(Boolean)
    let emails: string[] = []
    if (ids.length) {
      const { data: perfis } = await supabaseAdmin.from('perfis').select('email').in('id', ids)
      emails = (perfis || []).map((p: any) => p.email).filter(Boolean)
    }
    if (!emails.length) return NextResponse.json({ erro: 'Nenhum e-mail de admin encontrado.' }, { status: 400 })

    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const linha = (label: string, valor: string) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#9AA0AD;font-size:14px;">${label}</td><td align="right" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#ffffff;font-size:15px;font-weight:700;">${valor}</td></tr>`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="margin:0;background:#0D0F15;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0F15;"><tr><td align="center" style="padding:40px 20px;">
          <table width="100%" style="max-width:480px;">
            <tr><td align="center" style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:0.1em;color:#FF5A36;">KORE</h1>
              <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.2em;color:#7A8290;text-transform:uppercase;">Resumo semanal &middot; ${hoje}</p>
            </td></tr>
            <tr><td style="background:rgba(255,255,255,0.04);border-radius:18px;padding:28px;border:1px solid rgba(255,255,255,0.08);">
              <table width="100%">
                ${linha('Usuários totais', String(total))}
                ${linha('Novos (7 dias)', String(novos7))}
                ${linha('Atletas', String(atletas))}
                ${linha('Personais', String(personais))}
                ${linha('Nutricionistas', String(nutris))}
                ${linha('Vínculos (triângulos)', String(vinculos))}
                ${linha('Assinaturas ativas', String(assinaturasAtivas))}
                ${linha('MRR estimado', 'R$ ' + mrr.toLocaleString('pt-BR'))}
                ${linha('Tickets de SAC abertos', String(ticketsAbertos))}
              </table>
            </td></tr>
            <tr><td align="center" style="padding-top:20px;color:#7A8290;font-size:11px;">KORE &mdash; Performance Integrada · resumo automático do backoffice</td></tr>
          </table>
        </td></tr></table>
      </body></html>`

    const { error } = await resend.emails.send({
      from: 'KORE <onboarding@resend.dev>',
      to: emails,
      subject: `KORE — Resumo semanal (${hoje})`,
      html,
    })
    if (error) return NextResponse.json({ erro: 'Falha ao enviar o e-mail.' }, { status: 500 })

    try {
      await supabaseAdmin.from('audit_log').insert({
        admin_id: admin.userId,
        acao: 'digest:enviado',
        entidade: 'sistema',
        depois: { destinatarios: emails.length },
        ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      })
    } catch { /* silencioso */ }

    return NextResponse.json({ ok: true, enviados: emails.length })
  } catch {
    return NextResponse.json({ erro: 'Erro ao gerar o digest.' }, { status: 500 })
  }
}
