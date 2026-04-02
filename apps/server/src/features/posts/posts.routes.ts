import { Router } from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import { getUploadConfig } from '@/config/upload.config'
import * as controller from './posts.controller'

const cfg = getUploadConfig()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: cfg.maxImageBytesPerFile },
}).array('images', cfg.maxImagesPerMessage)

const router = Router()

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(authenticate)
router.use(requireEmailVerified)

router.get('/', controller.listPosts)
router.post('/', writeLimiter, upload, controller.createPost)

/** Cụ thể trước `/:postId` để không nhầm segment với id. */
router.get('/:postId/comments', controller.listComments)
router.post('/:postId/comments', writeLimiter, controller.createComment)
router.patch('/:postId/comments/:commentId', writeLimiter, controller.updateComment)
router.delete('/:postId/comments/:commentId', writeLimiter, controller.deleteComment)
router.get('/:postId/likes', controller.listLikers)
router.post('/:postId/like', writeLimiter, controller.toggleLike)
router.get('/:postId', controller.getPostById)

router.patch('/:postId', writeLimiter, controller.updatePost)
router.delete('/:postId', writeLimiter, controller.deletePost)

export default router
