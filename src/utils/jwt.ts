import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { reject } from 'lodash'
import { TokenPayload } from '~/models/requests/users.requests'
dotenv.config()
// file nay chua ham dung de tao ra token bang cong nghe jwt
// ham chi tao ra token chu k phai tao ra ac hay rf
export const signToken = ({
  payload,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: string | object | Buffer
  privateKey: string
  options?: jwt.SignOptions
}) => {
  return new Promise<string>((resolve, rejects) => {
    jwt.sign(payload, privateKey, options, (error, token) => {
      if (error) throw rejects(error)
      else resolve(token as string)
    })
  })
}

//Hàm kiểm tra token có khớp hcuwx kí ko và trả về payload của token đó
export const verifyToken = ({ token, privateKey }: { token: string; privateKey: string }) => {
  return new Promise<TokenPayload>((resolve, reject) => {
    jwt.verify(token, privateKey, (error, decode) => {
      if (error) throw reject(error)
      else return resolve(decode as TokenPayload)
    })
  })
}
