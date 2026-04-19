import { Request, Response } from 'express';
import { prisma } from '@repo/database';

/**
 * ========================================================
 * Dynamic Admin Controller (動態後台控制器)
 * ========================================================
 * 負責處理 JSONB 無正規化表單的：
 * 1. 結構定義 (Table Def) - 實作狀態機守衛 (DRAFT → PUBLISHED → ARCHIVED)
 * 2. 紀錄實體 (Record)   - 主檔明細分離 (Master-Detail Pattern)
 */

// --------------------------------------------------------
// Schema (Form Definitions)
// --------------------------------------------------------

/**
 * 建立新的動態表單定義 (預設為 DRAFT，允許修改)
 */
export const createSchema = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableCode, name, description, fieldsSchema, uiSchema } = req.body;

    if (!tableCode || !name) {
      res.status(400).json({ status: 'ERROR', message: 'tableCode and name are required' });
      return;
    }

    const createdBy = req.user?.userId || 'SYSTEM';

    const newDef = await prisma.dynamicTableDef.create({
      data: {
        tableCode,
        name,
        description: description || null,
        fieldsSchema: fieldsSchema || {},
        uiSchema: uiSchema || {},
        createdBy,
        status: 'DRAFT',
        version: 1,
      },
    });

    res.status(201).json({ status: 'OK', data: newDef });
  } catch (err: any) {
    // Prisma unique constraint violation (tableCode duplicate)
    if (err.code === 'P2002') {
      res.status(409).json({ status: 'ERROR', message: `Table code '${req.body.tableCode}' already exists` });
      return;
    }
    console.error('[DynamicAdmin] createSchema error:', err);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
};

/**
 * 更新動態表單定義 (僅 DRAFT 狀態允許修改)
 * 防禦守則：PUBLISHED 狀態的 Schema 一律拒絕任何欄位變更
 */
export const updateSchema = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, fieldsSchema, uiSchema } = req.body;

    const existingDef = await prisma.dynamicTableDef.findUnique({ where: { id } });
    if (!existingDef) {
      res.status(404).json({ status: 'ERROR', message: 'Schema not found' });
      return;
    }

    if (existingDef.status !== 'DRAFT') {
      res.status(403).json({
        status: 'ERROR',
        message: `Cannot modify a schema with status '${existingDef.status}'. Only DRAFT schemas are editable.`,
      });
      return;
    }

    const updatedDef = await prisma.dynamicTableDef.update({
      where: { id },
      data: { name, description, fieldsSchema, uiSchema },
    });

    res.json({ status: 'OK', data: updatedDef });
  } catch (err: any) {
    console.error('[DynamicAdmin] updateSchema error:', err);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
};

/**
 * 發布表單定義：狀態由 DRAFT → PUBLISHED (之後不可修改欄位定義)
 * 若已是 PUBLISHED 或 ARCHIVED 則拒絕重複操作
 */
export const publishSchema = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existingDef = await prisma.dynamicTableDef.findUnique({ where: { id } });

    if (!existingDef) {
      res.status(404).json({ status: 'ERROR', message: 'Schema not found' });
      return;
    }

    if (existingDef.status !== 'DRAFT') {
      res.status(409).json({
        status: 'ERROR',
        message: `Schema is already in '${existingDef.status}' state. Only DRAFT can be published.`,
      });
      return;
    }

    const updatedDef = await prisma.dynamicTableDef.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    res.json({ status: 'OK', data: updatedDef });
  } catch (err: any) {
    console.error('[DynamicAdmin] publishSchema error:', err);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
};

// --------------------------------------------------------
// Records (Actual data filled in the forms)
// --------------------------------------------------------

/**
 * 依據 tableCode 建立一筆動態表單紀錄
 * 採 Master-Detail 分離：通用欄位存於正規化主檔，詳細表單內容存於 JSONB 明細
 */
export const createRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableCode } = req.params;
    const { dynamicData, targetEmployeeId } = req.body;

    if (!dynamicData || typeof dynamicData !== 'object') {
      res.status(400).json({ status: 'ERROR', message: 'dynamicData must be a JSON object' });
      return;
    }

    const schemaDef = await prisma.dynamicTableDef.findUnique({ where: { tableCode } });
    if (!schemaDef) {
      res.status(404).json({ status: 'ERROR', message: `Form definition '${tableCode}' not found` });
      return;
    }

    if (schemaDef.status !== 'PUBLISHED') {
      res.status(403).json({ status: 'ERROR', message: 'Cannot submit records for an unpublished form' });
      return;
    }

    const ownerEmployeeId = req.user!.employeeId;

    const newRecord = await prisma.dynamicRecordMaster.create({
      data: {
        tableDefId: schemaDef.id,
        ownerEmployeeId,
        targetEmployeeId: targetEmployeeId ?? null,
        recordStatus: 'PENDING',
        dynamicData,
      },
    });

    res.status(201).json({ status: 'OK', data: newRecord });
  } catch (err: any) {
    console.error('[DynamicAdmin] createRecord error:', err);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
};

/**
 * 以 tableCode 查詢所有動態記錄
 * 分頁預設 50 筆，使用 GIN index 加速
 */
export const getRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableCode } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200); // 最大 200 筆防暴力拉
    const page  = Math.max(Number(req.query.page)  || 1,  1);

    const schemaDef = await prisma.dynamicTableDef.findUnique({ where: { tableCode } });
    if (!schemaDef) {
      res.status(404).json({ status: 'ERROR', message: `Form definition '${tableCode}' not found` });
      return;
    }

    const [records, total] = await prisma.$transaction([
      prisma.dynamicRecordMaster.findMany({
        where:   { tableDefId: schemaDef.id },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.dynamicRecordMaster.count({ where: { tableDefId: schemaDef.id } }),
    ]);

    res.json({ status: 'OK', data: records, meta: { total, page, limit } });
  } catch (err: any) {
    console.error('[DynamicAdmin] getRecords error:', err);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
};

