import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Layout from "../components/Layout";
import FloatingChatButton from "../chatcomponents/FloatingChatButton";
import TravelNewsFeed from "../components/TravelNewsFeed";
import EmergencyButton from "../chatcomponents/EmergencyButton";
import EmergencyMode from "../components/EmergencyMode";
import EmergencyOverlay from "../components/EmergencyOverlay";
import { useState } from "react";

export default function DashboardPage() {

  const [emergencyOpen, setEmergencyOpen] = useState(false);


  return (
    <Box sx={{ display: "flex" }}>
      {/* <Sidebar /> */}
      <Layout />
      <Box sx={{ flexGrow: 1 }}>
        {/* <Topbar /> */}
        <Box sx={{ p: 0, mt: 0 }}>
          <Outlet />
        </Box>
        {/* <div className="grid grid-cols-3 gap-4">
      <TravelNewsFeed />
    </div> */}
      </Box>

      
      <EmergencyButton onClick={() => setEmergencyOpen(true)} />
      <FloatingChatButton /> 

      {/* 🚨 Emergency Mode Fullscreen */}
      <EmergencyOverlay
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
      />
    </Box>
  );
}
