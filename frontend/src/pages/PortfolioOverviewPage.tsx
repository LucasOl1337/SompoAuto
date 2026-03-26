import { useEffect, useState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { fetchPortfolioSummary } from "../api/client";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";
import type {
  BreakdownCount,
  BreakdownRisk,
  DriverHotspot,
  PortfolioSummary,
  PrioritizedAction,
  RecentRiskRun,
} from "../types/api";
import {
  formatHotspotLabel,
  formatRiskBreakdownLabel,
  formatOperation,
  formatRegion,
  getMetricShareCaption,
  translateAction,
} from "../utils/presentation";

type Props = {
  onOpenHourlyReports: () => void;
  onOpenRun: (runId: string) => void;
};

const windows = [24, 72, 168];

export function PortfolioOverviewPage({ onOpenHourlyReports, onOpenRun }: Props) {
  const [hours, setHours] = useState(24);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next = await fetchPortfolioSummary(hours);
        if (!cancelled) {
          setSummary(next);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar a visao geral.");
        }
      }
    };

    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [hours]);

  const totalRuns = summary?.stats.total_runs ?? 0;

  return (
    <Stack spacing={3}>
      <SectionCard title="Painel geral de risco" subtitle="Resumo visual da janela mais recente, com foco nos casos que mais precisam de atencao.">
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {windows.map((windowHours) => (
              <Button
                key={windowHours}
                onClick={() => setHours(windowHours)}
                variant={windowHours === hours ? "contained" : "outlined"}
              >
                {windowHours === 168 ? "Ultimos 7 dias" : `Ultimas ${windowHours}h`}
              </Button>
            ))}
          </Stack>
          <Stack spacing={0.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
            <Typography variant="body2" color="text.secondary">
              {summary ? `Atualizado em ${new Date(summary.generated_at).toLocaleString("pt-BR")}` : "Carregando painel"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {summary?.latest_hourly_report
                ? `Ultimo relatorio horario com ${summary.latest_hourly_report.runs_analyzed} caso(s)`
                : "Relatorio horario ainda nao gerado"}
            </Typography>
          </Stack>
        </Stack>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {!error && !summary ? <Alert severity="info">Buscando os dados mais recentes do portfolio...</Alert> : null}
        {!error && summary && summary.stats.total_runs === 0 ? (
          <Alert severity="info">O ambiente ainda esta preparando os primeiros casos e o painel sera preenchido automaticamente.</Alert>
        ) : null}
      </SectionCard>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            index={0}
            title="Casos monitorados"
            value={String(summary?.stats.total_runs ?? 0)}
            caption={`${summary?.stats.completed_runs ?? 0} concluidos e ${summary?.stats.in_progress_runs ?? 0} em andamento.`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            index={1}
            title="Nota media"
            value={summary?.stats.average_risk_score?.toFixed(1) ?? "--"}
            caption={`${summary?.stats.runs_with_assessment ?? 0} caso(s) com avaliacao completa.`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            index={2}
            title="Casos criticos"
            value={String(summary?.stats.high_risk_runs ?? 0)}
            caption={getMetricShareCaption(summary?.stats.high_risk_runs ?? 0, totalRuns)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            index={3}
            title="Casos com imagem"
            value={String(summary?.stats.runs_with_attachments ?? 0)}
            caption={getMetricShareCaption(summary?.stats.runs_with_attachments ?? 0, totalRuns)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Distribuicao dos casos" subtitle="Mostra quantos casos estao em cada etapa e quantos ja foram classificados por nivel de risco.">
            <Stack spacing={2.5}>
              <BreakdownList items={summary?.status_breakdown ?? []} total={totalRuns} />
              <BreakdownList items={summary?.risk_level_breakdown ?? []} total={summary?.stats.runs_with_assessment ?? 0} />
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Cobertura do relatorio horario" subtitle="Mostra se o consolidado mais recente ja esta pronto para leitura e compartilhamento.">
            {summary?.latest_hourly_report ? (
              <Stack spacing={1.5}>
                <Typography variant="h6">{summary.latest_hourly_report.title}</Typography>
                <Typography color="text.secondary" variant="body2">
                  Gerado em {new Date(summary.latest_hourly_report.created_at).toLocaleString("pt-BR")}
                </Typography>
                <Typography variant="body2">
                  O relatorio mais recente consolidou {summary.latest_hourly_report.runs_analyzed} caso(s).
                </Typography>
                <Button onClick={onOpenHourlyReports} variant="outlined">
                  Abrir relatorio horario
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Typography color="text.secondary">Ainda nao existe relatorio horario disponivel para esta janela.</Typography>
                <Button onClick={onOpenHourlyReports} variant="outlined">
                  Ir para relatorio horario
                </Button>
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Regioes com mais atencao" subtitle="Ajuda a ver onde os casos mais sensiveis estao se concentrando.">
            <RiskBreakdownTable items={summary?.region_breakdown ?? []} type="region" />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Tipos de operacao mais sensiveis" subtitle="Compara onde a operacao esta ficando mais exposta.">
            <RiskBreakdownTable items={summary?.operation_breakdown ?? []} type="operation" />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Sinais que mais aparecem" subtitle="Resume os fatores que mais estao elevando a nota de risco na janela atual.">
            <DriverHotspotsTable items={summary?.top_driver_hotspots ?? []} />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Acoes mais recomendadas" subtitle="Lista o que o sistema mais tem sugerido para os casos recentes.">
            <PrioritizedActionsList items={summary?.prioritized_actions ?? []} />
          </SectionCard>
        </Grid>
      </Grid>

      <SectionCard title="Casos mais urgentes" subtitle="Atalho para abrir rapidamente os casos com maior risco na janela selecionada.">
        <RecentHighRiskRunsTable items={summary?.recent_high_risk_runs ?? []} onOpenRun={onOpenRun} />
      </SectionCard>
    </Stack>
  );
}

const METRIC_ACCENTS = [
  { bg: "#eff6ff", border: "#bfdbfe", valueColor: "#1d4ed8" },
  { bg: "#f0fdf4", border: "#bbf7d0", valueColor: "#15803d" },
  { bg: "#fff7ed", border: "#fed7aa", valueColor: "#c2410c" },
  { bg: "#faf5ff", border: "#e9d5ff", valueColor: "#7e22ce" },
];

function MetricCard({ title, value, caption, index }: { title: string; value: string; caption: string; index: number }) {
  const accent = METRIC_ACCENTS[index % METRIC_ACCENTS.length];
  return (
    <Card sx={{ height: "100%", background: accent.bg, border: `1px solid ${accent.border}`, borderRadius: 2.5 }}>
      <CardContent sx={{ p: "20px !important" }}>
        <Stack spacing={1.5}>
          <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}>
            {title}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, color: accent.valueColor, lineHeight: 1 }}>
            {value}
          </Typography>
          <Box sx={{ height: 1, background: accent.border }} />
          <Typography color="text.secondary" variant="body2">
            {caption}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function BreakdownList({ items, total }: { items: BreakdownCount[]; total: number }) {
  if (!items.length) {
    return <Typography color="text.secondary">Ainda nao ha casos suficientes nesta janela.</Typography>;
  }

  return (
    <Stack spacing={1.5}>
      {items.map((item) => {
        const progress = total ? (item.count / total) * 100 : 0;
        return (
          <Stack key={item.label} spacing={0.5}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography fontWeight={600}>{formatRiskBreakdownLabel(item.label)}</Typography>
              <Typography color="text.secondary" variant="body2">
                {item.count} caso(s) | {Math.round(progress)}%
              </Typography>
            </Stack>
            <LinearProgress value={progress} variant="determinate" />
          </Stack>
        );
      })}
    </Stack>
  );
}

function RiskBreakdownTable({ items, type }: { items: BreakdownRisk[]; type: "region" | "operation" }) {
  if (!items.length) {
    return <Typography color="text.secondary">Sem dados suficientes para este agrupamento ainda.</Typography>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{type === "region" ? "Regiao" : "Tipo de operacao"}</TableCell>
          <TableCell align="right">Casos</TableCell>
          <TableCell align="right">Nota media</TableCell>
          <TableCell align="right">Criticos</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.label}>
            <TableCell>{formatHotspotLabel(item.label, type)}</TableCell>
            <TableCell align="right">{item.count}</TableCell>
            <TableCell align="right">{item.average_risk_score?.toFixed(1) ?? "--"}</TableCell>
            <TableCell align="right">{item.high_risk_runs}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DriverHotspotsTable({ items }: { items: DriverHotspot[] }) {
  if (!items.length) {
    return <Typography color="text.secondary">Ainda nao ha sinais dominantes nesta janela.</Typography>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Sinal</TableCell>
          <TableCell align="right">Ocorrencias</TableCell>
          <TableCell align="right">Valor medio</TableCell>
          <TableCell align="right">Nota media</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.driver_name}>
            <TableCell>{formatHotspotLabel(item.driver_name, "driver")}</TableCell>
            <TableCell align="right">{item.occurrences}</TableCell>
            <TableCell align="right">{item.average_driver_value.toFixed(1)}</TableCell>
            <TableCell align="right">{item.average_risk_score.toFixed(1)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PrioritizedActionsList({ items }: { items: PrioritizedAction[] }) {
  if (!items.length) {
    return <Typography color="text.secondary">Nenhuma recomendacao recorrente encontrada ainda.</Typography>;
  }

  return (
    <Stack spacing={1.5}>
      {items.map((item) => (
        <Stack key={item.action} direction="row" spacing={1.5} alignItems="flex-start">
          <StatusChip value={item.occurrences > 1 ? "medium" : "low"} />
          <Stack spacing={0.25}>
            <Typography fontWeight={600}>{translateAction(item.action)}</Typography>
            <Typography color="text.secondary" variant="body2">
              Recomendado {item.occurrences} vez(es) na janela atual.
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

function RecentHighRiskRunsTable({ items, onOpenRun }: { items: RecentRiskRun[]; onOpenRun: (runId: string) => void }) {
  if (!items.length) {
    return <Typography color="text.secondary">Nenhum caso critico encontrado na janela selecionada.</Typography>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Caso</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Nota</TableCell>
          <TableCell>Criado em</TableCell>
          <TableCell align="right">Abrir</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.run_id} hover>
            <TableCell>
              <Stack spacing={0.25}>
                <Typography fontWeight={700}>{item.scenario_id}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {formatRegion(item.region)} | {formatOperation(item.operation_type)}
                </Typography>
              </Stack>
            </TableCell>
            <TableCell>
              <Stack direction="row" spacing={1} alignItems="center">
                <StatusChip value={item.status} />
                <StatusChip value={item.risk_level} />
              </Stack>
            </TableCell>
            <TableCell align="right">{item.risk_score.toFixed(1)}</TableCell>
            <TableCell>{new Date(item.created_at).toLocaleString("pt-BR")}</TableCell>
            <TableCell align="right">
              <Button onClick={() => onOpenRun(item.run_id)} size="small" variant="contained">
                Ver caso
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
