const { Role, Permission, RolePermission, User, AuditLog, sequelize } = require('../models');

class RoleService {
  /**
   * Get all system roles with assigned permissions
   */
  async getAllRoles() {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'name', 'module', 'description'],
          through: { attributes: [] },
        },
      ],
      order: [['id', 'ASC']],
    });

    return roles.map((r) => {
      const perms = r.permissions || [];
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissionsCount: perms.length,
        permissions: perms.map((p) => p.slug),
        permissionDetails: perms,
      };
    });
  }

  /**
   * Get single role by ID
   */
  async getRoleById(roleId) {
    const role = await Role.findByPk(roleId, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'slug', 'name', 'module', 'description'],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      throw new Error(`Role with ID ${roleId} not found`);
    }

    const perms = role.permissions || [];
    return {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: perms.map((p) => p.slug),
      permissionDetails: perms,
    };
  }

  /**
   * Update permissions for a role
   */
  async updateRolePermissions(roleId, permissionSlugs = [], user) {
    const role = await Role.findByPk(roleId);
    if (!role) {
      throw new Error(`Role with ID ${roleId} not found`);
    }

    const transaction = await sequelize.transaction();
    try {
      // Find permission IDs for the provided slugs
      const { Op } = require('sequelize');
      const perms = await Permission.findAll({
        where: { slug: { [Op.in]: permissionSlugs } },
        transaction,
      });

      // Clear existing links
      await RolePermission.destroy({
        where: { roleId },
        transaction,
      });

      // Insert new links
      if (perms.length > 0) {
        const records = perms.map((p) => ({
          roleId,
          permissionId: p.id,
        }));
        await RolePermission.bulkCreate(records, { transaction });
      }

      // Update cached JSON on users assigned to this role
      const validSlugs = perms.map((p) => p.slug);
      await User.update(
        { permissions: JSON.stringify(validSlugs) },
        { where: { roleId }, transaction }
      );

      // Audit log
      await AuditLog.create({
        userId: user ? user.id : null,
        action: 'ROLE_PERMISSIONS_UPDATED',
        entity: 'ROLE',
        entityId: String(roleId),
        details: {
          role: role.slug,
          newPermissionsCount: validSlugs.length,
          permissions: validSlugs,
        },
      }, { transaction });

      await transaction.commit();
      return await this.getRoleById(roleId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all system permissions grouped by functional module
   */
  async getAllPermissionsGrouped() {
    const allPerms = await Permission.findAll({
      order: [['module', 'ASC'], ['slug', 'ASC']],
    });

    const grouped = {};
    for (const p of allPerms) {
      if (!grouped[p.module]) {
        grouped[p.module] = [];
      }
      grouped[p.module].push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        module: p.module,
        description: p.description,
      });
    }

    return {
      total: allPerms.length,
      grouped,
      all: allPerms,
    };
  }
}

module.exports = new RoleService();

