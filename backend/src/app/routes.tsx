import { createBrowserRouter } from 'react-router'
import RootLayout from '../components/layout/RootLayout'
import DashboardLayout from '../components/layout/DashboardLayout'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import CitizenDashboard from '../pages/CitizenDashboard'
import AIAssistant from '../pages/AIAssistant'
import AdvocateListing from '../pages/AdvocateListing'
import AdvocateDashboard from '../pages/AdvocateDashboard'
import AIResearch from '../pages/AIResearch'
import Booking from '../pages/Booking'
import Profile from '../pages/Profile'
import Cases from '../pages/Cases'
import Documents from '../pages/Documents'
import Notifications from '../pages/Notifications'

import Settings from '../pages/Settings'
import AdvocateAppointments from '../pages/advocate/Appointments'
import AdvocateClients from '../pages/advocate/Clients'
import AdvocateEarnings from '../pages/advocate/Earnings'
import AdvocateAnalytics from '../pages/advocate/Analytics'
import NotFound from '../pages/NotFound'

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { index: true, Component: Landing },
      { path: 'login', Component: Login },
      { path: 'advocate-login', Component: Login },
      { path: 'signup', Component: Login },
    ],
  },
  {
    path: 'dashboard',
    Component: DashboardLayout,
    children: [
      { index: true, Component: CitizenDashboard },
      { path: 'ai-assistant', Component: AIAssistant },
      { path: 'advocates', Component: AdvocateListing },
      { path: 'booking', Component: Booking },
      { path: 'profile', Component: Profile },
      { path: 'cases', Component: Cases },
      { path: 'documents', Component: Documents },
      { path: 'notifications', Component: Notifications },
      { path: 'settings', Component: Settings },
    ],
  },
  {
    path: 'advocate',
    Component: DashboardLayout,
    children: [
      { index: true, Component: AdvocateDashboard },
      { path: 'ai-research', Component: AIResearch },
      { path: 'profile', Component: Profile },
      { path: 'appointments', Component: AdvocateAppointments },
      { path: 'clients', Component: AdvocateClients },
      { path: 'documents', Component: Documents },
      { path: 'earnings', Component: AdvocateEarnings },
      { path: 'analytics', Component: AdvocateAnalytics },
      { path: 'settings', Component: Settings },
      { path: 'notifications', Component: Notifications },
    ],
  },
  { path: '*', Component: NotFound },
])
