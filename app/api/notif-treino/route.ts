import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { aluno_email, aluno_nome, personal_nome, treino_nome, plano } = await req.json()
    if (!aluno_email) return NextResponse.json({ erro: 'Email do aluno necessário.' }, { status: 400 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kore-app-blue.vercel.app'
    const planoLabel = plano ? `Plano ${plano}` : 'Novo treino'

    await resend.emails.send({
      from: 'KORE <onboarding@resend.dev>',
      to: aluno_email,
      subject: `${personal_nome} prescreveu um novo treino para você`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#111111;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;min-height:100vh;">
            <tr>
              <td align="center" style="padding:48px 24px;">
                <table width="100%" style="max-width:480px;">
                  <tr>
                    <td align="center" style="padding-bottom:40px;">
                      <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:0.2em;color:#ffffff;">KORE</h1>
                      <p style="margin:8px 0 0;font-size:11px;letter-spacing:0.2em;color:#52525b;text-transform:uppercase;">Performance. Integrada.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#111111;border-radius:20px;padding:40px;border:1px solid rgba(255,255,255,0.06);">
                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.15em;color:#52525b;text-transform:uppercase;">Personal Trainer</p>
                      <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">
                        Novo treino prescrito
                      </h2>
                      <p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;line-height:1.6;">
                        <strong style="color:#fff;">${personal_nome}</strong> preparou o <strong style="color:#10b981;">${planoLabel}</strong> para você${treino_nome ? ` — ${treino_nome}` : ''}.
                        Acesse o app para ver os exercícios e começar.
                      </p>
                      <a href="${baseUrl}/treino"
                        style="display:block;text-align:center;background:#10b981;color:#000000;font-weight:900;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;padding:16px;border-radius:12px;text-decoration:none;">
                        Abrir treino no KORE →
                      </a>
                      <p style="margin:24px 0 0;font-size:11px;color:#3f3f46;text-align:center;">
                        Seu personal está acompanhando sua evolução em tempo real.
                      </p>
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

    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error('Erro ao enviar notif treino:', err)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
