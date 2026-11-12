const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User, Role, Permission, AuditLog } = require('../models');

class AuthService {
  /**
   * Helper to fetch a user with their role and all permission slugs
   */
  async getUserWithPermissions(userId) {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'userRole',
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['id', 'slug', 'name', 'module'],
            },
          ],
        },
      ],
    });

    if (!user) return null;

    let permissions = [];
    if (user.userRole && user.userRole.permissions) {
      permissions = user.userRole.permissions.map((p) => p.slug);
    } else if (user.permissions) {
      permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      roleName: user.userRole ? user.userRole.name : user.role,
      permissions,
      isActive: user.isActive,
    };
  }

  /**
   * Standard login with email or username and password
   */
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Email/Username and password are required');
    }

    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { username: identifier },
        ],
      },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials or account deactivated');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const userProfile = await this.getUserWithPermissions(user.id);
    const token = jwt.sign(
      {
        id: userProfile.id,
        username: userProfile.username,
        role: userProfile.role,
        permissions: userProfile.permissions,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn || '24h' }
    );

    await AuditLog.create({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'USER',
      entityId: String(user.id),
      details: { role: user.role, loginAt: new Date().toISOString() },
    });

    return {
      token,
      user: userProfile,
    };
  }

  /**
   * Quick role-switch simulation for POS / demo terminal testing
   */
  async switchRole(roleSlug) {
    const targetRole = roleSlug.toUpperCase();
    const user = await User.findOne({
      where: { role: targetRole, isActive: true },
      order: [['id', 'ASC']],
    });

    if (!user) {
      throw new Error(`No active user found with role ${targetRole}`);
    }

    const userProfile = await this.getUserWithPermissions(user.id);
    const token = jwt.sign(
      {
        id: userProfile.id,
        username: userProfile.username,
        role: userProfile.role,
        permissions: userProfile.permissions,
      },
      config.jwt.secret,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: userProfile,
    };
  }
}

module.exports = new AuthService();

