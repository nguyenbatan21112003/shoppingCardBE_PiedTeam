//common.middlewares.ts chứa những hàm tiện ích lâu lâu lấy ra xài , mấy cái lắc nhắc nhỏ
//utils là chứa mấy cái tool

import { pick } from 'lodash'
import { Request, Response, NextFunction } from 'express'

//làm mod lại req.body theo mảng các key mình muốn
export const filterMiddleware = <T>(filterKeys: Array<keyof T>) => {
  //hàm nhận vào 1 mảng các chuỗi
  //hàm trả ra 1 middleware
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = pick(req.body, filterKeys)
    next()
  }
}
