import User from '~/models/schemas/User.schema'
import databaseServices from './database.services'
import { LoginReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/requests/users.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { update } from 'lodash'

class UsersServices {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN }
    })
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN }
    })
  }

  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerificationToken },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN }
    })
  }

  private signForgotPasswordToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN }
    })
  }

  async checkEmailExist(email: string) {
    // lên database tìm user đang sỡ hữu email này
    const user = await databaseServices.users.findOne({ email })
    return Boolean(user)
  }

  async checkRefreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    const refreshToken = await databaseServices.refresh_tokens.findOne({
      user_id: new ObjectId(user_id),
      token: refresh_token
    })
    if (!refreshToken) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
      })
    }
    return refreshToken
  }

  async checkEmailVerifyToken({
    user_id,
    email_verify_token
  }: {
    user_id: string
    email_verify_token: string //
  }) {
    //chơi với sever hạn chế lấy dữ liệu từ sever xuống
    //tìm user bằng uder_id và email_verify_token
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      email_verify_token
    })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_INVALID
      })
    }
    return user // return user//return ra ngoài để kiểm tra xem có verify hay gì không?
  }

  async checkForgotPasswordToken({
    user_id,
    forgot_password_token
  }: {
    user_id: string //
    forgot_password_token: string
  }) {
    //tìm user với 2 thông tin trên, ko có thì chui83, có thì return ra
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      forgot_password_token
    })

    //nếu ko tìm ra
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID
      })
    }
    //nếu có user thì return ra
    return user
  }

  async checkEmailVerified(user_id: string) {
    //tìm xem đã verify hay ch
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      verify: UserVerifyStatus.Verified
    })
    //ch verify
    if (user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBBIDEN, //403
        message: USERS_MESSAGES.USER_NOT_VERIFIED
      })
    }
    //nếu có user, return true hay user đều đc
    return user
  }

  async findUserById(uder_id: string) {
    const user = await databaseServices.users.findOne({ _id: new ObjectId(uder_id) })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND, //404
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    } else {
      return user //thay cho true
    }
  }

  async resendEmailVerify(user_id: string) {
    //tạo lại mã evt:
    const email_verify_token = await this.signEmailVerifyToken(user_id)
    //tìm user bằng user_id dể cập nhật lại mã
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          email_verify_token,
          updated_at: '$$NOW'
        }
      }
    ])
    console.log(`mp6 phỏng gửi link qua mail xác thực đăng kí: 
      http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}
    `)
  }

  async register(payLoad: RegisterReqBody) {
    //tạo mã email verify token trước:
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    //goi server va luu vao
    const result = await databaseServices.users.insertOne(
      new User({
        _id: user_id,
        username: `user${user_id.toString()}`, //người dùng có thể cập nhật
        //=>_id và username là 2 key unique và chỉ có key username đc sửa,username dùng để truy xuất trong database thay cho _id
        email_verify_token,
        ...payLoad,
        password: hashPassword(payLoad.password),
        date_of_birth: new Date(payLoad.date_of_birth) // overwrite: ghi đè
      })
    )
    //dung user_id ky 2 ma ac va rf
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ])
    //gửi link có  email_verify_token: có thể gửi qua email nhưng tốn tiền đăng kí doanh nghiệp
    console.log(`Mô phỏng gửi link qua mail xác thực đăng kí: 
      http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}
    `) //cách đơn giản là log ra màn hình
    //lưu refresh:
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //
    return {
      access_token,
      refresh_token
    }
  }

  async login({ email, password }: LoginReqBody) {
    //vào database tìm user sở hữu 2 thông tin cùng lúc:
    const user = await databaseServices.users.findOne({
      email,
      password: hashPassword(password)
    })
    //sẽ có 2 trường hợp là null hoặc lấy đc user:
    //+email và password ko tìm đc user => email và password sai
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
      })
    }
    //+Nếu qua đc if => có user => Tạo access và refresh
    const user_id = user._id.toString()
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //lưu refresh:
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //xong rồi thì ném ra:
    return {
      access_token,
      refresh_token
    }
  }

  async logout(refresh_token: string) {
    await databaseServices.refresh_tokens.deleteOne({
      token: refresh_token
    })
  }

  async verifyEmail(user_id: string) {
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          verify: UserVerifyStatus.Verified,
          email_verify_token: '',
          updated_at: '$$NOW'
        }
      }
    ])
    //+tạo ac và rf để người dùng đăng nhập luôn
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //lưu refresh:
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //xong rồi thì ném ra:
    return {
      access_token,
      refresh_token
    }
  }

  async forgotPassword(email: string) {
    const user = (await databaseServices.users.findOne({
      email
    })) as User
    //lấy user_id tạo mã forgot password
    const user_id = user._id as ObjectId
    const forgot_password_token = await this.signForgotPasswordToken(user_id.toString())
    //lưu vào database
    await databaseServices.users.updateOne(
      { _id: user_id }, //
      [
        {
          $set: {
            forgot_password_token,
            updated_at: '$$NOW'
          }
        }
      ]
    )
    //gửi mail
    console.log(`
    Mô phỏng gửi link qua mail để đổi mật khẩu: 
      http://localhost:8000/users/reset-password/?forgot_password_token=${forgot_password_token}
      `)
    //8000 là cho frontend
  }

  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    await databaseServices.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      [
        {
          $set: {
            password: hashPassword(password),
            forgot_password_token: '',
            updated_at: '$$NOW'
          }
        }
      ]
    )
  }

  async getMe(user_id: string) {
    const userInfor = await databaseServices.users.findOne(
      { _id: new ObjectId(user_id) }, //
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return userInfor
  }

  async updateMe({ user_id, payload }: { user_id: string; payload: UpdateMeReqBody }) {
    //user_id giúp mình tìm được user cần cập nhật
    //payload là những gì người dung muốn cập nhật, mình ko biết họ đả gửi lên những gì
    //nếu date_of_birth thì nó cần chuyển về Date
    const _payload = payload.date_of_birth //_payload chứa thông tin đc đưa và format lại để update
      ? { ...payload, date_of_birth: new Date(payload.date_of_birth) }
      : payload
    //nếu username đc gửi lên thì nó phải là unique
    if (_payload.username) {
      const isDup = await databaseServices.users.findOne({ username: _payload.username })
      if (isDup) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: USERS_MESSAGES.USERNAME_ALREADY_EXISTS
        })
      }
    }
    //nếu qua hết thì cập nhật
    const userInfor = await databaseServices.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) }, //
      [
        {
          $set: {
            ..._payload,
            updated_at: '$$NOW'
          }
        }
      ],
      {
        returnDocument: 'after', //trả ra cho t thông tin của user sau khi update
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return userInfor
  }

  async changePassword({
    user_id,
    old_password,
    password
  }: {
    user_id: string
    old_password: string
    password: string
  }) {
    //dùng user_id và old_password để tìm user => biết đc người dùng có thực sự sở hữu account hay ko
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      password: hashPassword(old_password)
    })
    //nếu tìm ko ra thì nghĩa là thằng client ko phải chủ acc
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    //nếu mà có thì mình tiến hành cập nhật password mới
    await databaseServices.users.updateOne(
      { _id: new ObjectId(user_id) }, //
      [
        {
          $set: {
            password: hashPassword(password),
            updated_at: '$$NOW'
          }
        }
      ]
    )
  }

  async refreshToken({
    user_id, //
    refresh_token
  }: {
    user_id: string
    refresh_token: string
  }) {
    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //lưu refresh_token mới vào database
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: new_refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //và xóa refresh_token cũ để ko ai dùng nửa
    await databaseServices.refresh_tokens.deleteOne({ token: refresh_token })
    //gửi cặp mã mới cho người dùng
    return {
      access_token,
      refresh_token: new_refresh_token
    }
  }
}

//tao intance
const usersServices = new UsersServices()
export default usersServices
