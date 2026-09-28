import { useState } from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  AdminPanelSettingsRounded,
  DashboardRounded,
  DescriptionRounded,
  HistoryRounded,
  LogoutRounded,
  MenuRounded,
  PersonRounded,
  SyncRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";

import { useAuth } from "../../context/AuthContext";

const drawerWidth = 238;

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const navigation = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <DashboardRounded />,
    },
    {
      label: "Records",
      path: "/records",
      icon: <DescriptionRounded />,
    },
    {
      label: "Sync History",
      path: "/sync-history",
      icon: <HistoryRounded />,
    },
    {
      label: "Conflicts",
      path: "/conflicts",
      icon: <WarningAmberRounded />,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: <PersonRounded />,
    },
  ];

  if (user?.role === "ADMIN") {
    navigation.push({
      label: "Audit Logs",
      path: "/audit-logs",
      icon: <AdminPanelSettingsRounded />,
    });
  }

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, #FBFAFF 0%, #F5F2FF 100%)",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, #7C6FF2, #E889B8)",
              color: "white",
            }}
          >
            <SyncRounded />
          </Box>

          <Box>
            <Typography
              fontWeight={800}
              color="#302B4D"
            >
              Offline Sync
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
            >
              Data synchronization
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      <List
        sx={{
          px: 1.2,
          py: 2,
          flex: 1,
        }}
      >
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
            onClick={() =>
              setMobileOpen(false)
            }
          >
            {({ isActive }) => (
              <ListItemButton
                selected={isActive}
                sx={{
                  borderRadius: 3,
                  mb: 0.7,
                  minHeight: 48,

                  "&.Mui-selected": {
                    background:
                      "linear-gradient(90deg, rgba(124,111,242,.15), rgba(232,137,184,.10))",
                    color: "#5B4FD1",
                  },

                  "&.Mui-selected .MuiListItemIcon-root":
                    {
                      color: "#6D60DD",
                    },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 42,
                    color: "#8C879F",
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive
                      ? 700
                      : 500,
                  }}
                />
              </ListItemButton>
            )}
          </NavLink>
        ))}
      </List>

      <Box sx={{ p: 1.5 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 3,
            backgroundColor:
              "rgba(255,255,255,.75)",
            border:
              "1px solid #EAE7F5",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "#E8DFFF",
                color: "#5B4FD1",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {user?.username
                ?.slice(0, 1)
                .toUpperCase()}
            </Avatar>

            <Box
              sx={{
                minWidth: 0,
                flex: 1,
              }}
            >
              <Typography
                fontSize={13}
                fontWeight={700}
                noWrap
              >
                {user?.username}
              </Typography>

              <Chip
                label={user?.role}
                size="small"
                sx={{
                  mt: 0.3,
                  height: 20,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            </Box>

            <Tooltip title="Profile">
              <IconButton
                size="small"
                onClick={() =>
                  navigate("/profile")
                }
              >
                <PersonRounded fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Logout">
              <IconButton
                size="small"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogoutRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor:
          "background.default",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: {
            md: "none",
          },
          backgroundColor:
            "rgba(255,255,255,.9)",
          color: "text.primary",
          backdropFilter:
            "blur(10px)",
          borderBottom:
            "1px solid #ECEAF5",
        }}
      >
        <Toolbar>
          <IconButton
            onClick={() =>
              setMobileOpen(true)
            }
          >
            <MenuRounded />
          </IconButton>

          <Typography
            fontWeight={800}
            sx={{ ml: 1 }}
          >
            Offline Sync
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: {
            md: drawerWidth,
          },
          flexShrink: {
            md: 0,
          },
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() =>
            setMobileOpen(false)
          }
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: {
              xs: "block",
              md: "none",
            },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: {
              xs: "none",
              md: "block",
            },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight:
                "1px solid #ECEAF5",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: {
            xs: 2,
            sm: 3.5,
          },
          pt: {
            xs: 9,
            md: 3.5,
          },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}