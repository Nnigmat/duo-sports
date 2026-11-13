import { Router } from 'express';
import type { EquipmentResponse } from '../shared/types';
import { requireUser } from './authRouter';
import type { Db } from './db';
import { canManageEquipment, createEquipment, EQUIPMENT_DUPLICATE, EQUIPMENT_WRITE_FORBIDDEN, equipmentOf, validateName } from './equipment';

/** Справочник инвентаря: читают и добавляют тренер и админ, спортсмену вкладка не нужна. */
export function equipmentRouter(db: Db) {
  const r = Router();
  const auth = requireUser(db);
  r.get('/equipment', auth, (req, res) => {
    if (!canManageEquipment(req.user!.role)) return void res.status(403).json({ error: EQUIPMENT_WRITE_FORBIDDEN });
    const body: EquipmentResponse = { equipment: equipmentOf(db) };
    res.json(body);
  });
  r.post('/equipment', auth, (req, res) => {
    if (!canManageEquipment(req.user!.role)) return void res.status(403).json({ error: EQUIPMENT_WRITE_FORBIDDEN });
    const v = validateName(req.body);
    if (!v.ok) return void res.status(400).json({ error: v.error });
    const result = createEquipment(db, v.name);
    if (!result.ok) return void res.status(409).json({ error: EQUIPMENT_DUPLICATE });
    res.status(201).json(result.item);
  });
  return r;
}
