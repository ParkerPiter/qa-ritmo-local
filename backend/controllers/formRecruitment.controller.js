const formRecruitmentService = require('../services/formRecruitment.service');
const { handleSuccess, handleError } = require('../utils/responseHandler');

const submit = async (req, res) => {
  try {
    const { name, city, phone, email, consent } = req.body;

    if (!name || !city || !phone || consent === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, city, phone, consent'
      });
    }

    const entry = await formRecruitmentService.submit({ name, city, phone, email, consent });
    handleSuccess(res, { message: 'You have successfully joined the list', entry }, 201);
  } catch (error) {
    handleError(res, error);
  }
};

const getAll = async (req, res) => {
  try {
    const entries = await formRecruitmentService.getAll();
    handleSuccess(res, { total: entries.length, entries });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { submit, getAll };
