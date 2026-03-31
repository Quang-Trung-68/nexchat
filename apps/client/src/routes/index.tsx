import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ChatPage } from '@/features/chat/pages/ChatPage'
import { ContactsLayout } from '@/features/contacts/pages/ContactsLayout'
import { ContactsFriendsPage } from '@/features/contacts/pages/ContactsFriendsPage'
import { ContactsGroupsPage } from '@/features/contacts/pages/ContactsGroupsPage'
import { ContactsRequestsPage } from '@/features/contacts/pages/ContactsRequestsPage'
import { ContactsGroupInvitesPage } from '@/features/contacts/pages/ContactsGroupInvitesPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/" element={<Navigate to="/chat" replace />} />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:conversationId"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <ContactsLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="friends" replace />} />
        <Route path="friends" element={<ContactsFriendsPage />} />
        <Route path="groups" element={<ContactsGroupsPage />} />
        <Route path="requests" element={<ContactsRequestsPage />} />
        <Route path="group-invites" element={<ContactsGroupInvitesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
