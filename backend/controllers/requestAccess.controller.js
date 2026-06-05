const requestAccessService = require('../services/requestAccess.service');
const { handleSuccess, handleError } = require('../utils/responseHandler');

const submit = async (req, res) => {
  try {
    const { firstName, lastName, email, role, name, city, websiteOrInstagram, aboutShow } = req.body;

    if (!firstName || !lastName || !email || !role || !name || !city) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, email, role, name, city',
      });
    }

    const entry = await requestAccessService.submit({
      firstName, lastName, email, role, name, city, websiteOrInstagram, aboutShow,
    });
    handleSuccess(res, { message: 'Your access request has been submitted', entry }, 201);
  } catch (error) {
    handleError(res, error);
  }
};

const getAll = async (req, res) => {
  try {
    const entries = await requestAccessService.getAll();
    handleSuccess(res, { total: entries.length, entries });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { submit, getAll };
