import { createHash } from 'crypto'
import dotenv from 'dotenv'
dotenv.config()
// viết hàm nhận vào content nào đó và mã hóa thành sha256
function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

// viết hàm mã hóa password
export function hashPassword(password: string) {
  return sha256(password + process.env.PASSWORD_SECRET)
}
