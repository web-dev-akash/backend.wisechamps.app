const express = require("express");
const {
  getTeacherDetailsWithEmail,
  getDailyReports,
  updateTeachersAttendance,
  getLastSessionReport,
} = require("../components/teacher.component");
const { authMiddleware } = require("../components/common.component");
const teacherRouter = express.Router();

teacherRouter.post("/", authMiddleware, async (req, res) => {
  const { email, password } = req.body;
  const data = await getTeacherDetailsWithEmail(email, password);
  return res.status(200).send({
    ...data,
  });
});

teacherRouter.post("/report", authMiddleware, async (req, res) => {
  try {
    const { grade, date } = req.body;
    const data = await getDailyReports(grade, date);
    res.status(200).send(data);
  } catch (error) {
    return res.status(500).send(error);
  }
});

teacherRouter.post("/attendance", authMiddleware, async (req, res) => {
  try {
    const body = req.body;
    const data = await updateTeachersAttendance(body);
    res.status(200).send(data);
  } catch (error) {
    console.log("error---", error);
    return res.status(500).send(error);
  }
});

teacherRouter.post("/lastSession", authMiddleware, async (req, res) => {
  try {
    const { grade } = req.body;
    const data = await getLastSessionReport(grade);
    res.status(200).send(data);
  } catch (error) {
    return res.status(500).send(error);
  }
});

module.exports = teacherRouter;
