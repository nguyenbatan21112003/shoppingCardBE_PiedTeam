import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import { Request, Response, NextFunction } from 'express'
import { EntityError, ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'

// hamf validate se nhận vao checkSchema và trả ra middleware xử lý lỗi
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req) //tao danh sách lỗi cất vào req
    // phải run thì mới lấy lỗi dc có lỗi ms thông báo dc
    const errors = validationResult(req) // lấy danh sách lõi trong req dưới dạng mảng
    if (errors.isEmpty()) {
      return next()
    } else {
      const errorsObject = errors.mapped() // danh sach cac loi dang object
      const entityError = new EntityError({ errors: {} }) // day laf object loi ma minh muoon
      //thay the
      //duyet key
      for (const key in errorsObject) {
        //lay msg trong tung truong du lieu cua errorsObject ra
        const { msg } = errorsObject[key]
        //neeu msg co dang ErrorWithStatus va co status khac 422 thi minh next(err) no ra trc
        if (msg instanceof ErrorWithStatus && msg.status != HTTP_STATUS.UNPROCESSABLE_ENTITY) {
          return next(msg)
        }
        // neu ko phai dang dat biet thi minh bo vao entityError
        entityError.errors[key] = msg
      }

      // res.status(422).json({
      //   message: 'Invalid value',
      //   errors: errorsObject
      // })
      next(entityError)
    }
  }
}
