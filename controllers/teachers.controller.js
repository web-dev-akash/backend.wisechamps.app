const express = require("express");
const {
  getTeacherDetailsWithEmail,
  getDailyReports,
  updateTeachersAttendance,
} = require("../components/teacher.component");
const teacherRouter = express.Router();

teacherRouter.post("/", async (req, res) => {
  const { email } = req.body;
  const data = await getTeacherDetailsWithEmail(email);
  return res.status(200).send({
    ...data,
  });
});

teacherRouter.post("/report", async (req, res) => {
  try {
    const { grade } = req.body;
    const data = await getDailyReports(grade);
    res.status(200).send(data);
  } catch (error) {
    console.log("error---", error);
    return res.status(500).send(error);
  }
});

teacherRouter.post("/attendance", async (req, res) => {
  try {
    const body = req.body;
    const data = await updateTeachersAttendance(body);
    res.status(200).send(data);
  } catch (error) {
    console.log("error---", error);
    return res.status(500).send(error);
  }
});

module.exports = teacherRouter;
