import { body, param, query } from 'express-validator';
import {
  ALERT_SEVERITY_VALUES,
  INCIDENT_CATEGORY_VALUES,
  INCIDENT_STATUS_VALUES,
  SHIFT_ACTION_VALUES
} from '../constants/securityTypes.js';

const optionalLocationValidators = [
  body('location.lat').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body('location.lng').optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body('location.label').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 120 })
];

export const shiftGuardValidator = [
  param('id').custom((value) => value === 'me' || /^[a-f\d]{24}$/i.test(value)),
  body('action').isIn(SHIFT_ACTION_VALUES),
  body('note').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 240 }),
  ...optionalLocationValidators
];

export const createCheckpointValidator = [
  body('name').trim().isLength({ min: 2, max: 80 }),
  ...optionalLocationValidators
];

export const listCheckpointsValidator = [
  query('isActive').optional({ nullable: true, checkFalsy: true }).isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

export const patrolLogValidator = [
  body('checkpointId').isMongoId(),
  body('qrToken').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 20, max: 160 }),
  body('qrPayload').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 20, max: 512 }),
  body('note').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 240 }),
  ...optionalLocationValidators
];

export const sosAlertValidator = [
  body('message').trim().isLength({ min: 2, max: 240 }),
  body('severity').optional().isIn(ALERT_SEVERITY_VALUES),
  body('flatId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  ...optionalLocationValidators
];

export const incidentReportValidator = [
  body('category').isIn(INCIDENT_CATEGORY_VALUES),
  body('description').trim().isLength({ min: 5, max: 2000 }),
  body('photos').optional().isArray({ max: 6 }),
  body('photos.*').optional().isURL(),
  ...optionalLocationValidators
];

export const listIncidentsValidator = [
  query('status').optional({ nullable: true, checkFalsy: true }).isIn(INCIDENT_STATUS_VALUES),
  query('category').optional({ nullable: true, checkFalsy: true }).isIn(INCIDENT_CATEGORY_VALUES),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];
