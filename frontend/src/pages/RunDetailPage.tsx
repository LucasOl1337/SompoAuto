import { useEffect, useState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { fetchRunDetail } from "../api/client";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";
import type { RunDetail } from "../types/api";
import {
  buildFriendlySummary,
  buildResultHeadline,
  buildScoreCaption,
  buildStepCards,
  buildTelemetryChecks,
  buildTimeline,
  formatOperation,
  formatRegion,
  formatRuntime,
  formatBrlRange,
  getScenarioVisual,
  getTestProfileForRun,
  simplifyReport,
  translateAction,
} from "../utils/presentation";

type Props = {
  runId: string | null;
};

export function RunDetailPage({ runId }: Props) {
  const [run, setRun] = useState<RunDetail | null>(null);

  useEffect(() => {
    if (!runId) return undefined;

    const tick = async () => {
      const data = await fetchRunDetail(runId);
      setRun(data);
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => window.clearInterval(id);
  }, [runId]);

  if (!runId) {
    return <SectionCard title="Detalhe do caso">Selecione um caso na lista para ver a explicacao completa.</SectionCard>;
  }

  if (!run) {
    return <SectionCard title="Detalhe do caso">Carregando caso...</SectionCard>;
  }

  const latestRisk = run.risk_assessments.at(-1);
  const recommendations = (latestRisk?.recommendations ?? []).map(translateAction);
  const telemetryChecks = buildTelemetryChecks(run, latestRisk);
  const stepCards = buildStepCards(run.agent_steps);
  const timelineItems = buildTimeline(run.events);
  const report = simplifyReport(run.reports.find((item) => item.report_type === "run"));
  const testProfile = getTestProfileForRun(run);
  const visual = getScenarioVisual(run.scenario_id);

  return (
    <Stack spacing={3}>
      <SectionCard
        title={`Caso ${run.scenario_id}`}
        subtitle={`${formatRegion(run.region)} | ${formatOperation(run.operation_type)} | Equipamento ${run.equipment_id}`}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <StatusChip value={run.status} />
                <Typography color="text.secondary" variant="body2">
                  Modo: {formatRuntime(run.runtime_mode)}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Criado em {new Date(run.created_at).toLocaleString("pt-BR")}
                </Typography>
              </Stack>
              <Typography variant="h5">{buildResultHeadline(latestRisk)}</Typography>
              <Typography color="text.secondary">{buildFriendlySummary(latestRisk)}</Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2.5, background: "#f8fbff" }}>
              <CardContent sx={{ p: "20px !important" }}>
                <Stack spacing={1}>
                  <Typography color="text.secondary" sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                    Nota geral do caso
                  </Typography>
                  <Typography variant="h3" sx={{ color: latestRisk?.risk_level === "high" ? "#b42318" : latestRisk?.risk_level === "medium" ? "#b54708" : "#027a48" }}>
                    {latestRisk?.risk_score?.toFixed(0) ?? "--"}
                  </Typography>
                  <LinearProgress
                    value={latestRisk?.risk_score ?? 0}
                    variant="determinate"
                    color={latestRisk?.risk_level === "high" ? "error" : latestRisk?.risk_level === "medium" ? "warning" : "success"}
                  />
                  <Typography color="text.secondary" variant="body2">
                    {buildScoreCaption(latestRisk)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Objetivo deste teste" subtitle="Este bloco explica por que este caso foi executado e como avaliar se ele cumpriu o objetivo.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>{testProfile.title}</Typography>
                <Typography sx={{ mt: 1 }} color="text.secondary" variant="body2">
                  {testProfile.goal}
                </Typography>
                <Typography sx={{ mt: 1.5 }} fontWeight={700}>
                  Por que este teste foi rodado?
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {testProfile.why}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%", background: "#f8fbff" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>Checagens previstas</Typography>
                <Stack sx={{ mt: 1 }} spacing={0.5}>
                  {testProfile.checks.map((check) => (
                    <Typography key={check} color="text.secondary" variant="body2">
                      - {check}
                    </Typography>
                  ))}
                </Stack>
                <Typography sx={{ mt: 1.5 }} fontWeight={700}>
                  O que significa um bom resultado
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {testProfile.expectedOutcome}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        title="Imagem de referencia do caso"
        subtitle="Simulacao visual usada para contextualizar o tipo de operacao e o risco que este teste busca prevenir."
      >
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              component="img"
              src={visual.src}
              alt={visual.alt}
              sx={{
                width: "100%",
                maxHeight: 280,
                objectFit: "cover",
                borderRadius: 2,
                border: "1px solid #d6dde8",
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={1}>
              <Typography fontWeight={700}>O que voce esta vendo</Typography>
              <Typography color="text.secondary">{visual.caption}</Typography>
              <Typography color="text.secondary" variant="body2">
                Esta imagem ajuda usuarios nao tecnicos a entender rapidamente o contexto operacional analisado neste caso.
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Contexto de negocio SOMPO Agro Brasil" subtitle="Traducao do teste para prevencao de sinistro e reducao de perda financeira no agronegocio.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>Risco prevenido</Typography>
                <Typography color="text.secondary" variant="body2">
                  {testProfile.riskFocus}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%", background: "#fffaf0" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>Perda financeira evitavel</Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  {formatBrlRange(testProfile.lossRangeBrl)}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Faixa estimada por evento neste tipo de operacao.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>Objetivo economico</Typography>
                <Typography color="text.secondary" variant="body2">
                  {testProfile.optimizationGoal}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </SectionCard>

      {!latestRisk ? (
        <Alert severity="info">
          O sistema ainda esta analisando esse caso. Assim que terminar, esta pagina mostrara os testes executados e os motivos do resultado.
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title="O que foi testado"
            subtitle="Cada bloco abaixo mostra um criterio analisado, o valor encontrado e se ele ficou dentro da faixa recomendada."
          >
            <Grid container spacing={2}>
              {telemetryChecks.map((item) => (
                <Grid key={item.key} size={{ xs: 12, md: 6 }}>
                  <Card
                    sx={{
                      height: "100%",
                      borderRadius: 2.5,
                      borderColor: item.highlighted ? "#f79009" : "#e5eaf2",
                      background: item.highlighted ? "#fffaf0" : "#ffffff",
                    }}
                  >
                    <CardContent sx={{ p: "18px !important" }}>
                      <Stack spacing={1.2}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <div>
                            <Typography fontWeight={700}>{item.label}</Typography>
                            <Typography color="text.secondary" variant="body2">
                              {item.explanation}
                            </Typography>
                          </div>
                          <StatusChip value={item.triggered ? "medium" : "low"} />
                        </Stack>
                        <Typography variant="h5">
                          {item.rawValue.toFixed(0)}
                          {item.unit ? ` ${item.unit}` : ""}
                        </Typography>
                        <LinearProgress value={item.progress} variant="determinate" color={item.triggered ? "warning" : "success"} />
                        <Typography variant="body2">{item.statusLabel}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {item.helper}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title="Principais acoes sugeridas" subtitle="Resumo simples do que fazer agora, considerando os sinais mais importantes deste caso.">
            {recommendations.length ? (
              <Stack spacing={1.5}>
                {recommendations.map((item) => (
                  <Card key={item} sx={{ borderRadius: 2.5, background: "#fffaf0" }}>
                    <CardContent sx={{ p: "16px !important" }}>
                      <Typography>{item}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">As recomendacoes vao aparecer aqui quando a analise terminar.</Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Etapas executadas" subtitle="Mostra quais verificacoes rodaram e por que cada uma delas existe.">
            <Stack spacing={1.5}>
              {stepCards.map((step) => (
                <Card key={step.id} sx={{ borderRadius: 2.5 }}>
                  <CardContent sx={{ p: "16px !important" }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography fontWeight={700}>
                          {step.stepNumber}. {step.title}
                        </Typography>
                        <StatusChip value={step.status} />
                      </Stack>
                      <Typography color="text.secondary" variant="body2">
                        {step.reason}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        Motor usado: {step.model} | Execucao: {formatRuntime(step.runtime)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Historico do caso" subtitle="Linha do tempo simplificada do que aconteceu durante o processamento.">
            <Stack spacing={1.5}>
              {timelineItems.map((event) => (
                <Stack key={event.id} direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: "#0f4c81", mt: 0.75, flexShrink: 0 }} />
                  <Stack spacing={0.25}>
                    <Typography fontWeight={700}>
                      {event.time} | {event.title}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {event.message}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Arquivos e evidencias" subtitle="Anexos enviados para complementar a analise.">
            {run.artifacts.length ? (
              <Stack spacing={1}>
                {run.artifacts.map((artifact) => (
                  <Card key={artifact.id} sx={{ borderRadius: 2.5 }}>
                    <CardContent sx={{ p: "16px !important" }}>
                      <Typography fontWeight={700}>{artifact.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {artifact.media_type} | {artifact.size_bytes} bytes
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Nenhum anexo foi enviado para este caso.</Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Sugestao automatica" subtitle="Acao simulada que o sistema sugere para analise humana.">
            {run.policy_decisions.length ? (
              <Stack spacing={1}>
                {run.policy_decisions.map((decision) => (
                  <Card key={decision.id} sx={{ borderRadius: 2.5, background: "#f8fbff" }}>
                    <CardContent sx={{ p: "16px !important" }}>
                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={700}>Sugestao de ajuste</Typography>
                          <StatusChip value={decision.execution_mode} />
                        </Stack>
                        <Typography>{decision.decision_reason}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Ainda nao ha sugestao automatica registrada para este caso.</Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <SectionCard title="Resumo final" subtitle="Versao mais simples do relatorio gerado pelo sistema para este caso.">
        <Stack spacing={1.5}>
          <Typography variant="h6">{report.title}</Typography>
          <Typography>{report.body}</Typography>
          {report.actions.length ? (
            <Stack spacing={1}>
              {report.actions.map((action) => (
                <Typography key={action} color="text.secondary" variant="body2">
                  - {action}
                </Typography>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
