"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button, Container, Paper, Typography, Box, CircularProgress } from "@mui/material"
import GoogleIcon from "@mui/icons-material/Google"

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await signIn("google", { callbackUrl: "/" })
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Minecraft Server Manager
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" paragraph>
            Sign in to access the server control panel
          </Typography>
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={!isLoading && <GoogleIcon />}
              onClick={handleGoogleLogin}
              disabled={isLoading}
              size="large"
              sx={{ py: 1.5, px: 3 }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : "Sign in with Google"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}
