import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_EMAIL = 'appkore.team@gmail.com'

const LABELS_PROFISSIONAL: Record<string, string> = {
  profissao: 'Profissão',
  profissaoDetalhe: 'Qual profissão (detalhe)',
  alunos: 'Quantos alunos/pacientes atende hoje',
  ferramenta: 'Ferramenta usada atualmente',
  ferramentaDetalhe: 'Qual ferramenta (detalhe)',
  interesse: 'O que te fez se interessar pelo KORE',
  email: 'Email',
  whatsapp: 'WhatsApp',
}

const LABELS_ATLETA: Record<string, string> = {
  esporte: 'Esporte principal',
  esporteDetalhe: 'Qual esporte (detalhe)',
  nivel: 'Nível',
  email: 'Email',
  whatsapp: 'WhatsApp',
}

export async function POST(req: NextRequest) {
  try {
    const { tipo, dados } = await req.json()

    if (!tipo || !['profissional', 'atleta'].includes(tipo) || !dados || typeof dados !== 'object') {
      return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 })
    }

    const whatsapp = String(dados.whatsapp ?? '').trim()
    if (!whatsapp) {
      return NextResponse.json({ erro: 'WhatsApp é obrigatório.' }, { status: 400 })
    }

    const email = String(dados.email ?? '').trim()
    if (!email) {
      return NextResponse.json({ erro: 'Email é obrigatório.' }, { status: 400 })
    }

    const { error } = await supabase.from('leads_piloto').insert({ tipo, dados, whatsapp, email })
    if (error) {
      console.error('Erro ao salvar lead piloto:', error)
      return NextResponse.json({ erro: 'Erro ao salvar.' }, { status: 500 })
    }

    const labels = tipo === 'profissional' ? LABELS_PROFISSIONAL : LABELS_ATLETA
    const tipoLabel = tipo === 'profissional' ? 'Profissional' : 'Atleta'

    const linhas = Object.entries(labels)
      .filter(([key]) => dados[key] !== undefined && dados[key] !== null && dados[key] !== '')
      .map(([key, label]) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0 0 2px;font-size:11px;letter-spacing:0.1em;color:#52525b;text-transform:uppercase;">${label}</p>
          <p style="margin:0;font-size:14px;color:#ffffff;">${String(dados[key])}</p>
        </td>
      </tr>`)
      .join('')

    const { error: emailError } = await resend.emails.send({
      from: 'KORE <nao-responda@usekore.app>',
      to: ADMIN_EMAIL,
      subject: `Novo lead piloto — ${tipoLabel}: ${whatsapp}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin:0;padding:0;background:#111111;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;min-height:100vh;">
            <tr>
              <td align="center" style="padding:48px 24px;">
                <table width="100%" style="max-width:480px;">
                  <tr>
                    <td align="center" style="padding-bottom:40px;">
                      <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:0.2em;color:#ffffff;">KORE</h1>
                      <p style="margin:8px 0 0;font-size:11px;letter-spacing:0.2em;color:#52525b;text-transform:uppercase;">Novo lead — piloto</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#111111;border-radius:20px;padding:40px;border:1px solid rgba(255,255,255,0.06);">
                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.15em;color:#52525b;text-transform:uppercase;">${tipoLabel}</p>
                      <h2 style="margin:0 0 24px;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">
                        Novo interesse no piloto
                      </h2>
                      <table width="100%">
                        ${linhas}
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:32px;">
                      <p style="margin:0;font-size:11px;color:#3f3f46;">© 2026 KORE · Todos os direitos reservados</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      // Lead já foi salvo no banco — email é apenas notificação
      return NextResponse.json({ sucesso: true, emailFalhou: true })
    }

    return NextResponse.json({ sucesso: true })

  } catch (err) {
    console.error('Erro ao processar lead piloto:', err)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
