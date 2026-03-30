import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '@/middlewares/authenticate'
import { getUploadConfig } from '@/config/upload.config'
import * as controller from './messages.attachments.controller'

const cfg = getUploadConfig()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: cfg.maxImageBytesPerFile },
}).array('images', cfg.maxImagesPerMessage)

const router = Router()

router.use(authenticate)

router.post('/:messageId/images', upload, controller.uploadMessageImages)

export default router
