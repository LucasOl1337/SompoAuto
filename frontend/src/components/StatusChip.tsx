import Chip from "@mui/material/Chip";

import { getStatusLabel, getStatusTone } from "../utils/presentation";

type Props = {
  value: string;
};

export function StatusChip({ value }: Props) {
  return <Chip size="small" label={getStatusLabel(value)} color={getStatusTone(value)} variant="outlined" />;
}
