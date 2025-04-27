"use client"

import Link from "next/link"
import { Box, Typography, Button, Container, Paper } from "@mui/material"

// Define the user type to match what's coming from the session
interface UserType {
  id?: string | undefined
  name?: string | null | undefined
  email?: string | null | undefined
  image?: string | null | undefined
}

interface HomePageProps {
  user: UserType
}

export default function HomePage({ user }: HomePageProps) {
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome, {user?.name || "User"}!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            You are logged in as {user?.email || "your account"}
          </Typography>
          <Button variant="contained" color="primary" component={Link} href="/dashboard" sx={{ mt: 2 }}>
            Go to Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
