import { useEffect, useState } from "react";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { fetchLatestHourlyReport, generateHourlyReport } from "../api/client";
import { SectionCard } from "../components/SectionCard";
import type { Report } from "../types/api";
import { translateAction } from "../utils/presentation";

export function HourlyReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetchLatestHourlyReport()
      .then((latest) => {
        if (!cancelled) {
          setReport(latest.report);
          setError("");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Falha ao carregar relatorio.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const created = await generateHourlyReport();
      setReport(created.report);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Falha ao gerar relatorio.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Relatorio horario simplificado"
        subtitle="Consolidado rapido para entender o que aconteceu recentemente e qual deve ser o proximo foco."
      >
        <Stack spacing={2}>
          <Button onClick={handleGenerate} variant="contained" disabled={isGenerating}>
            {isGenerating ? "Gerando relatorio..." : "Gerar novo relatorio horario"}
          </Button>
          <Typography color="text.secondary" variant="body2">
            O relatorio resume os casos mais recentes e transforma sinais tecnicos em orientacoes de facil leitura.
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {isLoading ? <Alert severity="info">Carregando ultimo relatorio...</Alert> : null}
        </Stack>
      </SectionCard>

      {report ? (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatCard
                title="Casos no relatorio"
                value={String(report.runs_analyzed)}
                caption="Quantidade de casos considerados nesta leitura."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatCard
                title="Gerado em"
                value={new Date(report.created_at).toLocaleTimeString("pt-BR")}
                caption={new Date(report.created_at).toLocaleDateString("pt-BR")}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatCard
                title="Tipo"
                value="Consolidado"
                caption="Resumo automatico das ultimas execucoes."
              />
            </Grid>
          </Grid>

          <SectionCard title={report.title} subtitle="Mensagem principal do sistema para leitura rapida da operacao.">
            <Typography>{translateAction(report.content)}</Typography>
          </SectionCard>

          <SectionCard title="Acoes recomendadas" subtitle="Lista curta de prioridades que podem reduzir risco no proximo ciclo.">
            {report.suggested_actions.length ? (
              <Stack spacing={1}>
                {report.suggested_actions.map((action) => (
                  <Card key={action} sx={{ borderRadius: 2.5, background: "#fffaf0" }}>
                    <CardContent sx={{ p: "16px !important" }}>
                      <Typography>{translateAction(action)}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Sem acoes recomendadas no momento.</Typography>
            )}
          </SectionCard>
        </Stack>
      ) : (
        <SectionCard
          title="Sem relatorio ainda"
          subtitle="Assim que houver casos suficientes, o sistema vai preencher esta tela automaticamente."
        >
          <Typography color="text.secondary">
            Se o ambiente acabou de subir, aguarde a criacao dos primeiros casos demo ou clique em gerar relatorio.
          </Typography>
        </SectionCard>
      )}
    </Stack>
  );
}

function StatCard({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <Card sx={{ borderRadius: 2.5, height: "100%" }}>
      <CardContent sx={{ p: "20px !important" }}>
        <Stack spacing={1}>
          <Typography color="text.secondary" sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ color: "#0f4c81" }}>
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
