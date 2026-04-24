"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cookie, Shield, FileText, Lock, Database, CreditCard, Globe, Mail } from "lucide-react";

// Note: the dialog shell (title, description, CTA) is bilingual via the
// legal.* namespace. The dense legal/privacy prose inside Cookies/Privacy/
// Terms remains in Portuguese — the PT copy is the canonical legal text;
// translating legal wording without review would risk misstatement. Shell
// chrome flips with the language toggle; body copy is a scoped follow-up.

/* ── Types ─────────────────────────────────────────────────────── */
type LegalModal = "cookies" | "privacy" | "terms" | null;

interface LegalModalsProps {
  open: LegalModal;
  onOpenChange: (modal: LegalModal) => void;
}

/* ── Cookies Modal ─────────────────────────────────────────────── */
function CookiesContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Cookie className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">O que são cookies?</h3>
        </div>
        <p>
          Cookies são pequenos arquivos de texto armazenados no seu navegador que permitem
          ao site lembrar suas preferências e manter sua sessão ativa. Eles são essenciais
          para o funcionamento seguro da plataforma.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Cookies que utilizamos</h3>
        </div>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-foreground">Autenticação (Supabase):</strong> cookies de sessão
            que mantêm você logado de forma segura. Sem eles, seria necessário fazer login a cada
            página visitada.
          </li>
          <li>
            <strong className="text-foreground">Preferência de tema:</strong> armazena sua escolha
            entre modo claro e escuro (<code className="text-xs bg-muted px-1 py-0.5 rounded">trading-dashboard-theme</code>).
          </li>
          <li>
            <strong className="text-foreground">Conta ativa:</strong> lembra qual conta de trading
            você estava visualizando por último (<code className="text-xs bg-muted px-1 py-0.5 rounded">activeAccountId</code>).
          </li>
        </ul>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">O que NÃO utilizamos</h3>
        </div>
        <p>
          A wealth.Investing <strong className="text-foreground">não utiliza cookies de rastreamento,
          marketing ou publicidade</strong>. Não compartilhamos dados de navegação com redes de
          anúncios ou plataformas de terceiros. Seus dados permanecem exclusivamente na plataforma.
        </p>
      </section>
    </div>
  );
}

/* ── Privacy Policy Modal ──────────────────────────────────────── */
function PrivacyContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
      <p className="text-xs text-muted-foreground/70">Última atualização: Março de 2026</p>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Criptografia e proteção</h3>
        </div>
        <p>
          Todos os dados trafegam via <strong className="text-foreground">HTTPS/TLS</strong> (criptografia
          em trânsito) e são armazenados com <strong className="text-foreground">criptografia em repouso
          (AES-256)</strong> nos servidores do Supabase, hospedados em infraestrutura AWS com certificações
          de segurança internacionais.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Isolamento de dados (RLS)</h3>
        </div>
        <p>
          Utilizamos <strong className="text-foreground">Row Level Security (RLS)</strong> no banco de dados.
          Isso significa que cada usuário só consegue acessar seus próprios dados — mesmo em caso de
          vulnerabilidade, os dados de outros usuários permanecem completamente isolados e inacessíveis.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Autenticação segura</h3>
        </div>
        <p>
          Oferecemos múltiplos métodos de autenticação seguros: <strong className="text-foreground">Google OAuth,
          magic links por e-mail e senha com hash</strong>. Tokens JWT são utilizados para validar cada
          requisição, com expiração automática e renovação segura.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Pagamentos</h3>
        </div>
        <p>
          Pagamentos são processados exclusivamente pelo <strong className="text-foreground">Stripe</strong>,
          que possui certificação <strong className="text-foreground">PCI DSS Level 1</strong> — o mais alto
          padrão de segurança do setor. A wealth.Investing nunca armazena dados de cartão de crédito.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Compartilhamento de dados</h3>
        </div>
        <p>
          <strong className="text-foreground">Não compartilhamos, vendemos ou transferimos seus dados
          pessoais ou operacionais para terceiros.</strong> Os únicos serviços que recebem dados são o
          Supabase (hospedagem e autenticação) e o Stripe (processamento de pagamentos), ambos sob
          contratos rígidos de proteção de dados.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Seus direitos (LGPD)</h3>
        </div>
        <p>
          Em conformidade com a <strong className="text-foreground">Lei Geral de Proteção de Dados (LGPD)</strong>,
          você tem direito a: acessar seus dados, corrigir informações, solicitar a exclusão completa
          dos seus dados, revogar consentimento e obter portabilidade dos dados. Para exercer qualquer
          desses direitos, entre em contato conosco.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">Contato</h3>
        </div>
        <p>
          Para questões sobre privacidade e proteção de dados:{" "}
          <a href="mailto:wealth.investing@outlook.com" className="text-foreground underline underline-offset-2 hover:text-foreground/80">
            wealth.investing@outlook.com
          </a>
        </p>
      </section>
    </div>
  );
}

/* ── Terms of Use Modal ────────────────────────────────────────── */
function TermsContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <p className="text-xs text-muted-foreground/70">Última atualização: Março de 2026</p>

      {/* 1 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">1. Aceitação dos Termos</h3>
        <p>
          Ao acessar ou utilizar a plataforma wealth.Investing, você concorda integralmente com estes
          Termos de Uso. Caso não concorde com algum dos termos aqui descritos, não utilize a plataforma.
          O uso continuado do serviço constitui aceitação de eventuais atualizações destes termos.
        </p>
      </section>

      {/* 2 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">2. Descrição do Serviço</h3>
        <p>
          A wealth.Investing é uma plataforma de registro, análise e gestão de operações de trading.
          O serviço permite a importação de trades de múltiplas corretoras e plataformas, análise de
          performance, journaling de operações, gestão de risco e assistência via inteligência artificial.
          A plataforma é uma ferramenta de organização e análise — não uma corretora, assessoria ou
          consultoria de investimentos.
        </p>
      </section>

      {/* 3 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">3. Cadastro e Conta</h3>
        <p>
          Para utilizar os serviços, é necessário criar uma conta fornecendo informações verdadeiras e
          atualizadas. Você é o único responsável por manter a segurança das suas credenciais de acesso
          e por todas as atividades realizadas na sua conta. Caso identifique qualquer uso não autorizado,
          notifique-nos imediatamente pelo e-mail wealth.investing@outlook.com.
        </p>
      </section>

      {/* 4 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">4. Uso Permitido</h3>
        <p>A plataforma deve ser utilizada exclusivamente para fins pessoais e legítimos. É proibido:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1.5">
          <li>Redistribuir, revender ou sublicenciar o acesso à plataforma;</li>
          <li>Realizar engenharia reversa, scraping ou extração automatizada de dados;</li>
          <li>Utilizar a plataforma para fins ilegais ou fraudulentos;</li>
          <li>Tentar acessar dados de outros usuários ou comprometer a segurança do sistema;</li>
          <li>Compartilhar credenciais de acesso com terceiros.</li>
        </ul>
      </section>

      {/* 5 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">5. Planos e Pagamentos</h3>
        <p>
          A wealth.Investing oferece planos gratuitos e pagos. Os planos pagos são processados
          exclusivamente pelo Stripe, com suporte a cartão de crédito e Pix. As assinaturas possuem
          renovação automática na data de vencimento. O cancelamento pode ser realizado a qualquer
          momento pela página de configurações, tendo efeito ao final do período já pago. Não há
          reembolso proporcional para períodos parciais já pagos.
        </p>
      </section>

      {/* 6 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">
          6. Isenção de Responsabilidade — Aviso Importante
        </h3>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
          <p className="font-semibold text-foreground">
            A WEALTH.INVESTING NÃO É, NEM SE APRESENTA COMO, UMA EMPRESA DE CONSULTORIA, ASSESSORIA
            OU RECOMENDAÇÃO DE INVESTIMENTOS.
          </p>
          <p>
            A plataforma é exclusivamente uma ferramenta de registro e análise de operações. Nenhum
            conteúdo, dado, análise, insight ou sugestão fornecida pelo serviço — incluindo o AI Coach —
            constitui recomendação de investimento, aconselhamento financeiro ou incitação à compra ou
            venda de qualquer ativo.
          </p>
          <p>
            <strong className="text-foreground">O usuário é integralmente responsável por suas decisões
            de trading e investimento.</strong> A wealth.Investing não se responsabiliza por perdas
            financeiras, lucros cessantes ou quaisquer danos decorrentes de decisões tomadas com base
            em informações exibidas na plataforma.
          </p>
          <p>
            Operar no mercado financeiro envolve riscos substanciais, incluindo a possibilidade de perda
            total do capital investido. Opere apenas com recursos que você pode se permitir perder.
          </p>
        </div>
      </section>

      {/* 7 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">7. Propriedade Intelectual</h3>
        <p>
          Todo o código-fonte, design, interface, textos, logotipos, marcas e conteúdos da plataforma
          wealth.Investing são de propriedade exclusiva do desenvolvedor e estão protegidos pela
          legislação brasileira de direitos autorais e propriedade intelectual. É proibida a reprodução,
          distribuição ou modificação sem autorização prévia por escrito.
        </p>
      </section>

      {/* 8 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">8. Dados do Usuário</h3>
        <p>
          O usuário mantém a propriedade integral sobre os dados de trading importados e registrados
          na plataforma. A wealth.Investing utiliza esses dados exclusivamente para fornecer o serviço
          contratado. O usuário pode solicitar a exportação ou exclusão completa dos seus dados a
          qualquer momento, conforme nossa Política de Privacidade e a LGPD.
        </p>
      </section>

      {/* 9 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">9. Limitação de Responsabilidade</h3>
        <p>
          Em nenhuma hipótese a wealth.Investing será responsável por danos indiretos, incidentais,
          especiais, consequenciais ou punitivos, incluindo perda de lucros, dados, oportunidades de
          negócio ou goodwill. A responsabilidade total da wealth.Investing, em qualquer circunstância,
          será limitada ao valor total pago pelo usuário nos 12 (doze) meses anteriores ao evento que
          deu origem à reclamação.
        </p>
      </section>

      {/* 10 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">10. Disponibilidade do Serviço</h3>
        <p>
          Embora nos esforcemos para manter a plataforma disponível 24 horas por dia, 7 dias por semana,
          não garantimos disponibilidade ininterrupta. Manutenções programadas, atualizações e eventos
          fora do nosso controle podem causar indisponibilidade temporária. Faremos o possível para
          comunicar manutenções com antecedência.
        </p>
      </section>

      {/* 11 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">11. Modificações nos Termos</h3>
        <p>
          A wealth.Investing reserva-se o direito de modificar estes Termos de Uso a qualquer momento.
          Alterações significativas serão comunicadas com antecedência razoável através da plataforma
          ou por e-mail. O uso continuado do serviço após as alterações constitui aceitação dos novos
          termos.
        </p>
      </section>

      {/* 12 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">12. Rescisão</h3>
        <p>
          A wealth.Investing pode suspender ou encerrar sua conta, a qualquer momento e sem aviso
          prévio, em caso de violação destes Termos de Uso, uso fraudulento da plataforma ou qualquer
          conduta que comprometa a segurança ou integridade do serviço. Em caso de rescisão, o usuário
          poderá solicitar a exportação dos seus dados dentro de 30 (trinta) dias.
        </p>
      </section>

      {/* 13 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">13. Lei Aplicável e Foro</h3>
        <p>
          Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Para dirimir
          quaisquer controvérsias decorrentes destes termos, fica eleito o foro da Comarca de São Paulo,
          Estado de São Paulo, com exclusão de qualquer outro, por mais privilegiado que seja.
        </p>
      </section>

      {/* 14 */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1.5">14. Contato</h3>
        <p>
          Para dúvidas, sugestões ou solicitações relacionadas a estes Termos de Uso:{" "}
          <a href="mailto:wealth.investing@outlook.com" className="text-foreground underline underline-offset-2 hover:text-foreground/80">
            wealth.investing@outlook.com
          </a>
        </p>
      </section>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────── */
export type { LegalModal };

export function LegalModals({ open, onOpenChange }: LegalModalsProps) {
  const tCookies = useTranslations("legal.cookies");
  const tPrivacy = useTranslations("legal.privacy");
  const tTerms = useTranslations("legal.terms");
  const handleClose = () => onOpenChange(null);

  return (
    <>
      {/* Cookies */}
      <Dialog open={open === "cookies"} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent
          className="max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              {tCookies("title")}
            </DialogTitle>
            <DialogDescription>{tCookies("description")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2 -mr-2">
            <CookiesContent />
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full sm:w-auto">
              {tCookies("acknowledge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy */}
      <Dialog open={open === "privacy"} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent
          className="max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {tPrivacy("title")}
            </DialogTitle>
            <DialogDescription>{tPrivacy("description")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2 -mr-2">
            <PrivacyContent />
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full sm:w-auto">
              {tPrivacy("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms */}
      <Dialog open={open === "terms"} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent
          className="max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {tTerms("title")}
            </DialogTitle>
            <DialogDescription>{tTerms("description")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2 -mr-2">
            <TermsContent />
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full sm:w-auto">
              {tTerms("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
