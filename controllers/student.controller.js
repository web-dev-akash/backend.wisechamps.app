const express = require("express");
const { getStudentDetails } = require("../components/student.component");
const {
  getZohoTokenOptimized,
  authMiddleware,
  getProductsFromStore,
} = require("../components/common.component");
const { default: axios } = require("axios");
const studentRouter = express.Router();

studentRouter.post("/", async (req, res) => {
  try {
    const { email } = req.body;
    const data = await getStudentDetails(email);
    return res.status(200).send(data);
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

studentRouter.get("/store", authMiddleware, async (req, res) => {
  try {
    const data = await getProductsFromStore();
    return res.status(200).send(data);
  } catch (error) {
    return res.status(error.status || 500).send({
      status: "error",
      message: error.message,
      code: error.status || 500,
    });
  }
});

studentRouter.post("/tution/create", async (req, res) => {
  try {
    const { teacherEmail, students } = req.body;
    const zohoToken = await getZohoTokenOptimized();
    const zohoConfig = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${zohoToken}`,
      },
    };

    const teacher = await axios.get(
      `https://www.zohoapis.com/crm/v2/Contacts/search?email=${teacherEmail}`,
      zohoConfig
    );

    if (teacher.status >= 400) {
      return {
        status: teacher.status,
        mode: "internalservererrorinfindinguser",
      };
    }

    if (teacher.status === 204) {
      return {
        status: teacher.status,
        mode: "nouser",
      };
    }

    const teacherId = teacher.data.data[0].id;
    const teacherFullName = teacher.data.data[0].Full_Name;
    const teacherName =
      teacher.data.data[0].Full_Name.split(" ")[0].toLowerCase();

    const result = [];
    for (let i = 0; i < students.length; i++) {
      const studentFullName = students[i].name;
      const studentName = students[i].name.split(" ")[0].toLowerCase();
      const studentGrade = students[i].grade;
      const randomNumber = (1000 + Math.random() * 9000).toFixed(0);
      const studentEmail = `${teacherName}${studentName}${randomNumber}@wisechamps.com`;
      const studentPhone = `${teacherName}${studentName}`;

      const body = {
        data: [
          {
            Email: studentEmail,
            Phone: studentPhone,
            Last_Name: "Parent",
            Student_Name: studentFullName,
            Student_Grade: studentGrade,
            Source_Campaign: "Tution Community",
            Contact_Teacher: teacherId,
          },
        ],
        apply_feature_execution: [
          {
            name: "layout_rules",
          },
        ],
        trigger: ["workflow"],
      };
      const student = await axios.post(
        `https://www.zohoapis.com/crm/v2/Contacts`,
        body,
        zohoConfig
      );

      if (student.status >= 400) {
        result.push({
          status: student.status,
          mode: "internalservererrorinfindinguser",
          email: studentEmail,
        });
        continue;
      }
      if (student.data.data[0].code === "DUPLICATE_DATA") {
        result.push({
          status: student.status,
          mode: "duplicateuser",
          email: studentEmail,
        });
        continue;
      }
      result.push({
        status: student.status,
        mode: "userAdded",
        email: studentEmail,
      });
    }
    res.status(200).send({
      status: 200,
      mode: "useradded",
      result: result,
      teacher: teacherFullName,
      teacherEmail: teacherEmail,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

module.exports = studentRouter;
