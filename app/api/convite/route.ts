import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email_convidado, tipo_profissional, profissional_id, nome_profissional } = await req.json()

    if (!email_convidado || !tipo_profissional || !profissional_id) {
      return NextResponse.json({ erro: 'Dados incompletos.' }, { status: 400 })
    }

    // Cria o convite no banco
    const { data: convite, error } = await supabase
      .from('convites')
      .insert({
        profissional_id,
        tipo_profissional,
        email_convidado,
        status: 'pendente',
      })
      .select('token')
      .single()

    if (error || !convite) {
      return NextResponse.json({ erro: 'Erro ao criar convite.' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kore-app-blue.vercel.app'
    const linkConvite = `${baseUrl}/convite/${convite.token}`

    const tipoProfissionalLabel = tipo_profissional === 'personal' ? 'Personal Trainer' : 'Nutricionista'

    // Envia o email
    const { error: emailError } = await resend.emails.send({
      from: 'KORE <onboarding@resend.dev>',
      to: email_convidado,
      subject: `${nome_profissional} te convidou para o KORE`,
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

                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom:40px;">
                      <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:0.2em;color:#ffffff;">KORE</h1>
                      <p style="margin:8px 0 0;font-size:11px;letter-spacing:0.2em;color:#52525b;text-transform:uppercase;">Performance. Integrada.</p>
                    </td>
                  </tr>

                  <!-- Card -->
                  <tr>
                    <td style="background:#111111;border-radius:20px;padding:40px;border:1px solid rgba(255,255,255,0.06);">

                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.15em;color:#52525b;text-transform:uppercase;">${tipoProfissionalLabel}</p>
                      <h2 style="margin:0 0 24px;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">
                        ${nome_profissional} te convidou para o KORE
                      </h2>

                      <p style="margin:0 0 32px;font-size:14px;color:#a1a1aa;line-height:1.6;">
                        Você foi convidado para se conectar com seu ${tipoProfissionalLabel.toLowerCase()} no KORE — a plataforma que integra treino, nutrição e recuperação em um único lugar, com análise de IA.
                      </p>

                      <!-- Benefícios -->
                      <table width="100%" style="margin-bottom:32px;">
                        ${[
                          ['🌙', 'Score de recuperação diário'],
                          ['⚡', 'Treinos montados pelo seu personal'],
                          ['🥗', 'Plano alimentar da sua nutricionista'],
                          ['✦', 'Análise de IA cruzando todos os dados'],
                        ].map(([icon, text]) => `
                          <tr>
                            <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                              <span style="color:#ffffff;margin-right:12px;">${icon}</span>
                              <span style="font-size:13px;color:#a1a1aa;">${text}</span>
                            </td>
                          </tr>
                        `).join('')}
                      </table>

                      <!-- CTA -->
                      <a href="${linkConvite}"
                        style="display:block;text-align:center;background:#ffffff;color:#000000;font-weight:900;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;padding:16px;border-radius:12px;text-decoration:none;">
                        Aceitar convite
                      </a>

                      <p style="margin:24px 0 0;font-size:11px;color:#3f3f46;text-align:center;">
                        Link válido por 7 dias · Se não esperava este convite, ignore este email.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
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
      // Email falhou mas convite foi criado — retorna link para compartilhar manualmente
      return NextResponse.json({ sucesso: true, link: linkConvite, emailFalhou: true })
    }

    return NextResponse.json({ sucesso: true, link: linkConvite })

  } catch (err) {
    console.error('Erro ao enviar convite:', err)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}