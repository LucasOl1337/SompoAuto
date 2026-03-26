import { useEffect, useState } from "react";

import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";
import Typography from "@mui/material/Typography";

import { fetchRuns } from "../api/client";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";
import type { RunListItem } from "../types/api";
import {
  formatBrlRange,
  formatOperation,
  formatRegion,
  formatRuntime,
  getScenarioVisual,
  getMidpoint,
  getTestProfileForScenarioId,
} from "../utils/presentation";

type Props = {
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
};

export function RunsPage({ selectedRunId, onSelectRun }: Props) {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tick = async () => {
      const data = await fetchRuns();
      setRuns(data);
      setIsLoading(false);
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => window.clearInterval(id);
  }, []);

  const completedRuns = runs.filter((run) => run.status === "completed").length;
  const runningRuns = runs.filter((run) => run.status === "running" || run.status === "queued").length;
  const attachmentRuns = runs.filter((run) => run.has_attachments).length;
  const monitoredExposure = runs.reduce((sum, run) => sum + getMidpoint(getTestProfileForScenarioId(run.scenario_id).lossRangeBrl), 0);

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard title="Casos analisados" value={String(runs.length)} caption="Total de testes visiveis no sistema." />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard
            title="Ja concluidos"
            value={String(completedRuns)}
            caption="Casos que ja terminaram e possuem algum resultado."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard
            title="Em andamento ou na fila"
            value={String(runningRuns)}
            caption={`${attachmentRuns} caso(s) com imagem ou anexo complementar.`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard
            title="Perda potencial monitorada"
            value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(monitoredExposure)}
            caption="Estimativa de exposicao financeira total dos casos visiveis."
          />
        </Grid>
      </Grid>

      <SectionCard title="Lista de casos" subtitle="Cada linha mostra o teste, o risco que ele busca prevenir e a faixa de perda financeira evitavel.">
        <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell>Caso</TableCell>
              <TableCell>Tipo de teste</TableCell>
              <TableCell>Risco prevenido e impacto</TableCell>
              <TableCell>Contexto visual</TableCell>
              <TableCell>Equipamento</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Modo</TableCell>
              <TableCell>Criado em</TableCell>
              <TableCell align="right">Ver detalhes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography color="text.secondary" variant="body2">
                    Carregando casos e preparando a demonstracao inicial...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography color="text.secondary" variant="body2">
                    Ainda nao ha casos visiveis. Se o ambiente acabou de subir, o portfolio demo esta sendo preparado.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {runs.map((run) => {
              const profile = getTestProfileForScenarioId(run.scenario_id);
              const visual = getScenarioVisual(run.scenario_id);
              return (
                <TableRow hover key={run.id} selected={run.id === selectedRunId}>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={700}>{run.scenario_id}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {formatRegion(run.region)} | {formatOperation(run.operation_type)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={700}>{profile.title}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {profile.goal}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={700}>{profile.riskFocus}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      Perda evitavel estimada: {formatBrlRange(profile.lossRangeBrl)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.75}>
                    <Box
                      component="img"
                      src={visual.src}
                      alt={visual.alt}
                      sx={{
                        width: 140,
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 1.5,
                        border: "1px solid #d6dde8",
                      }}
                    />
                    <Typography color="text.secondary" variant="caption" sx={{ maxWidth: 180 }}>
                      {visual.caption}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>{run.equipment_id}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StatusChip value={run.status} />
                    {run.has_attachments ? <StatusChip value="simulated" /> : null}
                  </Stack>
                </TableCell>
                <TableCell>{formatRuntime(run.runtime_mode)}</TableCell>
                <TableCell>{new Date(run.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell align="right">
                  <Button onClick={() => onSelectRun(run.id)} size="small" variant="contained">
                    Abrir caso
                  </Button>
                </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </TableContainer>
      </SectionCard>
    </Stack>
  );
}

function SummaryCard({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <Card sx={{ height: "100%", borderRadius: 2.5 }}>
      <CardContent sx={{ p: "20px !important" }}>
        <Stack spacing={1}>
          <Typography color="text.secondary" sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
            {title}
          </Typography>
          <Typography variant="h3" sx={{ color: "#0f4c81" }}>
            {value}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {caption}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
