export const PASSWORD_REQUIREMENTS = 'Password must be 8-128 characters with uppercase, lowercase, number, symbol, and no spaces.'

export const isComplexPassword = (password = '') => (
  password.length >= 8 &&
  password.length <= 128 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9\s]/.test(password) &&
  !/\s/.test(password)
)

export const passwordSchema = (z) => z.string()
  .min(8, PASSWORD_REQUIREMENTS)
  .max(128, PASSWORD_REQUIREMENTS)
  .refine(isComplexPassword, PASSWORD_REQUIREMENTS)
