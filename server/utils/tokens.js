import jwt from 'jsonwebtoken'

export const signAccessToken = (user) => {
  return jwt.sign(
    { sub: String(user.id), email: user.email, name: user.name ?? null, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '15m', algorithm: 'HS256' }
  )
}

export const signRefreshToken = (user) => {
  return jwt.sign(
    { sub: String(user.id), type: 'refresh' },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES || '7d', algorithm: 'HS256' }
  )
}

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_SECRET, { algorithms: ['HS256'] })
}