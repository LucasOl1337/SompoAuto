import { useMemo, useState } from "react";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { submitScenario } from "../api/client";
import { SectionCard } from "../components/SectionCard";
import { formatBrlRange, getTestProfileByPreset } from "../utils/presentation";

type Props = {
  onCreated: (runId: string) => void;
};

const presets = {
  low: {
    scenario_id: "demo-low-risk",
    equipment_id: "tractor-14",
    region: "mt-north",
    operation_type: "field_operation",
    telemetry_payload: {
      temperature: 52,
      vibration: 35,
      speed: 24,
      obstacle_density: 20,
      proximity_water: 18,
      load_factor: 45,
    },
    scenario_metadata: { preset: "low" },
    timestamp: "2026-03-24T09:00:00Z",
  },
  high: {
    scenario_id: "demo-high-risk",
    equipment_id: "harvester-91",
    region: "go-south",
    operation_type: "transport",
    telemetry_payload: {
      temperature: 94,
      vibration: 78,
      speed: 53,
      obstacle_density: 74,
      proximity_water: 64,
      load_factor: 88,
    },
    scenario_metadata: { preset: "high" },
    timestamp: "2026-03-24T09:00:00Z",
  },
};

const presetExplanations = {
  low: "Cenario mais estavel, usado para validar operacao em condicao segura.",
  high: "Cenario com sinais fortes de risco, usado para simular caso critico.",
};

export function ScenarioUploadPage({ onCreated }: Props) {
  const [preset, setPreset] = useState<"low" | "high">("low");
  const [jsonText, setJsonText] = useState(JSON.stringify(presets.low, null, 2));
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeholder = useMemo(() => JSON.stringify(presets[preset], null, 2), [preset]);
  const profile = useMemo(() => getTestProfileByPreset(preset), [preset]);

  const handlePresetChange = (value: "low" | "high") => {
    setPreset(value);
    setJsonText(JSON.stringify(presets[value], null, 2));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setStatus("Enviando caso para analise...");
    try {
      const created = await submitScenario(JSON.parse(jsonText), files);
      setStatus(`Caso criado com sucesso. ID: ${created.run_id}`);
      onCreated(created.run_id);
    } catch (error) {
      setStatus(error instanceof Error ? `Falha ao criar caso: ${error.message}` : "Falha ao criar caso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <SectionCard title="Criar novo teste" subtitle="Antes de enviar, confira abaixo qual objetivo este teste vai validar.">
        <Stack spacing={2}>
          <Alert severity="info">
            Se o ambiente estiver vazio, o sistema cria automaticamente um portfolio demo inicial para facilitar a navegacao.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Tipo de cenario"
                value={preset}
                onChange={(event) => handlePresetChange(event.target.value as "low" | "high")}
              >
                <MenuItem value="low">Cenario de baixo risco</MenuItem>
                <MenuItem value="high">Cenario de alto risco</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ borderRadius: 2.5, height: "100%" }}>
                <CardContent sx={{ p: "16px !important" }}>
                  <Typography fontWeight={700}>Resumo do tipo de teste</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {presetExplanations[preset]}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </SectionCard>

      <SectionCard title="Objetivo do teste selecionado" subtitle="Esta secao explica exatamente por que este teste existe e como interpretar o resultado.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>{profile.title}</Typography>
                <Typography sx={{ mt: 1 }} color="text.secondary" variant="body2">
                  {profile.goal}
                </Typography>
                <Typography sx={{ mt: 1.5 }} fontWeight={700}>
                  Por que estamos rodando este teste?
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {profile.why}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%", background: "#f8fbff" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>O que o sistema vai verificar</Typography>
                <Stack sx={{ mt: 1 }} spacing={0.5}>
                  {profile.checks.map((check) => (
                    <Typography key={check} color="text.secondary" variant="body2">
                      - {check}
                    </Typography>
                  ))}
                </Stack>
                <Typography sx={{ mt: 1.5 }} fontWeight={700}>
                  Resultado esperado
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {profile.expectedOutcome}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Contexto SOMPO Agro Brasil" subtitle="Aqui mostramos o impacto economico do teste para prevencao de perdas no campo.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>Risco que queremos prevenir</Typography>
                <Typography color="text.secondary" variant="body2">
                  {profile.riskFocus}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%", background: "#fffaf0" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>Faixa de perda evitavel</Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  {formatBrlRange(profile.lossRangeBrl)}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Estimativa por evento, considerando operacao agronomica brasileira.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2.5, height: "100%" }}>
              <CardContent sx={{ p: "16px !important" }}>
                <Typography fontWeight={700}>Meta de otimizacao</Typography>
                <Typography color="text.secondary" variant="body2">
                  {profile.optimizationGoal}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        title="Dados do teste"
        subtitle="Voce pode editar os valores para montar um caso mais proximo da sua realidade."
      >
        <Stack spacing={2}>
          <TextField
            label="JSON do cenario"
            minRows={16}
            multiline
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            helperText="Este bloco define os parametros que serao analisados."
          />

          <Button component="label" variant="outlined">
            Anexar imagem ou arquivo (opcional)
            <input hidden multiple type="file" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
          </Button>

          <Typography color="text.secondary" variant="body2">
            {files.length
              ? `${files.length} arquivo(s) selecionado(s).`
              : "Sem anexos. Com anexo, o sistema adiciona avaliacao visual ao teste."}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Rodar teste"}
            </Button>
            <Button onClick={() => setJsonText(placeholder)} variant="text" disabled={isSubmitting}>
              Restaurar valores do preset
            </Button>
          </Stack>

          {status ? (
            <Alert severity={status.startsWith("Falha") ? "error" : "success"}>{status}</Alert>
          ) : null}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
