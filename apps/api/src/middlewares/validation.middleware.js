/**
 * Validation Middleware - Express request validation
 */
const { badRequest } = require('../utils/response');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
    return badRequest(res, 'Validation failed', errors);
  }
  next();
};

module.exports = { validate };
