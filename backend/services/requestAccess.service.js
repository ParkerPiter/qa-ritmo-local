const { RequestAccess } = require('../schemas');

const VALID_ROLES = ['Artist', 'Venue', 'Promoter'];
const VALID_CITIES = ['San Francisco', 'Los Angeles'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class RequestAccessService {
  async submit({ firstName, lastName, email, role, name, city, websiteOrInstagram, aboutShow }) {
    if (!EMAIL_REGEX.test(email)) {
      const error = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }

    if (!VALID_ROLES.includes(role)) {
      const error = new Error(`Role must be one of: ${VALID_ROLES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    if (!VALID_CITIES.includes(city)) {
      const error = new Error(`City must be one of: ${VALID_CITIES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const entry = await RequestAccess.create({
      firstName,
      lastName,
      email,
      role,
      name,
      city,
      websiteOrInstagram: websiteOrInstagram || null,
      aboutShow: aboutShow || null,
    });
    return entry;
  }

  async getAll() {
    return RequestAccess.findAll({ order: [['createdAt', 'DESC']] });
  }
}

module.exports = new RequestAccessService();
