import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { VerifiedRoute } from '@/shared/components/VerifiedRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { SettingsLayout } from '@/features/settings/layout/SettingsLayout'
import { SettingsGeneralPage } from '@/features/settings/pages/SettingsGeneralPage'
import { SettingsAccountPage } from '@/features/settings/pages/SettingsAccountPage'
import { SettingsPasswordPage } from '@/features/settings/pages/SettingsPasswordPage'
import { ChatPage } from '@/features/chat/pages/ChatPage'
import { ContactsLayout } from '@/features/contacts/pages/ContactsLayout'
import { ContactsFriendsPage } from '@/features/contacts/pages/ContactsFriendsPage'
import { ContactsGroupsPage } from '@/features/contacts/pages/ContactsGroupsPage'
import { ContactsRequestsPage } from '@/features/contacts/pages/ContactsRequestsPage'
import { ContactsGroupInvitesPage } from '@/features/contacts/pages/ContactsGroupInvitesPage'
import { NewsfeedPage } from '@/features/newsfeed/pages/NewsfeedPage'
import { PostDetailPage } from '@/features/newsfeed/pages/PostDetailPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/verify-email"
        element={
          <ProtectedRoute>
            <VerifyEmailPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/chat" replace />} />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <VerifiedRoute>
              <ChatPage />
            </VerifiedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:conversationId"
        element={
          <ProtectedRoute>
            <VerifiedRoute>
              <ChatPage />
            </VerifiedRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <VerifiedRoute>
              <ProfilePage />
            </VerifiedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <VerifiedRoute>
              <SettingsLayout />
            </VerifiedRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="general" replace />} />
        <Route path="general" element={<SettingsGeneralPage />} />
        <Route path="account" element={<SettingsAccountPage />} />
        <Route path="password" element={<SettingsPasswordPage />} />
      </Route>

      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <VerifiedRoute>
              <ContactsLayout />
            </VerifiedRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="friends" replace />} />
        <Route path="friends" element={<ContactsFriendsPage />} />
        <Route path="groups" element={<ContactsGroupsPage />} />
        <Route path="requests" element={<ContactsRequestsPage />} />
        <Route path="group-invites" element={<ContactsGroupInvitesPage />} />
      </Route>

      <Route
        path="/newsfeed/:postId"
        element={
          <ProtectedRoute>
            <VerifiedRoute>
              <PostDetailPage />
            </VerifiedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/newsfeed"
        element={
          <ProtectedRoute>
            <VerifiedRoute>
              <NewsfeedPage />
            </VerifiedRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
