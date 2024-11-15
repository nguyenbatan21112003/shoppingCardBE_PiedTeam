import { Request, Response, NextFunction, RequestHandler } from 'express'
//viet ham wrapAsync
// wrapAsync la ham nhan vao req handler(middleware va controller)
// 'req handler' nay k co cau truc try catch next
// wrapAsync se nhan va tra ve 1 req handler khac
// dc tao tu try catch next va req handler ban dau
export const wrapAsync = <P, T>(func: RequestHandler<P, any, any, T>) => {
  //dua func va nhan dc req handler moi
  return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
//<P, T>(func: RequestHandler<P, any, any, T> là phương pháp generist
