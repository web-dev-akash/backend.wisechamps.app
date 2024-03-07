const express = require("express");
const Razorpay = require("razorpay");
const { createPaymentEntry } = require("../components/payment.component");
require("dotenv").config();
const paymentRouter = express.Router();

paymentRouter.post("/payment_links", async (req, res) => {
  try {
    const { email, amount } = req.body;
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.paymentLogs?.push({
    //   email: email,
    //   description: `EnteredEmail 200`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.paymentLogs
    //   ? fs.writeFile(
    //       "./logs.json",
    //       JSON.stringify(logsData, null, 2),
    //       (err) => {
    //         if (err) throw err;
    //       }
    //     )
    //   : null;
    const credits = {
      199: 5,
      499: 20,
      1999: 200,
    };
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });
    const expiryDate = Math.floor(
      new Date().setMinutes(new Date().getMinutes() + 60) / 1000
    );
    const data = await instance.paymentLink.create({
      amount: amount * 100,
      currency: "INR",
      description: `Live Quiz Payment for ${
        credits[amount] || Math.floor(amount / 40)
      } Quiz Balance`,
      customer: {
        email,
      },
      callback_url: `https://zoom.wisechamps.com?email=${email}`,
      callback_method: "get",
      expire_by: expiryDate,
    });
    // let oldDate1 = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.paymentLogs?.push({
    //   email: email,
    //   description: `PyamentLinkCreated 200`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate1).toLocaleTimeString("en-US"),
    // });
    // logsData.paymentLogs
    //   ? fs.writeFile(
    //       "./logs.json",
    //       JSON.stringify(logsData, null, 2),
    //       (err) => {
    //         if (err) throw err;
    //       }
    //     )
    //   : null;
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
      499: 20,
      1999: 200,
    };
    const id = req.body.payload.payment_link.entity.id;
    const amount = Number(req.body.payload.payment_link.entity.amount) / 100;
    const email = req.body.payload.payment_link.entity.customer.email;
    const payId = req.body.payload.payment.entity.id;
    const credits = plans[amount];
    const createdPayment = await createPaymentEntry({
      amount: amount,
      id: id,
      email: email,
      credits: credits,
      payId: payId,
    });
    // let oldDate = new Date().setMinutes(new Date().getMinutes() + 330);
    // logsData.paymentLogs?.push({
    //   email: email,
    //   description: `PaymentCaptured 200`,
    //   date: new Date().toDateString(),
    //   time: new Date(oldDate).toLocaleTimeString("en-US"),
    // });
    // logsData.paymentLogs
    //   ? fs.writeFile(
    //       "./logs.json",
    //       JSON.stringify(logsData, null, 2),
    //       (err) => {
    //         if (err) throw err;
    //       }
    //     )
    //   : null;
    return res.status(200).send({ status: "success", data: createdPayment });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

module.exports = paymentRouter;
