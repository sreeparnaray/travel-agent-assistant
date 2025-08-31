// chatcomponents/EmergencyButton.jsx
import { Fab } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";

export default function EmergencyButton({ onClick }) {
  return (
    <Fab
      color="error"
      aria-label="emergency"
      sx={{
        position: "fixed",
        bottom: 100, // 👈 a bit above chat button
        right: 35,
        zIndex: 2100,
      }}
      onClick={onClick}
    >
      <WarningIcon />
    </Fab>
  );
}
