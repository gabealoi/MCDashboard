// app/dashboard/RestartButton.tsx (Client Component)
"use client";

import Button from "@mui/material/Button";
import { useSession } from "next-auth/react";

export default function RestartButton() {
  const { data: session } = useSession();

  const handleRestart = async () => {
    if (!session) {
      alert("You need to be logged in.");
      return;
    }

    const res = await fetch("/api/server/restart", {
      method: "POST",
    });

    if (res.ok) {
      alert("Server is restarting!");
    } else {
      alert("Failed to restart server. Check console/logs.");
    }
  };

  return (
    <Button variant="contained" color="secondary" onClick={handleRestart}>
      Restart Minecraft Server
    </Button>
  );
}
