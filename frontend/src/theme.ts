import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#7C6FF2", light: "#A69CF8", dark: "#5B4FD1" },
    secondary: { main: "#E889B8", light: "#F4B7D3", dark: "#C95F94" },
    background: { default: "#F8F7FC", paper: "#FFFFFF" },
    success: { main: "#55B889" },
    warning: { main: "#E8A84E" },
    error: { main: "#D86D7D" },
    info: { main: "#69A9D8" },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, paddingInline: 18, minHeight: 42 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: "1px solid #ECEAF5", boxShadow: "0 10px 30px rgba(70, 58, 120, 0.06)" },
      },
    },
  },
});

export default theme;
