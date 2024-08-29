const { default: axios } = require("axios");
const { getZohoTokenOptimized } = require("./common.component");

const dailyQuizQuestions = async (email) => {
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const contact = await axios.get(
    `https://www.zohoapis.com/crm/v2/Contacts/search?email=${email}`,
    zohoConfig
  );

  if (contact.status >= 400) {
    return {
      status: contact.status,
      mode: "internalservererrorinfindinguser",
    };
  }
  // return { contact };
  if (contact.status === 204) {
    return {
      status: contact.status,
      mode: "nouser",
    };
  }
  const contactid = contact.data.data[0].id;
  const name = contact.data.data[0].Student_Name;
  const phone = contact.data.data[0].Phone;
  const grade = contact.data.data[0].Student_Grade;
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  // console.log("Start", formattedDateStart);

  const questionAttemptBody = {
    select_query: `select Contact_Name from Questions_Attempt where Attempt_Date = '${formattedDate}' and Contact_Name = '${contactid}'`,
  };

  const questionAttempt = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    questionAttemptBody,
    zohoConfig
  );

  if (questionAttempt.status === 200) {
    return {
      mode: "alreadyAttempted",
    };
  }

  const questionBody = {
    select_query: `select Correct_Answer,Question,Question_Image_URL,Question_Grade,Option_1,Option_2,Option_3,Option_4 from Questions where Question_Date = '${formattedDate}'`,
  };

  const question = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    questionBody,
    zohoConfig
  );

  if (question.status >= 400) {
    return {
      status: question.status,
      mode: "internalservererrorinfindingquestion",
    };
  }

  if (question.status === 204) {
    return {
      status: question.status,
      mode: "noquestion",
    };
  }

  const totalQuestionAttemptsBody = {
    select_query: `select Correct_Answer, Attempt_Date from Questions_Attempt where Contact_Name = '${contactid}'`,
  };

  const totalQuestionAttempt = await axios.post(
    `https://www.zohoapis.com/crm/v3/coql`,
    totalQuestionAttemptsBody,
    zohoConfig
  );

  let currstreak = 1;
  let finalstreak = 1;
  let minPercentage = 15;
  let maxPercentage = 92;
  let finalPercentage = minPercentage;
  let totalcorrect = 0;
  let finalData = [];

  if (totalQuestionAttempt.data.data) {
    const sortedAttemptData = totalQuestionAttempt.data?.data?.sort(
      (a, b) =>
        new Date(b.Attempt_Date).getTime() - new Date(a.Attempt_Date).getTime()
    );

    finalData =
      sortedAttemptData.length > 5
        ? sortedAttemptData.slice(0, 5)
        : sortedAttemptData;

    for (let i = 1; i < sortedAttemptData.length; i++) {
      let currDate = new Date(sortedAttemptData[i].Attempt_Date);
      let prevDate = new Date(sortedAttemptData[i - 1].Attempt_Date);
      const timeDiff = Math.abs(prevDate - currDate);
      const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currstreak++;
      } else {
        finalstreak = Math.max(currstreak, finalstreak);
        currstreak = 1;
      }
    }

    finalstreak = Math.max(currstreak, finalstreak);

    const totalAttempts = totalQuestionAttempt.data.data;
    for (let i = 0; i < totalAttempts.length; i++) {
      if (totalAttempts[i].Correct_Answer) {
        totalcorrect++;
      }
    }
    const currPercentage = Math.round(
      (totalcorrect / totalAttempts.length) * 100
    );

    finalPercentage = Math.max(minPercentage, currPercentage);
    finalPercentage = Math.min(maxPercentage, finalPercentage);
  }

  for (let i = 0; i < question.data.data.length; i++) {
    const questionGrade = question.data.data[i].Question_Grade;
    const correctQuestion = questionGrade.find((res) => res === grade);
    if (correctQuestion) {
      return {
        status: 200,
        mode: "question",
        id: contactid,
        name,
        phone,
        grade,
        attempts: finalData,
        streak: finalstreak,
        percentage: finalPercentage,
        question: question.data.data[i],
      };
    }
  }
  return {
    status: 204,
    mode: "noquestion",
  };
};

const dailyQuizQuestionsWithGrade = async (grade, contactId) => {
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  const alreadyAttemptedBody = {
    select_query: `select Question.id as Question_Id, Question.Question as Question,Question.Option_1 as Option_1,Question.Option_2 as Option_2,Question.Option_3 as Option_3,Question.Option_4 as Option_4,Question.Question_Image_URL as Question_Image_URL, Correct_Answer, Option_Selected from Questions_Attempt where Attempt_Date = '${formattedDate}' and Contact_Name = '${contactId}'`,
  };

  const alreadyAttempted = await axios.post(
    `https://www.zohoapis.com/crm/v6/coql`,
    alreadyAttemptedBody,
    zohoConfig
  );

  if (alreadyAttempted.status === 200) {
    const attempt = alreadyAttempted.data.data[0];
    return {
      status: 409,
      id: attempt.Question_Id,
      question: attempt.Question,
      answer: attempt.Correct_Answer,
      options: [
        attempt.Option_1,
        attempt.Option_2,
        attempt.Option_3,
        attempt.Option_4,
      ],
      image: attempt.Question_Image_URL,
      selected: attempt.Option_Selected,
    };
  }

  let gradeGroup = null;
  if (grade == 1 || grade == 2) {
    gradeGroup = "1;2";
  } else if (grade == 3 || grade == 4) {
    gradeGroup = "3;4";
  } else if (grade == 5 || grade == 6) {
    gradeGroup = "5;6";
  } else if (grade == 7 || grade == 8) {
    gradeGroup = "7;8";
  }

  const questionBody = {
    select_query: `select Correct_Answer,Question,Question_Image_URL,Option_1,Option_2,Option_3,Option_4 from Questions where Question_Date = '${formattedDate}' and Question_Grade	= '${gradeGroup}'`,
  };

  const question = await axios.post(
    `https://www.zohoapis.com/crm/v6/coql`,
    questionBody,
    zohoConfig
  );

  if (question.status >= 400 || question.status === 204) {
    return {
      status: question.status,
      mode: "error",
    };
  }

  const questionRes = question.data.data[0];

  return {
    status: 200,
    id: questionRes.id,
    question: questionRes.Question,
    answer: questionRes.Correct_Answer,
    options: [
      questionRes.Option_1,
      questionRes.Option_2,
      questionRes.Option_3,
      questionRes.Option_4,
    ],
    image: questionRes.Question_Image_URL,
  };
};

const createQuestionAttemptEntry = async ({
  contactId,
  questionId,
  optionSelected,
  correctAnswer,
}) => {
  const accessToken = await getZohoTokenOptimized();
  const zohoConfig = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;
  const body = {
    data: [
      {
        Attempt_Date: formattedDate,
        Contact_Name: contactId,
        Correct_Answer: correctAnswer,
        Option_Selected: optionSelected,
        Question: questionId,
      },
    ],
    apply_feature_execution: [
      {
        name: "layout_rules",
      },
    ],
    trigger: ["workflow"],
  };
  const result = await axios.post(
    `https://www.zohoapis.com/crm/v2/Questions_Attempt`,
    body,
    zohoConfig
  );
  return {
    status: result.status,
    data: result.data.data,
  };
};

module.exports = {
  dailyQuizQuestions,
  dailyQuizQuestionsWithGrade,
  createQuestionAttemptEntry,
};
