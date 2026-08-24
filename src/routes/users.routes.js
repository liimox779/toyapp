import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin, ROLE_LEVEL } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);

const VALID_ROLES = Object.keys(ROLE_LEVEL); // ['viewer', 'editor', 'admin']

usersRouter.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
}));

usersRouter.post('/', asyncHandler(async (req, res) => {
  const { username, password, role } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const resolvedRole = role || 'viewer';
  if (!VALID_ROLES.includes(resolvedRole)) {
    return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: `Username "${username}" already exists` });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: { username: String(username).trim(), password: passwordHash, role: resolvedRole },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  res.status(201).json({ user });
}));

usersRouter.patch('/:id/role', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body ?? {};
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (existing.role === 'admin' && role !== 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot demote the last remaining admin' });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  res.json({ user });
}));

usersRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (id === req.user.sub) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  if (existing.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last remaining admin' });
    }
  }

  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
}));
