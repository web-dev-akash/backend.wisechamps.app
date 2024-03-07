const express = require("express");
const {
  updateCoinsForWeeklyToppers,
} = require("../components/coins.component");
const coinsRouter = express.Router();

coinsRouter.post("/attendance", async (req, res) => {
  try {
    const { email } = req.body;
  } catch (error) {
    return res.status(500).send({
      message: error.message,
    });
  }
});

coinsRouter.get("/weekly/toppers", async (req, res) => {
  try {
    const data = await updateCoinsForWeeklyToppers();
    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).send({
      message: error.message,
    });
  }
});

module.exports = coinsRouter;
