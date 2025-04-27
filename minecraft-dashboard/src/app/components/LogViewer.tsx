"use client"

import { useState, useEffect, useRef } from "react"
import {
    Container,
    Typography,
    Paper,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material"
import HomeIcon from "@mui/icons-material/Home"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import RefreshIcon from "@mui/icons-material/Refresh"
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import DownloadIcon from "@mui/icons-material/Download"
import Link from "next/link"

export default function LogViewer() {
    const [logs, setLogs] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [connectionStatus, setConnectionStatus] = useState<string>("Connecting...")
    const [autoScroll, setAutoScroll] = useState(true)
    const [isDownloading, setIsDownloading] = useState(false)
    const logContainerRef = useRef<HTMLDivElement>(null)
    const eventSourceRef = useRef<EventSource | null>(null)

    // Function to connect to the log stream
    const connectToLogStream = () => {
        setIsLoading(true)
        setError(null)
        setConnectionStatus("Connecting to log stream...")

        // Close any existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close()
        }

        try {
            // Create a new EventSource connection
            console.log("Connecting to log stream...")
            const eventSource = new EventSource("/api/server/logs")
            eventSourceRef.current = eventSource

            // Handle incoming messages
            eventSource.onmessage = (event) => {
                setIsLoading(false)

                // Log the raw data for debugging
                console.log("Received event data:", event.data)

                if (!event.data || event.data.trim() === "") {
                    console.log("Received empty data")
                    return
                }

                // Check if the data is a system message
                if (event.data.includes("No log lines found") || event.data.includes("Error")) {
                    setError(event.data)
                    return
                }

                // Add the new log line to our state
                setLogs((prevLogs) => {
                    // Check if this log is already in our list
                    if (prevLogs.includes(event.data)) {
                        return prevLogs
                    }
                    return [...prevLogs, event.data]
                })

                setConnectionStatus("Connected - receiving logs")
            }

            // Handle connection open
            eventSource.onopen = () => {
                setIsLoading(false)
                setConnectionStatus("Connected to log stream")
                console.log("Log stream connection opened")
            }

            // Handle errors
            eventSource.onerror = (err) => {
                console.error("EventSource error:", err)
                setError("Connection to log stream failed. Please try refreshing.")
                setConnectionStatus("Disconnected - error occurred")
                setIsLoading(false)
                eventSource.close()
            }
        } catch (err) {
            console.error("Error setting up log stream:", err)
            setError(`Failed to connect to log stream: ${err instanceof Error ? err.message : "Unknown error"}`)
            setConnectionStatus("Failed to connect")
            setIsLoading(false)
        }
    }

    // Connect to the log stream when the component mounts
    useEffect(() => {
        connectToLogStream()

        // Clean up the connection when the component unmounts
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
            }
        }
    }, [])

    // Auto-scroll to the bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
    }, [logs, autoScroll])

    // Handle manual scroll to detect if user has scrolled up
    const handleScroll = () => {
        if (logContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current
            const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 10
            setAutoScroll(isScrolledToBottom)
        }
    }

    // Scroll to bottom manually
    const scrollToBottom = () => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
            setAutoScroll(true)
        }
    }

    // Refresh the logs
    const refreshLogs = () => {
        setLogs([])
        connectToLogStream()
    }

    // Download logs as a text file
    const downloadLogs = () => {
        if (logs.length === 0) {
            return
        }

        setIsDownloading(true)

        try {
            // Create a formatted string with all logs
            const logText = logs.join("\n")

            // Create a blob with the log text
            const blob = new Blob([logText], { type: "text/plain" })

            // Create a URL for the blob
            const url = URL.createObjectURL(blob)

            // Get current date and time for the filename
            const now = new Date()
            const dateStr = now.toISOString().replace(/[:.]/g, "-").replace("T", "_").split("Z")[0]
            const filename = `minecraft_logs_${dateStr}.log`

            // Create a temporary anchor element to trigger the download
            const a = document.createElement("a")
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()

            // Clean up
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            console.log("Logs downloaded successfully")
        } catch (error) {
            console.error("Error downloading logs:", error)
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Typography variant="h4" component="h1">
                            Server Logs
                        </Typography>
                        <Box>
                            <Button
                                component={Link}
                                href="/dashboard"
                                startIcon={<ArrowBackIcon />}
                                variant="outlined"
                                sx={{ mr: 1 }}
                            >
                                Dashboard
                            </Button>
                            <Button component={Link} href="/" startIcon={<HomeIcon />} variant="outlined">
                                Home
                            </Button>
                        </Box>
                    </Box>
                    <Typography variant="subtitle1" color="text.secondary">
                        Viewing filtered [Server thread/INFO] logs from the Minecraft server
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Status: {connectionStatus}
                    </Typography>
                </Paper>

                <Paper elevation={3} sx={{ p: 2, mb: 3, position: "relative" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                        <Typography variant="h6">Live Log Stream</Typography>
                        <Box>
                            <Tooltip title="Download logs">
                                <span>
                                    {" "}
                                    {/* Wrapper to handle disabled state with tooltip */}
                                    <IconButton onClick={downloadLogs} disabled={isDownloading || logs.length === 0} sx={{ mr: 1 }}>
                                        <DownloadIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Refresh logs">
                                <IconButton onClick={refreshLogs} disabled={isLoading} sx={{ mr: 1 }}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Scroll to bottom">
                                <IconButton onClick={scrollToBottom} disabled={autoScroll}>
                                    <VerticalAlignBottomIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {isLoading && logs.length === 0 && (
                        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {error && (
                        <Box sx={{ color: "error.main", my: 2, p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                            <Typography variant="body1">{error}</Typography>
                        </Box>
                    )}

                    <Box
                        ref={logContainerRef}
                        onScroll={handleScroll}
                        sx={{
                            height: "60vh",
                            overflowY: "auto",
                            bgcolor: "black",
                            color: "#00ff00",
                            p: 2,
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                        }}
                    >
                        {logs.length > 0 ? (
                            logs.map((log, index) => <div key={index}>{log}</div>)
                        ) : !isLoading ? (
                            <Typography color="#888" sx={{ p: 2 }}>
                                {error
                                    ? "No logs available due to an error."
                                    : "No logs available. The log file may be empty or not contain any [Server thread/INFO] lines."}
                            </Typography>
                        ) : null}
                    </Box>

                    {!autoScroll && logs.length > 0 && (
                        <Box
                            sx={{
                                position: "absolute",
                                bottom: 16,
                                right: 16,
                                zIndex: 10,
                            }}
                        >
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={scrollToBottom}
                                startIcon={<VerticalAlignBottomIcon />}
                            >
                                New logs
                            </Button>
                        </Box>
                    )}
                </Paper>

                {/* Collapsible Debug Information Section */}
                <Accordion elevation={3} sx={{ mb: 3 }}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="debug-info-content"
                        id="debug-info-header"
                        sx={{
                            bgcolor: "background.paper",
                            "&:hover": {
                                bgcolor: "action.hover",
                            },
                        }}
                    >
                        <Typography variant="h6">Debug Information</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            This information can help troubleshoot log display issues:
                        </Typography>
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: "background.default",
                                borderRadius: 1,
                                fontFamily: "monospace",
                                fontSize: "0.8rem",
                            }}
                        >
                            <div>Connection Status: {connectionStatus}</div>
                            <div>Logs Received: {logs.length}</div>
                            <div>Auto-scroll: {autoScroll ? "Enabled" : "Disabled"}</div>
                            <div>Error: {error || "None"}</div>
                            <div>LOG_FILE_PATH: {process.env.NEXT_PUBLIC_LOG_FILE_PATH || "Not set in client"}</div>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </Box>
        </Container>
    )
}
