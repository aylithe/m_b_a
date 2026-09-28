import { Request, Response, Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermissions } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createDocumentSchema,
  documentParamsSchema,
  listDocumentsSchema,
} from '../validators/document.validator';
import {
  getDocument,
  listDocuments,
  deleteDocument,
  createDocument,
} from '../services/document.services';

const router = Router();

router.use(authenticate);

// Anyone with documents:read can list documents
router.get(
  '/',
  requirePermissions('documents:read'),
  validate(listDocumentsSchema),
  async (req: Request, res: Response, next) => {
    try {
      const rawPage = Number(req.query.page ?? 1);
      const rawLimit = Number(req.query.limit ?? 20);
      const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
      const rawSearch = typeof req.query.search === 'string' ? req.query.search : undefined;
      const rawSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'createdAt';
      const rawSortOrder = typeof req.query.sortOrder === 'string' ? req.query.sortOrder : 'desc';

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const documents = await listDocuments(userId, {
        page: rawPage,
        limit: rawLimit,
        status: rawStatus,
        search: rawSearch,
        sortBy: rawSortBy as 'createdAt' | 'title' | 'chunkCount',
        sortOrder: rawSortOrder as 'asc' | 'desc',
      });

      res.status(200).json({ success: true, data: documents });
    } catch (error) {
      next(error);
    }
  },
);

// Only documents:create can upload
router.post(
  '/',
  requirePermissions('documents:create'),
  validate(createDocumentSchema),
  async (req: Request, res: Response, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { title, content, description } = req.body;
      const document = await createDocument({
        userId,
        title,
        content,
        description,
      });

      res.status(201).json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/:id', validate(documentParamsSchema), (req: Request, res: Response, next) => {
  const doc = getDocument(String(req.params!.id), req.user!.id);
  res.status(200).json({ success: true, data: doc });
});

// Only documents:delete can delete (admin only)
router.delete(
  '/:id',
  requirePermissions('admin:documents:delete', 'documents:delete'),
  validate(documentParamsSchema),
  async (req: Request, res: Response, next) => {
    await deleteDocument(String(req.params!.id), req.user!.id);
    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  },
);

export default router;
