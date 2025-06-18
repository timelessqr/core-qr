const User = require('../../../models/User');

class UserRepository {
  async create(userData) {
    try {
      const user = new User(userData);
      return await user.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('El email ya está registrado');
      }
      throw error;
    }
  }
  
  async findById(id) {
    return await User.findById(id)
      // .populate('perfiles', 'nombre fechaNacimiento fechaFallecimiento fotoPerfil') // Comentado hasta que tengamos Profile
      .lean();
  }
  
  async findByEmail(email) {
    return await User.findOne({ 
      email: email.toLowerCase(), 
      isActive: true 
    });
  }
  
  async update(id, updates) {
    // Manejar operaciones de MongoDB como $push
    if (updates.$push) {
      return await User.findByIdAndUpdate(
        id, 
        updates, 
        { new: true, runValidators: true }
      ).select('-password');
    }
    
    // No permitir actualizar email o password aquí para updates normales
    const allowedUpdates = ['nombre', 'telefono', 'plan'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    return await User.findByIdAndUpdate(
      id, 
      filteredUpdates, 
      { new: true, runValidators: true }
    ).select('-password');
  }
  
  async updateLastLogin(id) {
    return await User.findByIdAndUpdate(
      id,
      { ultimoLogin: new Date() },
      { new: true }
    );
  }
  
  async deactivate(id) {
    return await User.findByIdAndUpdate(
      id, 
      { isActive: false }, 
      { new: true }
    );
  }
  
  async changePassword(id, newPassword) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    user.password = newPassword;
    return await user.save();
  }
  
  async getUserStats(id) {
    const user = await User.findById(id); // Sin populate por ahora
    if (!user) return null;
    
    return {
      totalPerfiles: user.perfiles ? user.perfiles.length : 0, // Safe access
      plan: user.plan,
      fechaRegistro: user.createdAt,
      ultimoLogin: user.ultimoLogin
    };
  }
}

module.exports = new UserRepository();