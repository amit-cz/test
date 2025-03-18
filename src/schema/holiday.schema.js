const Joi = require("joi");

const create_holiday_schema = Joi.object({
  name: Joi.string().min(3).max(30).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters long",
    "string.max": "Name must be at most 30 characters long",
  }),

  start_date: Joi.date()
    .min(new Date().toISOString().split("T")[0])
    .required()
    .messages({
      "date.base": "Start date must be a valid date",
      "date.min": "Start date must be today or a future date",
      "any.required": "Start date is required",
    }),

  end_date: Joi.date()
    .greater(Joi.ref("start_date"))
    .max("2025-12-31")
    .optional()
    .messages({
      "date.base": "End date must be a valid date",
      "date.greater": "End date must be after the start date",
      "date.max": "End date must be before December 31, 2025",
    }),
});

const assign_holiday_schema = Joi.object({
  studentIds: Joi.array()
    .items(
      Joi.number().required().messages({
        "number.empty": "Student Id is required!",
      })
    )
    .min(1)
    .messages({
      "array.min": "At least 1 student Id is required",
    }),

  holidayId: Joi.number().required().min(1).messages({
    "number.empty": "Holiday Id is required!",
    "number.min": "Holiday Id must be at least 1",
  }),
});

const date_validation_schema = Joi.object({
  start_date: Joi.date().required().messages({
    "date.base": "Start date must be a valid date",
    // "date.min": "Start date must be today or a future date",
    "any.required": "Start date is required",
  }),

  end_date: Joi.date()
    .greater(Joi.ref("start_date"))
    .max("2025-12-31")
    .optional()
    .messages({
      "date.base": "End date must be a valid date",
      "date.greater": "End date must be after the start date",
      "date.max": "End date must be before December 31, 2025",
    }),
});

const delete_holiday_schema = Joi.object({
  holidayId: Joi.number().required().min(1).messages({
    "number.empty": "Holiday Id is required!",
    "number.min": "Holiday Id must be at least 1",
  }),
});

module.exports = {
  create_holiday_schema,
  assign_holiday_schema,
  date_validation_schema,
  delete_holiday_schema,
};
