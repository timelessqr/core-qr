const Profile = require('../../../models/Profile');

class ProfileRepository {
  async create(profileData) {
    try {
      const profile = new Profile(profileData);
      return await profile.save();
    } catch (error) {
      throw error;
    }
  }
  
  async findById(id) {
    return await Profile.findById(id)
      .populate('usuario', 'nombre email plan')
      .populate('qr')
      .lean();
  }
  
  async findByUserId(userId) {
    return await Profile.find({ 
      usuario: userId,
      isActive: true 
    })
    .populate('qr', 'code url estadisticas')
    .sort({ createdAt: -1 })
    .lean();
  }
  
  async findByQRCode(qrId) {
    return await Profile.findOne({ 
      qr: qrId,
      isActive: true,
      isPublic: true
    })
    .populate('usuario', 'nombre plan')
    .populate('qr')
    .lean();
  }
  
  async update(id, updates) {
    return await Profile.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('qr', 'code url');
  }
  
  async delete(id) {
    return await Profile.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }
  
  async linkQR(profileId, qrId) {
    return await Profile.findByIdAndUpdate(
      profileId,
      { qr: qrId },
      { new: true }
    );
  }
  
  async getPublicProfile(id) {
    return await Profile.findOne({
      _id: id,
      isActive: true,
      isPublic: true
    })
    .populate('qr', 'code estadisticas')
    .select('-usuario') // No mostrar datos del usuario en vista pública
    .lean();
  }
  
  async getUserStats(userId) {
    const profiles = await Profile.find({ 
      usuario: userId, 
      isActive: true 
    }).lean();
    
    return {
      totalPerfiles: profiles.length,
      perfilesPublicos: profiles.filter(p => p.isPublic).length,
      perfilesPrivados: profiles.filter(p => !p.isPublic).length
    };
  }
}

module.exports = new ProfileRepository();