

// =============================
// 6) src/passport.js
// =============================
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import bcrypt from 'bcrypt'
import { prisma } from './db.js'

// Local email+password for login
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return done(null, false, { message: 'user not found' })
        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return done(null, false, { message: 'incorrect password' })
        return done(null, user)
      } catch (e) {
        return done(e)
      }
    }
  )
)

// JWT strategy for protecting routes
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      algorithms: ['HS256'],
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: payload.sub } })
        if (!user) return done(null, false)
        return done(null, { id: user.id, email: user.email, name: user.name ?? null })
      } catch (e) {
        return done(e, false)
      }
    }
  )
)
