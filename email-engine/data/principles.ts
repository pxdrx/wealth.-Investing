// 30 hand-written trading principles, 8-14 words each, pt-BR.
// Daily briefing picks one at random.

import type { Principle } from "../__mocks__/types";

export const principles: Principle[] = [
  { quote: "Stop não é covardia. É contrato com sua tese." },
  { quote: "Quem opera sem plano apenas torce pelo mercado." },
  { quote: "Risco controlado é a única forma de sobreviver longo prazo." },
  { quote: "Disciplina vence talento quando o mercado testa você." },
  { quote: "Tese sem invalidação é apenas opinião disfarçada de operação." },
  { quote: "Drawdown não é castigo. É informação sobre seu sizing." },
  { quote: "Operar bem é cumprir o plano, não acertar o trade." },
  { quote: "Mercado paga paciência e cobra impulsividade sem aviso." },
  { quote: "Sua próxima operação não precisa recuperar a anterior." },
  { quote: "Tamanho de posição decide quanto tempo você fica no jogo." },
  { quote: "Não é sobre estar certo. É sobre estar preparado." },
  { quote: "Lucro sem método é sorte com data marcada." },
  { quote: "Quem revisa journal cresce. Quem evita journal repete erros." },
  { quote: "Volatilidade não é inimiga. Posição grande demais é." },
  { quote: "Confiança vem de dados, não de boa intenção." },
  { quote: "Toda gestão de risco começa antes do primeiro clique." },
  { quote: "Boa execução é silenciosa. Má execução grita explicações." },
  { quote: "Setup perfeito não existe. Existe setup com edge mensurável." },
  { quote: "Mercado não te deve recuperação. Te deve oportunidade nova." },
  { quote: "Falhar com plano é estatística. Sem plano é desperdício." },
  { quote: "Win rate vende curso. Expectância paga conta." },
  { quote: "Cada trade é amostra. Não conclua na primeira." },
  { quote: "Defina saída antes de defender a entrada." },
  { quote: "Mercado lateraliza dinheiro de quem opera só na empolgação." },
  { quote: "Sua maior edge é não operar sem setup claro." },
  { quote: "Sizing pequeno em incerteza alta. Confiança não substitui dados." },
  { quote: "Resultado de curto prazo mente. Processo consistente fala verdade." },
  { quote: "Tese clara reduz ruído. Ruído reduz qualidade da decisão." },
  { quote: "Não exista herói no journal. Exista operador disciplinado." },
  { quote: "Mercado premia quem espera. Pune quem antecipa sem confirmação." },
];

export function randomPrinciple(): Principle {
  return principles[Math.floor(Math.random() * principles.length)];
}
