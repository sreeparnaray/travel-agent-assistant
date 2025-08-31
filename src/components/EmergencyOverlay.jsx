// components/EmergencyOverlay.jsx
import { Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EmergencyMode from "./EmergencyMode";

export default function EmergencyOverlay({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      {/* Close button in top-right */}
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 16,
          top: 16,
          color: "#fff",
          background: "rgba(0,0,0,0.4)",
          "&:hover": { background: "rgba(0,0,0,0.6)" },
          zIndex: 2200,
        }}
      >
        <CloseIcon />
      </IconButton>

      {/* Emergency content */}
      <EmergencyMode />
    </Dialog>
  );
}
