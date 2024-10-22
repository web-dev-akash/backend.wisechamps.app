const express = require("express");
const logsRouter = express.Router();

// update logs to sheet and remove from the file
logsRouter.get("/updateLogs", (req, res) => {
  try {
    fs.readFile("./logs.json", async (err, data) => {
      if (err) throw err;
      if (data) {
        const logsDataFinal = JSON.parse(data);
        const zoomLogs = logsDataFinal.zoomLogs;
        const quizLogs = logsDataFinal.quizLogs;
        const paymentLogs = logsDataFinal.paymentLogs;
        const dailyLogs = logsDataFinal.dailyLogs;
        const reportLogs = logsDataFinal.reportLogs;
        const referralLogs = logsDataFinal.referralLogs;
        const urlZoom =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=zoom";
        const responseZoom =
          zoomLogs?.length > 0 ? await axios.post(urlZoom, zoomLogs) : null;
        const urlQuiz =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=quiz";
        const responseQuiz =
          quizLogs?.length > 0 ? await axios.post(urlQuiz, quizLogs) : null;
        const urlPayment =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=payment";
        const responsePayment =
          paymentLogs?.length > 0
            ? await axios.post(urlPayment, paymentLogs)
            : null;
        const urlDaily =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=daily";
        const responseDaily =
          dailyLogs?.length > 0 ? await axios.post(urlDaily, dailyLogs) : null;
        const urlReport =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=report";
        const responseReport =
          reportLogs?.length > 0
            ? await axios.post(urlReport, reportLogs)
            : null;
        const urlReferral =
          "https://script.google.com/macros/s/AKfycbzfelbwgNpG1v4zY8t-avVggcgH3K_7yE-r7B7eTWF45lt1q_guT4qaQTaEiYccHy-b/exec?type=referral";
        const responseReferral =
          referralLogs?.length > 0
            ? await axios.post(urlReferral, referralLogs)
            : null;
        logsData = {};
        const newLogsData = {
          zoomLogs: [],
          quizLogs: [],
          paymentLogs: [],
          dailyLogs: [],
          reportLogs: [],
          referralLogs: [],
        };

        fs.writeFile(
          "./logs.json",
          JSON.stringify(newLogsData, null, 2),
          (err) => {
            if (err) throw err;
          }
        );

        return res.status(200).send({
          zoom: responseZoom?.data,
          quiz: responseQuiz?.data,
          payment: responsePayment?.data,
          daily: responseDaily?.data,
          report: responseReport?.data,
        });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

module.exports = logsRouter;
