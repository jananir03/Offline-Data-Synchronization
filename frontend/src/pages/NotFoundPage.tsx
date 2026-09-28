import { Button, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: "70vh" }}><Typography variant="h3">404</Typography><Typography color="text.secondary">This page does not exist.</Typography><Button component={Link} to="/dashboard" variant="contained">Go to dashboard</Button></Stack>;
}
