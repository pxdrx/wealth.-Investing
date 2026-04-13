const PLAN_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  free: { label: "Free", color: "#71717a", bgColor: "#f4f4f5" },
  pro: { label: "Pro", color: "#3b82f6", bgColor: "#eff6ff" },
  ultra: { label: "Ultra", color: "#8b5cf6", bgColor: "#f5f3ff" },
  mentor: { label: "Mentor", color: "#d97706", bgColor: "#fffbeb" },
};

export function planUpgradeEmail(displayName: string, plan: string): { subject: string; html: string } {
  const config = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;

  const subject = `Seu plano foi atualizado para ${config.label}!`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#71717a;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">wealth.Investing</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">Plano Atualizado</h1>
            </td>
          </tr>

          <!-- Badge -->
          <tr>
            <td align="center" style="padding:0 32px 24px;">
              <span style="display:inline-block;padding:8px 24px;border-radius:9999px;font-size:16px;font-weight:700;color:${config.color};background:${config.bgColor};letter-spacing:0.01em;">
                ${config.label}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
                Ola${displayName ? `, ${displayName}` : ""}! Seu plano no wealth.Investing foi atualizado para <strong style="color:${config.color};">${config.label}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;line-height:1.6;">
                Todos os recursos do seu novo plano ja estao disponiveis. Basta fazer login para aproveitar.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://owealthinvesting.com/app" style="display:inline-block;padding:12px 32px;border-radius:9999px;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">
                      Acessar Plataforma
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Este email foi enviado automaticamente pelo wealth.Investing.<br>
                Voce esta recebendo porque seu plano foi atualizado por um administrador.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { subject, html };
}
