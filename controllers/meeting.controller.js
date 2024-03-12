const express = require("express");
const { getMeetingLink } = require("../components/meeting.component");
const meetingRouter = express.Router();

meetingRouter.post("/", async (req, res) => {
  const { email } = req.body;
  const data = await getMeetingLink(email);
  res.status(200).send({
    ...data,
  });
});

module.exports = meetingRouter;
