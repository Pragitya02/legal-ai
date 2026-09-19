import { createBrowserRouter } from 'react-router'

import AdminLogin from '../pages/AdminLogin'
import AdminDashboard from '../pages/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminAdvocates from '../pages/admin/AdminAdvocates'
import AdminUserDetail from '../pages/admin/AdminUserDetail'
import AdminAdvocateDetail from '../pages/admin/AdminAdvocateDetail'

import ManagementLogin from '../pages/ManagementLogin'
import ManagementDashboard from '../pages/ManagementDashboard'
import ManagementUsers from '../pages/management/ManagementUsers'
import ManagementAdvocates from '../pages/management/ManagementAdvocates'
import ManagementConsultations from '../pages/management/ManagementConsultations'
import ManagementReports from '../pages/management/ManagementReports'

import RootLayout from '../components/layout/RootLayout'
import DashboardLayout from '../components/layout/DashboardLayout'

import Landing from '../pages/Landing'
import Login from '../pages/Login'

import CitizenDashboard from '../pages/CitizenDashboard'
import AIAssistant from '../pages/AIAssistant'
import AdvocateListing from '../pages/AdvocateListing'
import Booking from '../pages/Booking'
import Meetings from '../pages/Meetings'
import YourBookings from '../pages/YourBookings'
import Meeting from '../pages/Meeting'

import Profile from '../pages/Profile'
import Cases from '../pages/Cases'
import NewCase from '../pages/NewCase'
import CaseWorkspace from '../pages/CaseWorkspace'
import Documents from '../pages/Documents'
import Notifications from '../pages/Notifications'
import Settings from '../pages/Settings'

import AdvocateDashboard from '../pages/AdvocateDashboard'
import AdvocateAppointments from '../pages/advocate/Appointments'
import AdvocateClients from '../pages/advocate/Clients'
import AdvocateConsultationRequests from '../pages/advocate/ConsultationRequests'
import AdvocateAvailability from '../pages/advocate/Availability'
import AdvocateMeetings from '../pages/advocate/Meetings'
import AIResearch from '../pages/AIResearch'
import AdvocateEarnings from '../pages/advocate/Earnings'
import AdvocateAnalytics from '../pages/advocate/Analytics'

import Feedback from '../pages/Feedback'

import NotFound from '../pages/NotFound'

export const router = createBrowserRouter([
  // =====================================================
  // PUBLIC / ROOT
  // =====================================================

  {
    Component: RootLayout,

    children: [
      {
        index: true,
        Component: Landing,
      },

      {
        path: 'login',
        Component: Login,
      },

      {
        path: 'advocate-login',
        Component: Login,
      },

      {
        path: 'signup',
        Component: Login,
      },
    ],
  },

  // =====================================================
  // CITIZEN
  // =====================================================

  {
    path: 'dashboard',
    Component: DashboardLayout,

    children: [
      {
        index: true,
        Component: CitizenDashboard,
      },

      {
        path: 'ai-assistant',
        Component: AIAssistant,
      },

      {
        path: 'advocates',
        Component: AdvocateListing,
      },

      {
        path: 'booking',
        Component: Booking,
      },

      {
        path: 'meetings',
        Component: Meetings,
      },

      {
        path: 'profile',
        Component: Profile,
      },

      {
        path: 'cases',
        Component: Cases,
      },

      {
        path: 'cases/:caseId',
        Component: CaseWorkspace,
      },

      {
        path: 'new-case',
        Component: NewCase,
      },

      {
        path: 'documents',
        Component: Documents,
      },

      {
        path: 'bookings',
        Component: YourBookings,
      },

      {
        path: 'notifications',
        Component: Notifications,
      },

      {
        path: 'settings',
        Component: Settings,
      },
    ],
  },

  // =====================================================
  // ADVOCATE
  // =====================================================

  {
    path: 'advocate',
    Component: DashboardLayout,

    children: [
      {
        index: true,
        Component: AdvocateDashboard,
      },

      {
        path: 'appointments',
        Component: AdvocateAppointments,
      },

      {
        path: 'clients',
        Component: AdvocateClients,
      },

      {
        path: 'consultation-requests',
        Component: AdvocateConsultationRequests,
      },

      {
        path: 'availability',
        Component: AdvocateAvailability,
      },

      {
        path: 'meetings',
        Component: AdvocateMeetings,
      },

      {
        path: 'ai-research',
        Component: AIResearch,
      },

      {
        path: 'profile',
        Component: Profile,
      },

      {
        path: 'documents',
        Component: Documents,
      },

      {
        path: 'earnings',
        Component: AdvocateEarnings,
      },

      {
        path: 'analytics',
        Component: AdvocateAnalytics,
      },

      {
        path: 'settings',
        Component: Settings,
      },

      {
        path: 'notifications',
        Component: Notifications,
      },
    ],
  },

  // =====================================================
  // VIDEO CONSULTATION
  // =====================================================

  {
    path: 'meeting/:appointmentId',
    Component: Meeting,
  },

  // =====================================================
  // MANDATORY MEETING FEEDBACK
  // =====================================================

  {
    path: 'feedback',
    Component: Feedback,
  },

  // =====================================================
  // ADMINISTRATOR PORTAL
  // =====================================================

  {
    path: 'adminlogin',
    Component: AdminLogin,
  },

  {
    path: 'admin',
    Component: AdminDashboard,
  },

  {
    path: 'admin/dashboard',
    Component: AdminDashboard,
  },

  // =====================================================
  // ADMIN USERS
  // =====================================================

  {
    path: 'admin/users',
    Component: AdminUsers,
  },

  {
    path: 'admin/users/:userId',
    Component: AdminUserDetail,
  },

  // =====================================================
  // ADMIN ADVOCATES
  // =====================================================

  {
    path: 'admin/advocates',
    Component: AdminAdvocates,
  },

  {
    path: 'admin/advocates/:advocateId',
    Component: AdminAdvocateDetail,
  },

  // =====================================================
  // MANAGEMENT
  // =====================================================

  {
    path: 'managementlogin',
    Component: ManagementLogin,
  },

  {
    path: 'management',
    Component: ManagementDashboard,
  },

  {
    path: 'management/users',
    Component: ManagementUsers,
  },

  {
    path: 'management/advocates',
    Component: ManagementAdvocates,
  },

  {
    path: 'management/consultations',
    Component: ManagementConsultations,
  },

  {
    path: 'management/reports',
    Component: ManagementReports,
  },

  // =====================================================
  // 404
  // =====================================================

  {
    path: '*',
    Component: NotFound,
  },
])