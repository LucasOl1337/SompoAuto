import type { AgentStep, EventItem, Report, RiskAssessment, RunDetail } from "../types/api";
import sampleLowRiskImage from "../assets/cases/sample-low-risk.png";
import sampleHighRiskImage from "../assets/cases/sample-high-risk.png";
import sampleImageRiskImage from "../assets/cases/sample-image-risk.png";

type ChipTone = "default" | "success" | "warning" | "error" | "info";

type TelemetryKey =
  | "temperature"
  | "vibration"
  | "speed"
  | "obstacle_density"
  | "proximity_water"
  | "load_factor";

type TelemetryDescriptor = {
  key: TelemetryKey;
  label: string;
  goodLabel: string;
  alertLabel: string;
  explanation: string;
  limit: number;
  unit: string;
};

export const statusLabels: Record<string, string> = {
  completed: "Concluido",
  running: "Em analise",
  queued: "Na fila",
  partial_failure: "Concluido com alerta",
  failed: "Falhou",
  high: "Alto risco",
  medium: "Risco medio",
  low: "Baixo risco",
  simulated: "Simulado",
  available: "Disponivel",
  mock: "Demonstracao",
  missing: "Nao encontrado",
  ok: "Ativo",
};

export const statusTones: Record<string, ChipTone> = {
  completed: "success",
  running: "info",
  queued: "default",
  partial_failure: "warning",
  failed: "error",
  high: "error",
  medium: "warning",
  low: "success",
  simulated: "info",
  available: "success",
  mock: "info",
  missing: "warning",
  ok: "success",
};

const agentLabels: Record<string, string> = {
  "Supervisor Agent": "Triagem inicial",
  "Ingestion Agent": "Leitura dos dados",
  "Risk Agent": "Analise de risco",
  "Vision Agent": "Leitura de imagem",
  "Report Agent": "Resumo automatico",
  "Audit Agent": "Registro da trilha",
  "Auto-Implementation Agent": "Sugestao de acao",
};

const agentReasons: Record<string, string> = {
  "Supervisor Agent": "Define quais verificacoes sao necessarias para esse caso.",
  "Ingestion Agent": "Confere se os dados recebidos podem ser usados na analise.",
  "Risk Agent": "Compara os indicadores com limites de seguranca.",
  "Vision Agent": "Usa o anexo para procurar sinais visuais de risco.",
  "Report Agent": "Transforma a analise em um resumo facil de compartilhar.",
  "Audit Agent": "Registra o que aconteceu para manter rastreabilidade.",
  "Auto-Implementation Agent": "Sugere uma proxima acao sem executar nada automaticamente.",
};

const actionTranslations: Record<string, string> = {
  "Inspect cooling conditions before continuing the operation.": "Verificar condicoes de resfriamento antes de continuar.",
  "Schedule preventive maintenance and reduce operation intensity.": "Agendar manutencao preventiva e reduzir intensidade da operacao.",
  "Reduce movement speed in critical operating windows.": "Reduzir a velocidade durante janelas criticas.",
  "Review route and obstacle avoidance policy for the operator.": "Revisar rota e politica de desvio de obstaculos.",
  "Avoid operation near water or soften access controls.": "Evitar operar perto de agua ou reforcar controle da area.",
  "Redistribute load before the next cycle.": "Redistribuir a carga antes do proximo ciclo.",
  "Review attached visual evidence for operator briefing.": "Revisar a imagem enviada antes da proxima operacao.",
  "Keep monitoring the current operation; no immediate corrective action required.": "Manter monitoramento. Nao ha acao imediata necessaria.",
  "Escalate to technical review before the next critical cycle.": "Encaminhar para revisao tecnica antes do proximo ciclo critico.",
  "Hourly report consolidated the available runs and highlighted the dominant operational risks.": "O relatorio consolidou os testes recentes e destacou os riscos dominantes.",
};

const driverLabels: Record<string, string> = {
  temperature: "Temperatura",
  vibration: "Vibracao",
  speed: "Velocidade",
  obstacle_density: "Obstaculos por perto",
  proximity_water: "Proximidade com agua",
  load_factor: "Carga aplicada",
  visual_context_present: "Imagem enviada",
};

const operationLabels: Record<string, string> = {
  field_operation: "Operacao em campo",
  transport: "Transporte",
};

const telemetryDescriptors: TelemetryDescriptor[] = [
  {
    key: "temperature",
    label: "Temperatura",
    goodLabel: "Estavel",
    alertLabel: "Acima do ideal",
    explanation: "Verifica aquecimento do equipamento.",
    limit: 85,
    unit: "C",
  },
  {
    key: "vibration",
    label: "Vibracao",
    goodLabel: "Normal",
    alertLabel: "Vibracao alta",
    explanation: "Procura desgaste mecanico ou irregularidade.",
    limit: 65,
    unit: "",
  },
  {
    key: "speed",
    label: "Velocidade",
    goodLabel: "Controlada",
    alertLabel: "Velocidade alta",
    explanation: "Confere se a operacao esta em faixa segura.",
    limit: 45,
    unit: "km/h",
  },
  {
    key: "obstacle_density",
    label: "Obstaculos por perto",
    goodLabel: "Area limpa",
    alertLabel: "Muitos obstaculos",
    explanation: "Mede dificuldade do ambiente ao redor.",
    limit: 60,
    unit: "",
  },
  {
    key: "proximity_water",
    label: "Proximidade com agua",
    goodLabel: "Distancia segura",
    alertLabel: "Muito perto de agua",
    explanation: "Aponta risco de terreno sensivel ou area molhada.",
    limit: 50,
    unit: "",
  },
  {
    key: "load_factor",
    label: "Carga aplicada",
    goodLabel: "Carga adequada",
    alertLabel: "Carga alta",
    explanation: "Mostra esforco acima do recomendado.",
    limit: 80,
    unit: "%",
  },
];

export function getStatusLabel(value: string) {
  return statusLabels[value] ?? value;
}

export function getStatusTone(value: string): ChipTone {
  return statusTones[value] ?? "default";
}

export function getAgentLabel(name: string) {
  return agentLabels[name] ?? name;
}

export function getAgentReason(name: string) {
  return agentReasons[name] ?? "Etapa do fluxo interno da analise.";
}

export function formatOperation(operationType: string) {
  return operationLabels[operationType] ?? operationType;
}

export function formatRegion(region: string) {
  return region.replace(/-/g, " ").toUpperCase();
}

export function formatRuntime(value: string) {
  if (value === "mock") {
    return "Demonstracao";
  }
  return value;
}

export function translateAction(text: string) {
  return actionTranslations[text] ?? text;
}

export function translateDriver(name: string) {
  return driverLabels[name] ?? name;
}

export function buildFriendlySummary(risk: RiskAssessment | undefined) {
  if (!risk) {
    return "A analise ainda esta em andamento. Assim que terminar, esta tela vai explicar o que chamou atencao.";
  }

  if (risk.risk_level === "high") {
    return "O sistema encontrou sinais fortes de risco e recomenda revisar esse caso antes da proxima operacao.";
  }
  if (risk.risk_level === "medium") {
    return "Foram encontrados alguns sinais de atencao. Vale acompanhar e ajustar antes de repetir a operacao.";
  }
  return "Os sinais analisados ficaram dentro de uma faixa mais segura. O caso pode seguir com monitoramento normal.";
}

export function buildResultHeadline(risk: RiskAssessment | undefined) {
  if (!risk) {
    return "Aguardando resultado";
  }
  if (risk.risk_level === "high") {
    return "Risco alto: precisa de revisao";
  }
  if (risk.risk_level === "medium") {
    return "Risco medio: acompanhar de perto";
  }
  return "Baixo risco: operacao estavel";
}

export function buildScoreCaption(risk: RiskAssessment | undefined) {
  if (!risk) {
    return "Sem pontuacao disponivel ainda.";
  }
  if (risk.risk_score >= 75) {
    return "Pontuacao acima da faixa segura. O caso deve ser tratado como prioritario.";
  }
  if (risk.risk_score >= 45) {
    return "Pontuacao intermediaria. Existem sinais de atencao que pedem acompanhamento.";
  }
  return "Pontuacao em faixa segura. O comportamento atual parece controlado.";
}

export function buildTelemetryChecks(run: RunDetail, risk: RiskAssessment | undefined) {
  const activeDrivers = new Set(
    (risk?.drivers ?? [])
      .map((driver) => String(driver.name ?? ""))
      .filter(Boolean),
  );

  return telemetryDescriptors.map((descriptor) => {
    const rawValue = Number(run.telemetry_payload[descriptor.key] ?? 0);
    const triggered = rawValue >= descriptor.limit;
    return {
      ...descriptor,
      rawValue,
      progress: Math.min((rawValue / Math.max(descriptor.limit, 1)) * 100, 100),
      triggered,
      highlighted: triggered || activeDrivers.has(descriptor.key),
      statusLabel: triggered ? descriptor.alertLabel : descriptor.goodLabel,
      helper: triggered
        ? `Passou do limite recomendado de ${descriptor.limit}${descriptor.unit ? ` ${descriptor.unit}` : ""}.`
        : `Ficou abaixo do limite recomendado de ${descriptor.limit}${descriptor.unit ? ` ${descriptor.unit}` : ""}.`,
    };
  });
}

export function buildStepCards(steps: AgentStep[]) {
  return steps.map((step, index) => ({
    id: step.id,
    title: getAgentLabel(step.agent_name),
    reason: getAgentReason(step.agent_name),
    status: step.status,
    stepNumber: index + 1,
    runtime: step.runtime_name,
    model: step.model_name,
  }));
}

export function buildTimeline(events: EventItem[]) {
  return events.map((event) => ({
    id: event.id,
    title: getAgentLabel(event.agent_name ?? "Sistema"),
    message: translateAction(event.message),
    time: new Date(event.created_at).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
}

export function simplifyReport(report: Report | undefined) {
  if (!report) {
    return {
      title: "Resumo ainda nao gerado",
      body: "Quando o processamento terminar, esta area vai mostrar um resumo simples para quem precisa decidir rapido.",
      actions: [],
    };
  }

  return {
    title: report.title,
    body: translateAction(report.content),
    actions: report.suggested_actions.map(translateAction),
  };
}

export function formatRiskBreakdownLabel(label: string) {
  return getStatusLabel(label);
}

export function formatHotspotLabel(label: string, type: "region" | "operation" | "driver") {
  if (type === "region") {
    return formatRegion(label);
  }
  if (type === "operation") {
    return formatOperation(label);
  }
  return translateDriver(label);
}

export function getMetricShareCaption(value: number, total: number) {
  if (!total) {
    return "Sem casos suficientes para comparar.";
  }
  return `${Math.round((value / total) * 100)}% dos casos da janela atual`;
}

export type TestProfile = {
  key: "low" | "high" | "image" | "default";
  title: string;
  goal: string;
  why: string;
  expectedOutcome: string;
  checks: string[];
  riskFocus: string;
  lossRangeBrl: [number, number];
  optimizationGoal: string;
};

const testProfiles: Record<TestProfile["key"], TestProfile> = {
  low: {
    key: "low",
    title: "Teste de estabilidade operacional",
    goal: "Validar se o sistema reconhece um cenario com sinais dentro da faixa segura.",
    why: "Serve como referencia para comparar com cenarios de risco medio e alto.",
    expectedOutcome: "Resultado esperado: baixo risco, com recomendacao de monitoramento normal.",
    checks: ["Temperatura", "Vibracao", "Velocidade", "Carga aplicada"],
    riskFocus: "Prevenir desgaste progressivo que vira quebra de equipamento durante a safra.",
    lossRangeBrl: [20000, 60000],
    optimizationGoal: "Reduzir parada nao planejada e custo de manutencao corretiva.",
  },
  high: {
    key: "high",
    title: "Teste de risco elevado",
    goal: "Verificar se o sistema detecta rapidamente sinais criticos de operacao.",
    why: "Ajuda a confirmar se alertas importantes estao sendo priorizados.",
    expectedOutcome: "Resultado esperado: risco alto, com acoes preventivas claras.",
    checks: ["Temperatura", "Vibracao", "Obstaculos por perto", "Proximidade com agua", "Carga aplicada"],
    riskFocus: "Evitar falha critica, acidente operacional e interrupcao de rota em momento sensivel.",
    lossRangeBrl: [150000, 450000],
    optimizationGoal: "Reduzir severidade de sinistro e proteger margem operacional da safra.",
  },
  image: {
    key: "image",
    title: "Teste com evidencias visuais",
    goal: "Avaliar risco combinando telemetria com anexo de imagem.",
    why: "Garante que o fluxo de analise visual esteja integrado ao resultado final.",
    expectedOutcome: "Resultado esperado: caso com analise de imagem e recomendacoes enriquecidas.",
    checks: ["Temperatura", "Obstaculos por perto", "Proximidade com agua", "Imagem enviada"],
    riskFocus: "Prevenir perda por condicao de campo critica nao capturada apenas pela telemetria.",
    lossRangeBrl: [220000, 600000],
    optimizationGoal: "Melhorar decisao em campo e reduzir perda financeira por evento severo.",
  },
  default: {
    key: "default",
    title: "Teste customizado",
    goal: "Executar avaliacao de risco para um cenario enviado manualmente.",
    why: "Permite simular condicoes reais do seu contexto de operacao.",
    expectedOutcome: "Resultado esperado: classificacao de risco com sugestoes de acao.",
    checks: ["Temperatura", "Vibracao", "Velocidade", "Carga aplicada"],
    riskFocus: "Mapear risco operacional para priorizar prevencao antes de virar custo alto.",
    lossRangeBrl: [60000, 180000],
    optimizationGoal: "Aumentar previsibilidade de custo e diminuir perdas evitaveis.",
  },
};

function inferProfileKeyFromScenarioId(scenarioId: string): TestProfile["key"] {
  const lower = scenarioId.toLowerCase();
  if (lower.includes("image")) return "image";
  if (lower.includes("high")) return "high";
  if (lower.includes("low")) return "low";
  return "default";
}

export function getTestProfileByPreset(preset: string | undefined): TestProfile {
  if (preset === "low") return testProfiles.low;
  if (preset === "high") return testProfiles.high;
  if (preset === "image") return testProfiles.image;
  return testProfiles.default;
}

export function getTestProfileForScenarioId(scenarioId: string): TestProfile {
  return testProfiles[inferProfileKeyFromScenarioId(scenarioId)];
}

export function getTestProfileForRun(run: RunDetail): TestProfile {
  const preset = typeof run.scenario_metadata?.preset === "string" ? run.scenario_metadata.preset : undefined;
  if (preset) {
    return getTestProfileByPreset(preset);
  }

  const demoSeed = run.scenario_metadata?.demo_seed;
  if (typeof demoSeed === "object" && demoSeed) {
    const seedKey = (demoSeed as Record<string, unknown>).seed_key;
    if (seedKey === "low-risk") return testProfiles.low;
    if (seedKey === "high-risk") return testProfiles.high;
    if (seedKey === "image-risk") return testProfiles.image;
  }

  if (run.has_attachments) {
    return testProfiles.image;
  }
  return getTestProfileForScenarioId(run.scenario_id);
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatBrlRange(range: [number, number]) {
  return `${brlFormatter.format(range[0])} - ${brlFormatter.format(range[1])}`;
}

export function getMidpoint(range: [number, number]) {
  return Math.round((range[0] + range[1]) / 2);
}

export function getSOMPOBusinessContextLine() {
  return "Contexto SOMPO Agro Brasil: prevenir sinistros operacionais em atividades agronomicas e reduzir perdas financeiras evitaveis.";
}

export function getScenarioVisual(scenarioId: string) {
  const lower = scenarioId.toLowerCase();
  if (lower.includes("low")) {
    return {
      src: sampleLowRiskImage,
      alt: "Trator em operacao controlada no campo",
      caption: "Exemplo de operacao estavel com baixa exposicao a risco.",
    };
  }
  if (lower.includes("high")) {
    return {
      src: sampleHighRiskImage,
      alt: "Colheitadeira em rota critica com barro e obstaculos",
      caption: "Exemplo de operacao com sinais fortes de risco e estresse mecanico.",
    };
  }
  if (lower.includes("image")) {
    return {
      src: sampleImageRiskImage,
      alt: "Pulverizador proximo a area alagada e obstaculos",
      caption: "Exemplo com evidencia visual para apoiar decisao alem da telemetria.",
    };
  }

  return {
    src: sampleLowRiskImage,
    alt: "Imagem ilustrativa de operacao agronomica",
    caption: "Ilustracao de referencia do contexto operacional.",
  };
}
