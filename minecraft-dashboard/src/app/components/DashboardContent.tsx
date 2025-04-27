"use client"

import { useState } from "react"
import { Container, Typography, Paper, Box, Button, Card, CardContent, Alert, Snackbar } from "@mui/material"
import Grid from "@mui/material/Grid" // Import Grid explicitly
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import HomeIcon from "@mui/icons-material/Home"
import ListAltIcon from "@mui/icons-material/ListAlt"
import Link from "next/link"

// Define the user type to match what's coming from the session
interface UserType {
  id?: string | undefined
  name?: string | null | undefined
  email?: string | null | undefined
  image?: string | null | undefined
}

interface DashboardContentProps {
  user: UserType
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const [isRestarting, setIsRestarting] = useState(false)
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  })

  const handleRestart = async () => {
    setIsRestarting(true)

    try {
      const res = await fetch("/api/server/restart", {
        method: "POST",
      })

      if (res.ok) {
        setNotification({
          open: true,
          message: "Server restart initiated successfully!",
          severity: "success",
        })
      } else {
        const errorData = await res.text()
        throw new Error(errorData || "Failed to restart server")
      }
    } catch (error) {
      console.error("Restart error:", error)
      setNotification({
        open: true,
        message: `Error: ${error instanceof Error ? error.message : "Failed to restart server"}`,
        severity: "error",
      })
    } finally {
      setIsRestarting(false)
    }
  }

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h4" component="h1">
              Server Dashboard
            </Typography>
            <Button component={Link} href="/" startIcon={<HomeIcon />} variant="outlined">
              Home
            </Button>
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome, {user?.name || "User"}
          </Typography>
        </Paper>

        <Box sx={{ flexGrow: 1 }}>
          <Grid container spacing={3}>
            <Grid size={{xs:12, md:6}}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Server Controls
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Use the button below to restart your Minecraft server.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<RestartAltIcon />}
                    onClick={handleRestart}
                    disabled={isRestarting}
                    fullWidth
                  >
                    {isRestarting ? "Restarting..." : "Restart Minecraft Server"}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Server Logs
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    View the live server logs to monitor activity and troubleshoot issues.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    href="/logs"
                    startIcon={<ListAltIcon />}
                    fullWidth
                  >
                    View Server Logs
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}
