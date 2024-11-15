//file dinh nghia ham handler tong
// noi ma cac loi tu toan bo he thong se ddo ve day
// loi tu validate do ve se co ma 422 minh co the tan dung
//      dooi khi trong validate co loi dac biet co dang ErrorWithStatus
// loi tu controller co the la loi do minh ErrorWithStatus
//      loi rot mang thi ko co status
import { Request, Response, NextFunction } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'

// => loi tu cac noi do ve co the co , hoac ko co status
export const defaultErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  //lỗi từ mọi nguồn đổ về đây đc chia làm 2 dạng ErrorWithStatus và phần còn lại
  if (error instanceof ErrorWithStatus) {
    res.status(error.status).json(omit(error, ['status']))
  } else {
    //những lỗi còn lại: có rất nhiều thông tin lạ ko đoán đc, ko có status
    Object.getOwnPropertyNames(error).forEach((key) => {
      Object.defineProperty(error, key, { enumerable: true })
    })
    //
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: error.message,
      errorInfor: omit(error, ['stack'])
    })
  }
}
