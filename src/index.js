require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const studentRoute = require("./router/student.router");
const parentRoute = require("./router/parent.router");
const holidayRoute = require("./router/holiday.router");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use cookie-parser middleware
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    Status: "UP",
    timestamp: new Date(Date.now()),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Student Management System",
  });
});

app.use("/api/v1/student", studentRoute);
app.use("/api/v1/parent", parentRoute);
app.use("/api/v1/holiday", holidayRoute);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
