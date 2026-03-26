# Sprint 1

## Resumo

O projeto ja possui um prototipo funcional de monitoramento de risco operacional com backend em FastAPI, frontend em React, persistencia de runs e relatorios, armazenamento de anexos e um fluxo agentico simulado via OpenClaw/mock.

Hoje o sistema ja permite cadastrar cenarios, processar uma execucao completa, acompanhar o status dos agentes, consultar detalhes do risco gerado, visualizar um painel consolidado do portfolio e gerar relatorios horarios.

## O que ja temos no programa

### 1. Cadastro e disparo de cenarios

- Tela `Scenario Upload` para enviar um cenario manualmente.
- Presets de baixo risco e alto risco para acelerar testes.
- Campo JSON editavel para simular diferentes entradas.
- Upload de anexos para acionar o `Vision Agent` stub.
- Criacao de um novo run e redirecionamento para o detalhe da execucao.

### 2. Monitoramento de runs

- Tela `Runs` com a lista de todas as execucoes.
- Exibicao de scenario, equipamento, regiao, tipo de operacao, status, runtime e data.
- Atualizacao automatica da lista para acompanhamento quase em tempo real.

### 3. Detalhe completo de cada run

- Tela `Run Detail` com status geral da execucao.
- Timeline dos agentes executados no fluxo.
- Score de risco, nivel de risco e recomendacoes geradas.
- Lista de anexos/artifacts enviados.
- Eventos de execucao para auditoria e rastreabilidade.
- Relatorio individual do run.
- Bloco de `auto-implementation` simulada, sem acao real em producao.

### 4. Fluxo agentico atual

O backend executa hoje este fluxo:

1. `Supervisor Agent`: decide o roteamento do run.
2. `Ingestion Agent`: valida e registra os dados recebidos.
3. `Risk Agent`: calcula score, classifica risco e gera recomendacoes.
4. `Vision Agent`: roda apenas quando ha anexo, hoje como stub.
5. `Auto-Implementation Agent`: cria proposta simulada de ajuste, sem executar.
6. `Report Agent`: gera o resumo textual do run e do relatorio horario.
7. `Audit Agent`: registra rastreabilidade do processo.

### 5. Regras de risco ja implementadas

- O score considera sinais como temperatura, vibracao, velocidade, densidade de obstaculos, proximidade de agua e fator de carga.
- Anexos aumentam o score e entram como contexto visual.
- O risco e classificado em `low`, `medium` e `high`.
- O sistema gera recomendacoes automaticas com base nos drivers detectados.

### 6. Portfolio overview

- Tela `Portfolio Overview` para visao consolidada das execucoes.
- KPIs principais: total de runs, runs concluidos, em andamento, score medio, anexos e alto risco.
- Quebra por status e por nivel de risco.
- Hotspots por regiao e tipo de operacao.
- Hotspots dos principais drivers tecnicos.
- Lista de acoes mais recorrentes.
- Lista de runs recentes de alto risco.
- Janela de analise em 24h, 72h e 7 dias.

### 7. Relatorio horario

- Tela `Hourly Reports`.
- Geracao manual de relatorio consolidado da ultima hora.
- Exibicao do ultimo relatorio disponivel.
- Resumo de runs analisados e sugestoes de acao.

### 8. Estrutura tecnica pronta

- Backend com endpoints de `health`, criacao de cenario, listagem de runs, detalhe de run, relatorio horario e analytics de portfolio.
- Persistencia de `runs`, `artifacts`, `events`, `agent_steps`, `risk_assessments`, `reports` e `policy_decisions`.
- Armazenamento de anexos em MinIO ou local.
- Runtime com modo `mock` e tentativa de uso de OpenClaw CLI quando disponivel.

## Proximos passos

### 1. Criar testes de ponta a ponta da interface

Porque:
- hoje a validacao principal esta mais forte no backend;
- falta garantir no navegador o fluxo completo de upload, execucao, detalhe e dashboard;
- isso reduz risco de regressao nas telas principais.

### 2. Adicionar filtros no dashboard de portfolio

Porque:
- a visao atual ja agrega bem, mas ainda e muito geral;
- filtros por regiao, operacao e nivel de risco ajudam a transformar o painel em ferramenta de analise real.

### 3. Permitir exportacao dos relatorios e do resumo do portfolio

Porque:
- o sistema ja gera informacao util;
- o proximo passo natural e facilitar compartilhamento com operacao, governanca e gestao.

### 4. Evoluir o `Auto-Implementation Agent` de simulacao para fluxo controlado de aprovacao

Porque:
- hoje ele apenas sugere acoes;
- um fluxo de aprovacao humana deixaria o prototipo mais proximo de um caso real sem perder seguranca.

### 5. Melhorar a camada visual e padronizacao de textos

Porque:
- o produto ja tem as telas principais prontas;
- agora vale refinar consistencia visual, textos e pequenos detalhes de UX para demonstracao e uso interno.

## Conclusao

A Sprint 1 entregou um prototipo funcional de ponta a ponta. Ja existe entrada de cenarios, processamento agentico, avaliacao de risco, rastreabilidade, dashboard consolidado e relatorio horario. O foco da proxima etapa deve ser confiabilidade da interface, filtros analiticos, exportacao e aproximacao gradual de um fluxo operacional real.
