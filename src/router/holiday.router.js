const express = require("express");
const verifyToken = require("../middlewares/auth.middleware");
const {
  createHoliday,
  assignHolidayToStudent,
  getStudentsWithNoHolidayByDateRange,
  getStudentsWithHolidayByDateRange,
  getHolidayByDate,
  deleteHoliday,
  getHolidayByDateUsingRawSQL,
  getStudentsWithNoHolidayByDateRangeUsingRawSQL,
} = require("../controller/holiday.controller");

const router = express.Router();

router.post("/create", verifyToken, createHoliday);
router.post("/assign-holiday", verifyToken, assignHolidayToStudent);
router.post(
  "/no-holiday-students",
  verifyToken,
  getStudentsWithNoHolidayByDateRange
);
router.post(
  "/holiday-students",
  verifyToken,
  getStudentsWithHolidayByDateRange
);
router.post("/holiday-list-by-date", verifyToken, getHolidayByDate);
router.post(
  "/get-holiday-by-raw-sql",
  verifyToken,
  getHolidayByDateUsingRawSQL
);
router.post(
  "/no-holiday-students-sql",
  verifyToken,
  getStudentsWithNoHolidayByDateRangeUsingRawSQL
);
router.post("/delete-holiday", verifyToken, deleteHoliday);

module.exports = router;
