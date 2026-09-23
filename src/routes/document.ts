import { Request, Response, Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermissions } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createDocumentSchema,
  documentParamsSchema,
  listDocumentsSchema,
} from '../validators/document.validator';
import { getDocument } from '../services/document.services';

const router = Router();

const listDocuments = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'listDocuments not implemented yet' });
};

const createDocument = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'createDocument not implemented yet' });
};

const deleteDocument = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'deleteDocument not implemented yet' });
};

router.use(authenticate);

// Anyone with documents:read can list documents
router.get('/', requirePermissions('documents:read'), validate(listDocumentsSchema), listDocuments);

// Only documents:create can upload
router.post(
  '/',
  requirePermissions('documents:create'),
  validate(createDocumentSchema),
  createDocument,
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
  deleteDocument,
);

export default router;
