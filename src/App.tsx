import { lazy, Suspense } from "react"
import { createBrowserRouter, Navigate } from "react-router"

import { Shell } from "@/core/components/shell"
import { PageLoader } from "@/core/components/page-loader"

const HubPage = lazy(() => import("@/modules/hub/HubPage"))
const AlertsPage = lazy(() => import("@/modules/alerts/AlertsPage"))
const InvestigatePage = lazy(() => import("@/modules/investigate/InvestigatePage"))
const RespondPage = lazy(() => import("@/modules/respond/RespondPage"))
const SettingsPage = lazy(() => import("@/modules/settings/SettingsPage"))

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <Lazy element={<HubPage />} /> },
      { path: "alerts", element: <Lazy element={<AlertsPage />} /> },
      { path: "investigate", element: <Lazy element={<InvestigatePage />} /> },
      { path: "investigate/:id", element: <Lazy element={<InvestigatePage />} /> },
      { path: "respond", element: <Lazy element={<RespondPage />} /> },
      { path: "settings", element: <Lazy element={<SettingsPage />} /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])

function Lazy({ element }: { element: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>
}
