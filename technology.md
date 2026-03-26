# Technology

## Core da arquitetura

- **OpenClaw Agents**
  - runtime central da plataforma
  - responsavel por coordenar os agentes especializados
  - gerencia fluxos, tarefas, memoria operacional e execucao agentica

- **GPT-5.4**
  - modelo principal
  - usado para raciocinio, coordenacao, explicabilidade e decisoes mais complexas

- **GPT-5.4 mini**
  - modelo de apoio
  - usado para tarefas mais frequentes, repetitivas e de menor custo
  - ideal para classificacao, consolidacao e relatorios rotineiros

## Estrategia de uso dos modelos

### GPT-5.4

Usar para:

- agente supervisor
- agente de risco
- agente explicador
- agente de auto-implementacao controlada
- analises mais profundas e complexas

### GPT-5.4 mini

Usar para:

- agente de relatorio recorrente
- sumarizacao de eventos
- triagem inicial
- processamento de alto volume com menor custo

## Linguagem

### Opcao 1: Python

**Recomendacao principal no momento**

Motivos:

- melhor encaixe com IA e agentes
- integracao natural com pipelines de ML e visao computacional
- mais velocidade para MVP
- melhor ecossistema para automacao, backend e experimentacao

Usar Python para:

- tools dos agentes
- backend auxiliar
- integracoes
- logica de risco
- pipelines de analise
- visao computacional

### Opcao 2: TypeScript

Boa opcao, mas nao como linguagem principal do core inteligente.

Motivos:

- excelente para frontend
- boa para APIs e servicos web
- forte produtividade em interfaces e integracoes

Usar TypeScript para:

- frontend
- paineis
- dashboards
- camada web, se necessario

### Opcao 3: C++

Nao recomendado como linguagem principal nesta fase.

Motivos:

- aumenta muito a complexidade
- reduz velocidade de iteracao
- so faz sentido em partes muito especificas de performance critica

Quando faria sentido:

- edge computing pesado
- processamento visual de altissima performance
- componentes especificos de baixa latencia

## Decisao atual

- **Runtime central**: OpenClaw Agents
- **Modelo principal**: GPT-5.4
- **Modelo secundario**: GPT-5.4 mini
- **Linguagem principal recomendada**: Python
- **Linguagem complementar recomendada**: TypeScript
- **C++**: apenas se surgir necessidade real de performance em modulo especifico

## Resumo executivo

A stack inicial deve ser:

- OpenClaw para coordenacao total dos agentes
- GPT-5.4 para inteligencia principal
- GPT-5.4 mini para escala e custo
- Python como linguagem principal do sistema
- TypeScript como apoio para interface e camada web
