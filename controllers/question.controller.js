const express = require("express");
const {
  dailyQuizQuestions,
  dailyQuizQuestionsWithGrade,
  createQuestionAttemptEntry,
} = require("../components/question.component");
const questionRouter = express.Router();

questionRouter.post("/dailyQuiz", async (req, res) => {
  try {
    const { email } = req.body;
    const data = await dailyQuizQuestions(email);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

questionRouter.post("/quizgrade", async (req, res) => {
  try {
    const { grade } = req.body;
    const data = await dailyQuizQuestionsWithGrade(grade);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

questionRouter.post("/question/attempt", async (req, res) => {
  try {
    const { contactId, questionId, optionSelected, correctAnswer } = req.body;
    const data = await createQuestionAttemptEntry({
      contactId,
      questionId,
      optionSelected,
      correctAnswer,
    });
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

module.exports = questionRouter;
