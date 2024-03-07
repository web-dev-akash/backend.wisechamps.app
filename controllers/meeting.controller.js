const express = require("express");
const { getMeetingLink } = require("../components/meeting.component");
const meetingRouter = express.Router();

meetingRouter.post("/", async (req, res) => {
  const { email, payId } = req.body;
  const data = await getMeetingLink(email, payId);
  res.status(200).send({
    ...data,
  });
});

module.exports = meetingRouter;
