const Joi = require("joi");

const register_schema = Joi.object({
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

  subject_names: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .max(5)
    .messages({
      "array.min": "At least one subject is required",
      "array.max": "You can specify up to 5 subjects",
    }),

  password: Joi.string().min(8).max(12).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must be at most 12 characters",
  }),
});

const login_schema = Joi.object({
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

const update_schema = Joi.object({
  first_name: Joi.string().min(3).max(15).messages({
    "string.min": "First name must be at least 3 characters",
    "string.max": "First name must be at most 15 characters",
  }),

  last_name: Joi.string().min(3).max(15).messages({
    "string.min": "Last name must be at least 3 characters",
    "string.max": "Last name must be at most 15 characters",
  }),

  email: Joi.string().required().email().messages({
    "string.email": "Invalid email",
    "string.empty": "Email is required",
  }),

  new_email: Joi.string().email().messages({
    "string.email": "Invalid email",
  }),

  subject_names: Joi.array().items(Joi.string()).min(1).max(5).messages({
    "array.min": "At least one subject is required",
    "array.max": "You can specify up to 5 subjects",
  }),
});

const validate_email = Joi.object({
  email: Joi.string().email().optional().messages({
    "string.email": "Invalid email",
  }),
});

const update_subject_schema = Joi.object({
  subject_names: Joi.array()
    .items(Joi.string().required().trim())
    .min(1)
    .max(5)
    .required()
    .messages({
      "array.base": "Subjects must be an array",
      "array.min": "At least one subject is required",
      "array.max": "You can specify up to 5 subjects",
      "any.required": "Subject names are required",
    }),

  email: Joi.string().email().required().messages({
    "string.email": "Invalid email",
    "any.required": "Email is required",
  }),
});

module.exports = {
  register_schema,
  update_schema,
  validate_email,
  update_subject_schema,
  login_schema,
};
