import { Flat } from '../models/Flat.js';
import { Society } from '../models/Society.js';
import { Tower } from '../models/Tower.js';
import { ROLES } from '../constants/roles.js';
import { auditService } from '../services/audit.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paginatedPayload } from '../utils/pagination.js';

const ensureSocietyAccess = (req, societyId) => {
  if (req.user.role !== ROLES.SUPER_ADMIN && req.user.societyId?.toString() !== societyId) {
    throw new ApiError(403, 'Society access denied');
  }
};

export const createSociety = asyncHandler(async (req, res) => {
  const society = await Society.create({
    ...req.body,
    createdBy: req.user._id
  });

  await auditService.record({
    req,
    action: 'society_created',
    entityType: 'Society',
    entityId: society._id,
    metadata: { societyId: society._id }
  });

  sendSuccess(res, 201, { society }, 'Society created');
});

export const listSocieties = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = req.user.role === ROLES.SUPER_ADMIN ? {} : { _id: req.user.societyId };
  const [items, total] = await Promise.all([
    Society.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Society.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Societies fetched');
});

export const updateSociety = asyncHandler(async (req, res) => {
  ensureSocietyAccess(req, req.params.id);
  const society = await Society.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!society) {
    throw new ApiError(404, 'Society not found');
  }

  await auditService.record({ req, action: 'society_updated', entityType: 'Society', entityId: society._id });
  sendSuccess(res, 200, { society }, 'Society updated');
});

export const deleteSociety = asyncHandler(async (req, res) => {
  ensureSocietyAccess(req, req.params.id);
  const society = await Society.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });

  if (!society) {
    throw new ApiError(404, 'Society not found');
  }

  await auditService.record({ req, action: 'society_deactivated', entityType: 'Society', entityId: society._id });
  sendSuccess(res, 200, { society }, 'Society deactivated');
});

export const createTower = asyncHandler(async (req, res) => {
  ensureSocietyAccess(req, req.params.id);
  const tower = await Tower.create({
    societyId: req.params.id,
    name: req.body.name,
    floors: req.body.floors
  });

  sendSuccess(res, 201, { tower }, 'Tower created');
});

export const listTowers = asyncHandler(async (req, res) => {
  ensureSocietyAccess(req, req.params.id);
  const towers = await Tower.find({ societyId: req.params.id }).sort({ name: 1 });
  sendSuccess(res, 200, { towers }, 'Towers fetched');
});

export const createFlat = asyncHandler(async (req, res) => {
  ensureSocietyAccess(req, req.params.id);
  const tower = await Tower.findOne({ _id: req.body.towerId, societyId: req.params.id });

  if (!tower) {
    throw new ApiError(404, 'Tower not found in this society');
  }

  const flat = await Flat.create({
    societyId: req.params.id,
    towerId: req.body.towerId,
    flatNumber: req.body.flatNumber,
    floor: req.body.floor,
    sizeSqFt: req.body.sizeSqFt,
    status: req.body.status
  });

  sendSuccess(res, 201, { flat }, 'Flat created');
});

export const listFlats = asyncHandler(async (req, res) => {
  ensureSocietyAccess(req, req.params.id);
  const { page, limit, skip } = getPagination(req.query);
  const filter = { societyId: req.params.id };
  const [items, total] = await Promise.all([
    Flat.find(filter).populate('towerId', 'name').sort({ towerId: 1, flatNumber: 1 }).skip(skip).limit(limit),
    Flat.countDocuments(filter)
  ]);

  sendSuccess(res, 200, paginatedPayload({ items, total, page, limit }), 'Flats fetched');
});
