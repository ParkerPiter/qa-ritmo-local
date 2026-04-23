const { FormRecruitment } = require('../schemas');

class FormRecruitmentService {
  async submit({ name, city, phone, email, consent }) {
    const validCities = ['sf', 'la'];
    if (!validCities.includes(city)) {
      const error = new Error(`City must be one of: ${validCities.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const consentBool = consent === true || consent === 'true';
    if (!consentBool) {
      const error = new Error('Need to accept receiving text messages to continue');
      error.statusCode = 400;
      throw error;
    }

    const entry = await FormRecruitment.create({ name, city, phone, email: email || null, consent: consentBool });
    return entry;
  }

  async getAll() {
    return FormRecruitment.findAll({ order: [['createdAt', 'DESC']] });
  }
}

module.exports = new FormRecruitmentService();
