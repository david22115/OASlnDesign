import { Router } from 'express';
import { 
  createSchema, 
  updateSchema, 
  publishSchema, 
  createRecord, 
  getRecords 
} from '../controllers/dynamic_admin.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ========================================================
// Dynamic Admin Routes
// 必須要有 JWT 授權才能呼叫
// ========================================================

router.use(requireAuth);

// Schemas (Table Definitions)
router.post('/schemas', createSchema);
router.put('/schemas/:id', updateSchema);
router.patch('/schemas/:id/publish', publishSchema);

// Records (Data entries)
router.post('/records/:tableCode', createRecord);
router.get('/records/:tableCode', getRecords);

export default router;
