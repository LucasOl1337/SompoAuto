import type { ReactNode } from "react";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: boolean;
};

export function SectionCard({ title, subtitle, children, accent = false }: Props) {
  return (
    <Card
      sx={{
        borderRadius: 2.5,
        overflow: "visible",
        position: "relative",
        ...(accent && {
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 12,
            bottom: 12,
            width: 3,
            borderRadius: "0 3px 3px 0",
            background: "linear-gradient(180deg, #0f4c81 0%, #1a6ab5 100%)",
          },
        }),
      }}
    >
      <CardContent sx={{ p: "20px !important" }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant="h6"
              sx={{ fontSize: "0.9375rem", fontWeight: 600, color: "#111827" }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ mt: 0.25, lineHeight: 1.5 }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}
