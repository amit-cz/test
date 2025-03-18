const express = require("express");
const {
  parent_register,
  parent_login,
  link_student,
  parent_details,
  update_parent_details,
} = require("../controller/parent.controller");
const verifyToken = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", parent_register);
router.post("/login", parent_login);
router.post("/link-student", verifyToken, link_student);
router.post("/parent-details", verifyToken, parent_details);
router.post("/update-parent", verifyToken, update_parent_details);

module.exports = router;
