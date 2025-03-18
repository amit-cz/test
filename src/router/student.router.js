const express = require("express");
const {
  register,
  update_student,
  getStudentByEmail,
  getAllStudents,
  delete_students,
  update_marks,
  update_subjects,
  delete_subject,
  login,
  getDetailsOfParentLinkedStudents,
  getDetailsOfParentNotLinkedStudents,
} = require("../controller/student.controller");
const verifyToken = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", register);
router.post("/login", login);
router.post("/all", verifyToken, getAllStudents);
router.post("/update-student", verifyToken, update_student);
router.post("/details", verifyToken, getStudentByEmail);
router.post("/delete", verifyToken, delete_students);
router.post("/update-marks", verifyToken, update_marks);
router.post("/update-subjects", verifyToken, update_subjects);
router.post("/delete-subject", verifyToken, delete_subject);
router.post(
  "/details-linked-parent",
  verifyToken,
  getDetailsOfParentLinkedStudents
);
router.post(
  "/details-not-linked-parent",
  verifyToken,
  getDetailsOfParentNotLinkedStudents
);

module.exports = router;
