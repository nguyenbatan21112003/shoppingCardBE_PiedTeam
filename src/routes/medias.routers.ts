import { Router } from 'express'
import { uploadSingleImageController } from '~/controllers/medias.controllers'

const mediaRouter = Router()

//route upload 1 hình
mediaRouter.post('/upload-image', uploadSingleImageController)

export default mediaRouter
