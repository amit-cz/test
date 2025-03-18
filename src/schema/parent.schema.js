const Joi = require("joi");

const parent_register_schema = Joi.object({
  first_name: Joi.string().min(3).max(15).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 3 characters",
    "string.max": "First name must be at most 15 characters",
  }),

  last_name: Joi.string().min(3).max(15).required().messages({
    "string.empty": "Last name is required",
    "string.min": "Last name must be at least 3 characters",
    "string.max": "Last name must be at most 15 characters",
  }),

  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid email",
  }),

  password: Joi.string().min(8).max(12).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must be at most 12 characters",
  }),
});

const parent_login_schema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Invalid Email",
  }),
  password: Joi.string().min(8).max(12).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must be at most 12 characters",
  }),
});

const parent_update_schema = Joi.object({
  first_name: Joi.string().min(3).max(15).messages({
    "string.min": "First name must be at least 3 characters",
    "string.max": "First name must be at most 15 characters",
  }),

  last_name: Joi.string().min(3).max(15).messages({
    "string.min": "Last name must be at least 3 characters",
    "string.max": "Last name must be at most 15 characters",
  }),

  email: Joi.string().email().messages({
    "string.email": "Invalid email",
  }),
});

module.exports = {
  parent_register_schema,
  parent_login_schema,
  parent_update_schema,
};
