const express = require("express");
const {
  updateCoinsForWeeklyToppers,
} = require("../components/coins.component");
const { authMiddleware } = require("../components/common.component");
const coinsRouter = express.Router();

coinsRouter.get("/weekly/toppers", authMiddleware, async (req, res) => {
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
