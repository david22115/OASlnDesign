"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dynamic_admin_controller_1 = require("../controllers/dynamic_admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ========================================================
// Dynamic Admin Routes
// 必須要有 JWT 授權才能呼叫
// ========================================================
router.use(auth_middleware_1.requireAuth);
// Schemas (Table Definitions)
router.post('/schemas', dynamic_admin_controller_1.createSchema);
router.put('/schemas/:id', dynamic_admin_controller_1.updateSchema);
router.patch('/schemas/:id/publish', dynamic_admin_controller_1.publishSchema);
// Records (Data entries)
router.post('/records/:tableCode', dynamic_admin_controller_1.createRecord);
router.get('/records/:tableCode', dynamic_admin_controller_1.getRecords);
exports.default = router;
