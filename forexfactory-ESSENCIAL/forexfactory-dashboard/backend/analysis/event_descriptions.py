"""
Descrições objetivas e institucionais de eventos.
"Análise do Evento" = APENAS descrição do que o evento mede e por que é acompanhado.
Texto informativo e neutro. Sem palavras como impacta, favorece, pressiona, tende a, pode gerar.
Sem referência a Panorama Macro Semanal, narrativa, viés ou tendência.
"""
from typing import Dict, List, Tuple

# (substring_no_título, descrição). 4–5 linhas: o que é, o que mede, por que relevante, como interpretado. Sem "Consulte fontes oficiais".
_TITLE_PATTERNS: List[Tuple[str, str]] = [
    ("german ifo", "Este evento refere-se ao índice IFO de clima de negócios na Alemanha, baseado em pesquisas com empresas que avaliam condições atuais e expectativas. É usado como indicador antecipado da atividade econômica. Analistas monitoram esse número para entender o ritmo do setor produtivo e as perspectivas de investimento no maior país da zona do euro."),
    ("ifo business", "Este indicador baseia-se em pesquisas com empresas sobre condições atuais e expectativas do ambiente de negócios. É utilizado como termômetro antecipado da atividade econômica. O mercado acompanha esse número para contextualizar ciclos e decisões de política monetária."),
    ("cpi ", "Este evento refere-se ao Índice de Preços ao Consumidor, que mede a evolução dos preços de uma cesta de bens e serviços ao longo do tempo. É usado como referência de custo de vida e de pressões inflacionárias. Analistas monitoram esse número para entender o ambiente de preços no contexto do ciclo econômico e das decisões de banco central."),
    (" consumer price", "Este evento refere-se ao Índice de Preços ao Consumidor, que mede a evolução dos preços de uma cesta de bens e serviços. É usado como referência de custo de vida e de pressões inflacionárias. Analistas acompanham esse número para contextualizar políticas monetárias e expectativas de mercado."),
    ("nfp", "Este evento refere-se à variação do emprego no setor não-agrícola dos EUA, publicada mensalmente. Mede a criação ou perda de postos de trabalho fora da agricultura. É usado como indicador do ritmo do mercado de trabalho e da saúde do ciclo econômico. Analistas monitoram esse número para avaliar pressões salariais e o posicionamento da política monetária."),
    ("nonfarm payroll", "Este evento refere-se à variação do emprego no setor não-agrícola dos EUA. Mede a criação ou perda de postos de trabalho fora da agricultura. É usado como indicador do ritmo do mercado de trabalho. Analistas acompanham esse número para contextualizar o ciclo econômico e as expectativas de política monetária."),
    ("employment change", "Este evento mede a variação do nível de emprego no período. É usado como indicador do ritmo do mercado de trabalho e da dinâmica do ciclo econômico. Analistas monitoram esse número para entender condições de oferta de mão de obra e pressões sobre salários."),
    ("unemployment rate", "Este evento mede a proporção da força de trabalho sem ocupação. É usado como referência do slack do mercado de trabalho e da fase do ciclo econômico. Analistas acompanham esse número para contextualizar decisões de política monetária e expectativas de crescimento."),
    ("jobless", "Este evento mede pedidos de seguro-desemprego ou a proporção da força de trabalho sem ocupação. É usado como indicador de condições do mercado de trabalho. Analistas monitoram esse número para entender a dinâmica do emprego no contexto do ciclo econômico."),
    ("gdp", "Este evento refere-se ao produto interno bruto, que mede o valor dos bens e serviços produzidos na economia em um período. É usado como referência do ritmo de crescimento. Analistas acompanham esse número para contextualizar ciclos econômicos, política monetária e expectativas de lucros."),
    ("pmi manufact", "Este indicador baseia-se em pesquisa com gestores de compras sobre condições de atividade industrial. Reflete expansão ou contração do setor. É usado como termômetro antecipado da produção. Analistas monitoram esse número para entender o ritmo do setor no contexto do ciclo econômico global."),
    ("pmi services", "Este indicador baseia-se em pesquisa com gestores de compras sobre condições de atividade no setor de serviços. Reflete expansão ou contração do setor. É usado como referência do ritmo da economia. Analistas acompanham esse número para contextualizar crescimento e políticas."),
    ("pmi composite", "Este indicador agrega pesquisas com gestores de compras sobre condições de atividade na indústria e nos serviços. É usado como indicador antecipado do ritmo da economia. Analistas monitoram esse número para entender a fase do ciclo econômico e as expectativas de mercado."),
    ("retail sales", "Este evento mede o valor das vendas no varejo em um período. É usado como indicador de consumo e da atividade econômica. Analistas acompanham esse número para entender a demanda doméstica e o ritmo do crescimento no contexto do ciclo econômico."),
    ("ppi", "Este evento refere-se à evolução dos preços no atacado, que mede custos na cadeia produtiva antes do consumidor final. É usado como indicador antecipado de pressões sobre os preços ao consumidor. Analistas monitoram esse número para contextualizar inflação e margens das empresas."),
    ("producer price", "Este evento mede a evolução dos preços no atacado. É usado como referência de custos na cadeia produtiva e como indicador antecipado de inflação. Analistas acompanham esse número para entender a dinâmica de preços no contexto do ciclo econômico."),
    ("pce price", "Este evento refere-se ao deflator de despesa de consumo pessoal, que mede a evolução dos preços dos bens e serviços consumidos pelas famílias. É acompanhado pelo Fed como referência de inflação. Analistas monitoram esse número para contextualizar a política monetária dos EUA."),
    ("central bank speech", "Este evento refere-se a discurso ou pronunciamento de autoridade de banco central. É acompanhado para compreensão do quadro de política monetária, orientação e condicionamento de decisões futuras. Analistas monitoram a comunicação para entender o posicionamento da autoridade no contexto dos dados macroeconômicos."),
    ("fed chair", "Este evento refere-se a pronunciamento do presidente do Fed. É acompanhado para compreensão do quadro de política monetária dos EUA e da orientação sobre taxas e balance sheet. Analistas monitoram a comunicação para contextualizar decisões e expectativas de mercado."),
    ("ecb president", "Este evento refere-se a pronunciamento do presidente do BCE. É acompanhado para compreensão do quadro de política monetária da zona do euro. Analistas monitoram a comunicação para entender o posicionamento da autoridade no contexto da inflação e do crescimento."),
    ("fomc", "Este evento refere-se à decisão de taxa de juros do Fed e à comunicação associada. É acompanhado como referência do posicionamento da política monetária dos EUA. Analistas monitoram a decisão e as projeções para contextualizar expectativas de juros, crescimento e inflação."),
    ("interest rate decision", "Este evento refere-se à decisão de taxa de juros do banco central. É acompanhado como referência do posicionamento da política monetária. Analistas monitoram a decisão e o comunicado para entender a reação a dados macroeconômicos e o horizonte de políticas."),
    ("rate decision", "Este evento refere-se à decisão de taxa de juros do banco central. É acompanhado como referência do posicionamento da política monetária. Analistas monitoram a decisão para contextualizar expectativas de juros e fluxos nos mercados de câmbio e de renda fixa."),
    ("industrial production", "Este evento mede a produção do setor industrial em um período. É usado como referência da atividade econômica e do ritmo do ciclo. Analistas acompanham esse número para entender a oferta e a utilização de capacidade no contexto global."),
    ("ism ", "Este indicador baseia-se em pesquisa com gestores de compras sobre condições de atividade industrial ou de serviços nos EUA. É usado como termômetro antecipado da economia americana. Analistas monitoram esse número para contextualizar crescimento e decisões do Fed."),
    ("pmi", "Este indicador baseia-se em pesquisa com gestores de compras sobre condições de atividade. Reflete expansão ou contração do setor. É usado como referência do ritmo da economia. Analistas acompanham esse número para entender a fase do ciclo econômico."),
    ("inflation", "Este evento refere-se à evolução dos preços em um período. É usado como referência de custo de vida e de pressões inflacionárias. Analistas monitoram esse número para contextualizar políticas monetárias e expectativas de juros no ciclo econômico global."),
    ("inflação", "Este evento refere-se à evolução dos preços em um período. É usado como referência de custo de vida e de pressões inflacionárias. Analistas monitoram esse número para contextualizar políticas monetárias e expectativas de juros."),
]

# Por tipo genérico (event_type). 4–5 linhas, descritivo e educativo.
_BY_EVENT_TYPE: Dict[str, str] = {
    "inflação": "Este evento refere-se à evolução dos preços ao consumidor ou produtor em um período. É usado como referência de custo de vida e de pressões inflacionárias na economia. Analistas monitoram esses números para contextualizar políticas monetárias e expectativas de juros no ciclo econômico.",
    "emprego": "Este evento refere-se a condições do mercado de trabalho, como ocupação, desemprego ou variação de emprego. É usado como indicador do ritmo do ciclo e da oferta de mão de obra. Analistas acompanham esses números para entender pressões salariais e o posicionamento de bancos centrais.",
    "atividade": "Este evento refere-se a produção, vendas ou pesquisas de gestores sobre atividade econômica. É usado como indicador do ritmo da economia e da fase do ciclo. Analistas monitoram esses números para contextualizar crescimento, emprego e políticas monetárias.",
    "bc": "Este evento refere-se a comunicação ou decisão de banco central sobre taxa de juros ou orientação. É acompanhado como referência do quadro de política monetária. Analistas monitoram a decisão e o comunicado para entender o posicionamento da autoridade no contexto dos dados macroeconômicos.",
}

# Fallback: tipo não mapeado. Descrição genérica institucional, 4–5 linhas. Sem "Consulte fontes oficiais".
GENERIC_DESCRIPTION = (
    "Este indicador é publicado por instituição oficial e entra nas séries de dados macroeconômicos. "
    "É usado como referência de condições da economia e do ciclo de negócios. "
    "Analistas e mercados o monitoram para contextualizar políticas e expectativas."
)


def get_event_description(title: str, event_type: str) -> str:
    """
    Retorna descrição objetiva do evento: o que mede e por que é acompanhado.
    Nunca retorna texto com 'indisponível'. Se o tipo não existir no mapa, usa descrição genérica.
    """
    t = (title or "").lower()
    for sub, desc in _TITLE_PATTERNS:
        if sub in t:
            return desc.strip()
    return _BY_EVENT_TYPE.get(event_type, GENERIC_DESCRIPTION).strip()
