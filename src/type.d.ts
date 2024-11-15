//file này dùng để định nghãi lại tất các thư viện, module trong dự án
// theo mong muốn của mình và type này có hiệu lực mạnh nhất trong toàn
// src code
import { Request } from 'express'
import { TokenPayload } from './models/requests/users.requests'
declare module 'express' {
  interface Request {
    decode_authorization?: TokenPayload
    decode_refresh_token?: TokenPayload
    decode_email_verify_token?: TokenPayload
    decode_forgot_password_token?: TokenPayload
  }
}
