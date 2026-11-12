const bcrypt = require('bcryptjs');
const { User, Role, Permission, AuditLog } = require('../models');

class UserService {
  /**
   * List all users with Role details
   */
  async getUsers() {
    const users = await User.findAll({
      attributes: ['id', 'username', 'name', 'email', 'role', 'roleId', 'permissions', 'isActive', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Role,
          as: 'userRole',
          attributes: ['id', 'slug', 'name', 'description'],
        },
      ],
      order: [['id', 'ASC']],
    });

    return users.map((u) => {
      let perms = [];
      try {
        perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || []);
      } catch {
        perms = [];
      }
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        roleId: u.roleId,
        roleName: u.userRole ? u.userRole.name : u.role,
        permissionsCount: perms.length,
        permissions: perms,
        isActive: u.isActive,
        createdAt: u.createdAt,
      };
    });
  }

  /**
   * Create a new staff account
   */
  async createUser(userData, creator) {
    const { username, name, email, password, roleSlug = 'CASHIER' } = userData;

    if (!username || !name || !email || !password) {
      throw new Error('Username, name, email, and password are required');
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new Error(`Email ${email} is already in use`);
    }

    const role = await Role.findOne({
      where: { slug: roleSlug.toUpperCase() },
      include: [{ model: Permission, as: 'permissions' }],
    });

    if (!role) {
      throw new Error(`Role ${roleSlug} not found`);
    }

    const permSlugs = (role.permissions || []).map((p) => p.slug);
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      name,
      email,
      passwordHash,
      role: role.slug,
      roleId: role.id,
      permissions: JSON.stringify(permSlugs),
      isActive: true,
    });

    await AuditLog.create({
      userId: creator ? creator.id : null,
      action: 'USER_CREATED',
      entity: 'USER',
      entityId: String(newUser.id),
      details: { username, email, role: role.slug },
    });

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      roleId: newUser.roleId,
      permissions: permSlugs,
      isActive: newUser.isActive,
    };
  }

  /**
   * Update staff account
   */
  async updateUser(userId, updateData, modifier) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const fieldsToUpdate = {};
    if (updateData.name) fieldsToUpdate.name = updateData.name;
    if (updateData.email) fieldsToUpdate.email = updateData.email;
    if (typeof updateData.isActive === 'boolean') fieldsToUpdate.isActive = updateData.isActive;

    if (updateData.password) {
      fieldsToUpdate.passwordHash = await bcrypt.hash(updateData.password, 10);
    }

    if (updateData.roleSlug) {
      const role = await Role.findOne({
        where: { slug: updateData.roleSlug.toUpperCase() },
        include: [{ model: Permission, as: 'permissions' }],
      });
      if (role) {
        fieldsToUpdate.role = role.slug;
        fieldsToUpdate.roleId = role.id;
        fieldsToUpdate.permissions = JSON.stringify((role.permissions || []).map((p) => p.slug));
      }
    }

    await user.update(fieldsToUpdate);

    await AuditLog.create({
      userId: modifier ? modifier.id : null,
      action: 'USER_UPDATED',
      entity: 'USER',
      entityId: String(user.id),
      details: fieldsToUpdate,
    });

    return user;
  }
}

module.exports = new UserService();

