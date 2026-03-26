import { useEffect, useState } from "react";

import type { SvgIconComponent } from "@mui/icons-material";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import { fetchHealth } from "./api/client";
import intentDetail from "./assets/intent-detail.svg";
import intentNewTest from "./assets/intent-new-test.svg";
import intentOverview from "./assets/intent-overview.svg";
import intentReport from "./assets/intent-report.svg";
import intentRuns from "./assets/intent-runs.svg";
import { HourlyReportsPage } from "./pages/HourlyReportsPage";
import { PortfolioOverviewPage } from "./pages/PortfolioOverviewPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { RunsPage } from "./pages/RunsPage";
import { ScenarioUploadPage } from "./pages/ScenarioUploadPage";
import type { Health } from "./types/api";
import { formatRuntime, getSOMPOBusinessContextLine } from "./utils/presentation";

const SOMPO_NAVY = "#0f4c81";
const SOMPO_ORANGE = "#e8511a";
const SIDEBAR_WIDTH = 248;

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: SOMPO_NAVY, light: "#1a6ab5", dark: "#0a3460" },
    secondary: { main: SOMPO_ORANGE },
    background: { default: "#f0f4f9", paper: "#ffffff" },
    text: { primary: "#111827", secondary: "#6b7280" },
    divider: "#e5eaf2",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    h3: { fontWeight: 700, letterSpacing: "-0.5px" },
    h5: { fontWeight: 700, letterSpacing: "-0.3px" },
    h6: { fontWeight: 600, letterSpacing: "-0.2px" },
    body2: { fontSize: "0.8125rem" },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(15,76,129,0.06), 0 1px 2px rgba(15,76,129,0.04)",
          border: "1px solid #e5eaf2",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-root": {
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#6b7280",
            backgroundColor: "#f8fafd",
            borderBottom: "1px solid #e5eaf2",
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: 0 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: "0.7rem" },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, height: 6 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8 },
        containedPrimary: {
          background: `linear-gradient(135deg, ${SOMPO_NAVY} 0%, #1a6ab5 100%)`,
          boxShadow: "0 2px 6px rgba(15,76,129,0.3)",
          "&:hover": {
            background: `linear-gradient(135deg, #0a3460 0%, ${SOMPO_NAVY} 100%)`,
          },
        },
      },
    },
  },
});

type NavItem = {
  label: string;
  Icon: SvgIconComponent;
  tab: number;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Casos analisados", Icon: FormatListBulletedIcon, tab: 0 },
  { label: "Detalhe do caso", Icon: AssessmentOutlinedIcon, tab: 1 },
  { label: "Novo teste", Icon: CloudUploadOutlinedIcon, tab: 2 },
  { label: "Visao geral", Icon: DashboardOutlinedIcon, tab: 3 },
  { label: "Relatorio horario", Icon: ScheduleIcon, tab: 4 },
];

function Sidebar({ tab, onTab, health }: { tab: number; onTab: (t: number) => void; health: Health | null }) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          background: SOMPO_NAVY,
          color: "#fff",
          borderRight: "none",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Toolbar sx={{ px: 2.5, minHeight: "72px !important" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldOutlinedIcon sx={{ color: "#fff", fontSize: 22 }} />
          </Box>
          <div>
            <Typography variant="h6" sx={{ color: "#fff", lineHeight: 1.1, fontSize: "1rem" }}>
              SOMPO
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.68rem", letterSpacing: "0.08em" }}>
              MONITOR DE RISCO
            </Typography>
          </div>
        </Stack>
      </Toolbar>

      <Box sx={{ px: 1.5, mb: 1 }}>
        <Typography
          sx={{
            color: "rgba(255,255,255,0.35)",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            px: 1,
            mb: 0.5,
          }}
        >
          Navegacao
        </Typography>
      </Box>

      <List disablePadding sx={{ px: 1.5, flex: 1 }}>
        {NAV_ITEMS.map(({ label, Icon, tab: itemTab }) => {
          const active = tab === itemTab;
          return (
            <ListItemButton
              key={label}
              onClick={() => onTab(itemTab)}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                px: 1.5,
                py: 1,
                color: active ? "#fff" : "rgba(255,255,255,0.6)",
                background: active ? "rgba(255,255,255,0.12)" : "transparent",
                "&:hover": { background: "rgba(255,255,255,0.08)", color: "#fff" },
                "&.Mui-selected": {
                  background: "rgba(255,255,255,0.14)",
                  borderLeft: `3px solid ${SOMPO_ORANGE}`,
                  pl: "calc(12px - 3px)",
                },
                "&.Mui-selected:hover": { background: "rgba(255,255,255,0.18)" },
                transition: "all 0.15s",
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Stack spacing={0.75}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FiberManualRecordIcon
              sx={{
                fontSize: 8,
                color: health ? "#4ade80" : "#facc15",
              }}
            />
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.7rem" }}>
              {health ? "Sistema conectado" : "Conectando..."}
            </Typography>
          </Stack>
          {health && (
            <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem" }}>
              {formatRuntime(health.openclaw_runtime)} | {formatRuntime(health.openclaw_mode)}
            </Typography>
          )}
        </Stack>
      </Box>
    </Drawer>
  );
}

const PAGE_TITLES: Record<number, { title: string; subtitle: string }> = {
  0: { title: "Casos analisados", subtitle: "Veja todos os testes que o sistema executou e o estado atual de cada um." },
  1: { title: "Detalhe do caso", subtitle: "Entenda o que foi testado, o que chamou atencao e qual foi o resultado." },
  2: { title: "Novo teste", subtitle: "Envie um novo cenario com contexto claro para a analise." },
  3: { title: "Visao geral do risco", subtitle: "Acompanhe os riscos mais importantes da operacao em um unico painel." },
  4: { title: "Relatorio horario", subtitle: "Resumo consolidado para leitura rapida e tomada de decisao." },
};

const PAGE_INTENT: Record<number, { image: string; message: string }> = {
  0: {
    image: intentRuns,
    message: "Objetivo desta etapa: encontrar rapidamente quais casos merecem analise detalhada.",
  },
  1: {
    image: intentDetail,
    message: "Objetivo desta etapa: explicar o teste, os criterios usados e a causa do resultado.",
  },
  2: {
    image: intentNewTest,
    message: "Objetivo desta etapa: criar um teste com intencao clara e parametros que representem o contexto real.",
  },
  3: {
    image: intentOverview,
    message: "Objetivo desta etapa: entender tendencias de risco e priorizar foco operacional.",
  },
  4: {
    image: intentReport,
    message: "Objetivo desta etapa: gerar um resumo executivo para tomada de decisao rapida.",
  },
};

function PageHeader({ tab, health }: { tab: number; health: Health | null }) {
  const info = PAGE_TITLES[tab] ?? PAGE_TITLES[0];
  return (
    <Box
      sx={{
        height: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 4,
        background: "#fff",
        borderBottom: "1px solid #e5eaf2",
        flexShrink: 0,
      }}
    >
      <Stack spacing={0.25}>
        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
          {info.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {info.subtitle}
        </Typography>
      </Stack>
      {health && (
        <Chip
          size="small"
          label={`${formatRuntime(health.openclaw_runtime)} | ${formatRuntime(health.openclaw_mode)}`}
          variant="outlined"
          sx={{ fontSize: "0.7rem", color: "text.secondary", borderColor: "#e5eaf2" }}
        />
      )}
    </Box>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const intentInfo = PAGE_INTENT[tab] ?? PAGE_INTENT[0];

  useEffect(() => {
    void fetchHealth().then(setHealth);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar tab={tab} onTab={setTab} health={health} />

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <PageHeader tab={tab} health={health} />

          <Box sx={{ flex: 1, overflow: "auto", background: "#f0f4f9" }}>
            <Container maxWidth="xl" sx={{ py: 4 }}>
              <Box
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid #e5eaf2",
                  background: "#fff",
                  p: 1.25,
                  mb: 3,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "280px 1fr" },
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <Box
                  component="img"
                  src={intentInfo.image}
                  alt="Imagem de contexto da etapa atual"
                  sx={{
                    width: "100%",
                    height: { xs: 120, md: 95 },
                    objectFit: "cover",
                    borderRadius: 2,
                    border: "1px solid #e5eaf2",
                  }}
                />
                <Typography sx={{ fontWeight: 600, color: "#20476e" }}>{intentInfo.message}</Typography>
              </Box>
              <Box
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid #dbeafe",
                  background: "linear-gradient(135deg, #f0f7ff 0%, #f8fbff 100%)",
                  px: 2,
                  py: 1.5,
                  mb: 3,
                }}
              >
                <Typography sx={{ fontWeight: 700, color: "#163f67", mb: 0.5 }}>Contexto de negocio</Typography>
                <Typography color="text.secondary" variant="body2">
                  {getSOMPOBusinessContextLine()}
                </Typography>
              </Box>
              {tab === 0 ? (
                <RunsPage
                  selectedRunId={selectedRunId}
                  onSelectRun={(runId) => {
                    setSelectedRunId(runId);
                    setTab(1);
                  }}
                />
              ) : null}
              {tab === 1 ? <RunDetailPage runId={selectedRunId} /> : null}
              {tab === 2 ? (
                <ScenarioUploadPage
                  onCreated={(runId) => {
                    setSelectedRunId(runId);
                    setTab(1);
                  }}
                />
              ) : null}
              {tab === 3 ? (
                <PortfolioOverviewPage
                  onOpenHourlyReports={() => setTab(4)}
                  onOpenRun={(runId) => {
                    setSelectedRunId(runId);
                    setTab(1);
                  }}
                />
              ) : null}
              {tab === 4 ? <HourlyReportsPage /> : null}
            </Container>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
