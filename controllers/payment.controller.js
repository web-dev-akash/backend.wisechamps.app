const express = require("express");
const Razorpay = require("razorpay");
const { createPaymentEntry } = require("../components/payment.component");
require("dotenv").config();
const paymentRouter = express.Router();

paymentRouter.post("/payment_links", async (req, res) => {
  try {
    const { email, amount, subject } = req.body;
    const credits = {
      199: 5,
      499: 25,
      999: 67,
      1999: 200,
    };

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const expiryDate = Math.floor(
      new Date().setMinutes(new Date().getMinutes() + 60) / 1000
    );

    if (subject) {
      const data = await instance.paymentLink.create({
        amount: amount * 100,
        currency: "INR",
        description: `${subject} Test Series with 5 Mock Tests and 15 Doubt Sessions`,
        customer: {
          name: subject,
          email,
        },
        callback_url: `https://students.wisechamps.com`,
        callback_method: "get",
        expire_by: expiryDate,
      });

      return res.status(200).send(data);
    }

    const data = await instance.paymentLink.create({
      amount: amount * 100,
      currency: "INR",
      description: `Live Quiz Payment for ${
        credits[amount] || Math.floor(amount / 40)
      } Quiz Balance`,
      customer: {
        email,
      },
      callback_url: `https://students.wisechamps.com`,
      callback_method: "get",
      expire_by: expiryDate,
    });
    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).send(error);
  }
});

paymentRouter.post("/payment/capture", async (req, res) => {
  try {
    const plans = {
      1: 1,
      199: 5,
      499: 25,
      999: 67,
      1999: 200,
    };

    const id = req.body.payload.payment_link.entity.id;
    const amount = Number(req.body.payload.payment_link.entity.amount) / 100;
    const email = req.body.payload.payment_link.entity.customer.email;
    const subject = req.body.payload.payment_link.entity.customer.name;
    const payId = req.body.payload.payment.entity.id;
    const credits = !subject ? plans[amount] : 0;

    const createdPayment = await createPaymentEntry({
      amount: amount,
      id: id,
      email: email,
      credits: credits,
      payId: payId,
      subject: subject,
    });

    return res.status(200).send({ status: "success", data: createdPayment });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

module.exports = paymentRouter;
