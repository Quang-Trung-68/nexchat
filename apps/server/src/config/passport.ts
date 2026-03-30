import bcrypt from 'bcrypt'
import passport from 'passport'
import type { Request } from 'express'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { AppError } from '@/shared/errors/AppError'
import { env } from './env'
import { authRepository } from '@/modules/auth/auth.repository'
import { authService } from '@/modules/auth/auth.service'
import type { OAuthProfile, TokenPair } from '@/modules/auth/auth.types'

declare global {
  namespace Express {
    interface Request {
      oauthTokens?: TokenPair
    }
  }
}

export function initPassport() {
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const user = await authRepository.findUserByEmail(email)
          if (!user) return done(null, false)
          if (user.deletedAt) return done(null, false)
          if (!user.password) {
            return done(
              new AppError(
                'Tài khoản này đăng nhập bằng Google hoặc GitHub. Vui lòng dùng đúng phương thức.',
                400,
                'OAUTH_ONLY_ACCOUNT'
              )
            )
          }
          const isValid = await bcrypt.compare(password, user.password)
          if (!isValid) return done(null, false)
          return done(null, user)
        } catch (err) {
          return done(err as Error)
        }
      }
    )
  )

  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromExtractors([
          (req: Request) => req?.cookies?.accessToken ?? null,
        ]),
        secretOrKey: env.JWT_ACCESS_SECRET,
      },
      async (payload: { sub: string }, done) => {
        try {
          const user = await authRepository.findUserById(payload.sub)
          if (!user || user.deletedAt) return done(null, false)
          return done(null, user as Express.User)
        } catch (err) {
          return done(err as Error)
        }
      }
    )
  )

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ['email', 'profile'],
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const oauthProfile: OAuthProfile = {
            providerId: profile.id,
            email: profile.emails![0]!.value,
            displayName: profile.displayName ?? profile.emails![0]!.value,
            avatarUrl: profile.photos?.[0]?.value,
            provider: 'GOOGLE',
          }
          const { user, tokens } = await authService.handleOAuthCallback(oauthProfile)
          req.oauthTokens = tokens
          return done(null, user as Express.User)
        } catch (err) {
          return done(err as Error)
        }
      }
    )
  )

  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID || 'placeholder',
        clientSecret: env.GITHUB_CLIENT_SECRET || 'placeholder',
        callbackURL: env.GITHUB_CALLBACK_URL,
        scope: ['user:email'],
        passReqToCallback: true,
      },
      async (
        req: Request,
        _accessToken: string,
        _refreshToken: string,
        profile: { id: string | number; displayName?: string; username?: string; photos?: { value: string }[]; emails?: { value: string }[] },
        done: (err: Error | null, user?: false | Express.User) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) {
            return done(new Error('GitHub account has no email'))
          }
          const oauthProfile: OAuthProfile = {
            providerId: profile.id.toString(),
            email,
            displayName: profile.displayName || profile.username || email,
            avatarUrl: profile.photos?.[0]?.value,
            provider: 'GITHUB',
          }
          const { user, tokens } = await authService.handleOAuthCallback(oauthProfile)
          req.oauthTokens = tokens
          return done(null, user as Express.User)
        } catch (err) {
          return done(err as Error)
        }
      }
    )
  )
}
