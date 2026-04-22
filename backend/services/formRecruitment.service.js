const { FormRecruitment } = require('../schemas');

class FormRecruitmentService {
  async submit({ name, city, phone, email, consent }) {
    if (!consent) {
      const error = new Error('Need to accept receiving text messages to continue');
      error.statusCode = 400;
      throw error;
    }

    const entry = await FormRecruitment.create({ name, city, phone, email: email || null, consent });
    return entry;
  }

  async getAll() {
    return FormRecruitment.findAll({ order: [['createdAt', 'DESC']] });
  }
}

module.exports = new FormRecruitmentService();
