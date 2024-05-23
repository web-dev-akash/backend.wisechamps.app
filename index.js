const express = require("express");
const cors = require("cors");
const meetingRouter = require("./controllers/meeting.controller");
const quizRouter = require("./controllers/quiz.controller");
const paymentRouter = require("./controllers/payment.controller");
const userRouter = require("./controllers/user.controller");
const referralRouter = require("./controllers/referral.controller");
const coinsRouter = require("./controllers/coins.controller");
const teacherRouter = require("./controllers/teachers.controller");
const logsRouter = require("./controllers/logs.controller");
const questionRouter = require("./controllers/question.controller");
const studentRouter = require("./controllers/student.controller");
const pointagramRouter = require("./controllers/pointagram.controller");

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));
const PORT = process.env.PORT || 8080;

app.use("/meeting", meetingRouter);
app.use("/quiz", quizRouter);
app.use("/user", userRouter);
app.use("/", paymentRouter);
app.use("/referral", referralRouter);
app.use("/", logsRouter);
app.use("/", questionRouter);
app.use("/teachers", teacherRouter);
app.use("/student", studentRouter);
app.use("/pointagram", pointagramRouter);
app.use("/coins", coinsRouter);

app.get("/", (req, res) => {
  res.status(200).send({
    message: "Server Started 🐱‍👤",
  });
});

app.listen(PORT, () => {
  console.log(`Server Started 🎈 http://localhost:${PORT}`);
});
