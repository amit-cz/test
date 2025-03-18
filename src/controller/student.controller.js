const {
  register_schema,
  update_schema,
  validate_email,
  login_schema,
  update_subject_schema,
} = require("../schema/student.schema");
const { PrismaClient } = require("@prisma/client");
const { generateToken } = require("../utils/token");
const { hashPassword, verifyPassword } = require("../utils/password");

const Prisma = new PrismaClient();

// register student
const register = async (req, res) => {
  try {
    // Step 1: Validate request body
    const { first_name, last_name, email, subject_names, password } =
      await register_schema.validateAsync(req.body);

    // Step 2: Check if the student already exists
    const existingStudent = await Prisma.student.findUnique({
      where: { email },
    });

    if (existingStudent) {
      return res.status(409).json({ message: "Student already exists!" });
    }

    // Step 3: Handle subjects (connect or create new ones)
    const subjects = await Promise.all(
      subject_names.map(async (subject_name) => {
        // Check if the subject already exists
        const existingSubject = await Prisma.subject.findUnique({
          where: { name: subject_name },
        });

        if (existingSubject) {
          return { id: existingSubject.id }; // If subject exists, connect it by its ID
        } else {
          // If subject doesn't exist, create a new subject
          const newSubject = await Prisma.subject.create({
            data: { name: subject_name },
          });
          return { id: newSubject.id }; // Return the new subject's ID
        }
      })
    );

    // Step 4: Hash password
    const hashedPassword = hashPassword(password);

    // Step 5: Create the student and associate the subjects
    const newStudent = await Prisma.student.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        subjects: {
          create: subjects.map((subject) => ({
            subjectId: subject.id, // Assign subjectId for enrollment
          })),
        },
      },
      omit: {
        password: true,
      },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Step 6: Send the response with the student and the associated subjects
    res.status(201).json({
      message: "Student registered successfully",
      student: {
        ...newStudent,
        subjects: newStudent.subjects.map((enrollment) => ({
          marks: enrollment.marks,
          subject_name: enrollment.subject ? enrollment.subject.name : null,
        })),
      },
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error("Server Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

// login student
const login = async (req, res) => {
  try {
    // Step 1: Validate data
    const { email, password } = await login_schema.validateAsync(req.body);

    // Step 2: Check user exists or not
    const student = await Prisma.student.findUnique({
      where: {
        email: email,
      },
    });
    if (!student) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Step 3: Compare the password with the saved password
    const isVerifiedPassword = verifyPassword(password, student.password);
    if (!isVerifiedPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Step 4: Generate token
    const payload = {
      id: student.id,
    };
    const token = generateToken(payload);

    // Step 5: Set cookie and send response
    res.cookie("token", token, {
      httpOnly: true, // Prevents client-side JavaScript access
      secure: process.env.NODE_ENV === "production", // Ensures secure cookie in production
      sameSite: "Strict", // Prevents CSRF attacks
      maxAge: 24 * 60 * 60 * 1000, // 1-day expiration
    });

    res.status(200).json({
      message: "Login successful",
      token: token,
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error.message);
    res.status(500).send(error.message);
  }
};

// update students
const update_student = async (req, res) => {
  try {
    // Step 1: Get data from body
    const { email, first_name, last_name, new_email } = req.body;

    // Step 2: Validate the data
    await update_schema.validateAsync({
      email,
      first_name,
      last_name,
      new_email,
    });

    // Step 2: Check if the student exists or not
    const student = await Prisma.student.findUnique({
      where: {
        email: email,
        status: true,
      },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Step 3: Check if new email is exists or not
    if (new_email === student.email) {
      return res
        .status(400)
        .json({ message: "New email is already exists. Use different email" });
    }

    const data = {
      first_name: first_name,
      last_name: last_name,
      email: new_email,
    };

    // Step 5: Handle subject updates
    const updatedData = await Prisma.student.update({
      where: {
        email: email,
      },
      data: data,
      omit: {
        password: true,
        id: true,
      },
    });

    // Step 7: Send the response
    res.status(200).json({
      message: "Successfully updated",
      UpdatedData: updatedData,
      ...(req.token && { token: req.token }),
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error.message);
    res.status(500).send(error.message);
  }
};

// get students by email
const getStudentByEmail = async (req, res) => {
  try {
    // Step 1: Get email from body
    const { email } = req.body;

    // Step 2: Validate the email
    await validate_email.validateAsync({ email });

    // Step 3: Get details of user if exists
    const student = await Prisma.student.findUnique({
      where: {
        email: email,
        status: true,
      },
      omit: {
        password: true,
      },
      include: {
        subjects: {
          omit: {
            id: true,
            studentId: true,
            subjectId: true,
          },
          include: {
            subject: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    if (student) {
      student.subjects = student.subjects.map((enrollment) => ({
        name: enrollment.subject.name,
        marks: enrollment.marks,
      }));
    } else {
      return res.status(404).json({ message: "Student not found" });
    }

    // Step 4: Send the response
    res.status(200).json({
      message: "Successfully retrieved",
      data: student,
      ...(req.token && { token: req.token }),
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error.message);
    res.status(500).send(error.message);
  }
};

// get all students
const getAllStudents = async (req, res) => {
  try {
    // Step 1: Extract body parameters with default values
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 5;
    const skip = (page - 1) * limit;

    // Step 2: Get total number of students for pagination metadata
    const totalStudents = await Prisma.student.count();

    // Step 3: Fetch paginated students with their subjects and marks
    const students = await Prisma.student.findMany({
      where: {
        status: true,
      },
      skip,
      take: limit,
      omit: {
        password: true,
      },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Step 4: Transform subjects data
    const transformedStudents = students.map((student) => ({
      ...student,
      subjects: student.subjects.map((enrollment) => ({
        name: enrollment.subject.name,
        marks: enrollment.marks,
      })),
    }));

    // Step 5: Calculate total pages
    const totalPages = Math.ceil(totalStudents / limit);

    // Step 6: Send paginated response
    res.status(200).json({
      message: "Successfully retrieved data",
      currentPage: page,
      totalPages,
      totalStudents,
      data: transformedStudents,
      ...(req.token && { token: req.token }),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
};

// delete students
const delete_students = async (req, res) => {
  try {
    // Step 1: Get the email from body
    const { email } = req.body;

    // Step 2: Validate the email
    await validate_email.validateAsync({ email });

    // Step 3: Check user exists of not
    const student = await Prisma.student.findUnique({
      where: {
        email: email,
      },
      omit: {
        password: true,
      },
      include: {
        subjects: true,
      },
    });
    if (!student) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid or missing credentials" });
    }

    // Step 4: Disassociate subjects
    // await Prisma.enrollment.deleteMany({
    //   where: {
    //     studentId: student.id,
    //   },
    // });

    // Step 4: Delete the student
    // await Prisma.student.delete({
    //   where: {
    //     email: email,
    //   },
    // });

    // Step 4: Used soft delete
    await Prisma.student.update({
      where: {
        id: student.id,
      },
      data: {
        status: false,
      },
    });

    // Step 5: Send the response to user
    res.status(200).json({
      message: "Successfully deleted student",
      ...(req.token && { token: req.token }),
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error.message);
    res.status(500).send(error.message);
  }
};

// update marks of a student
const update_marks = async (req, res) => {
  try {
    // Step 1: Get data from the request body
    const { subjectId, marks, email } = req.body;

    // Step 2: Validate the email
    await validate_email.validateAsync({ email });

    // Step 3: Check if the student exists or not
    const student = await Prisma.student.findUnique({
      where: {
        email: email,
        status: true,
      },
    });
    if (!student) {
      return res.status(401).json({
        message: "Unauthorized: Invalid or missing credentials",
      });
    }

    // Step 4: Validate the marks
    if (typeof marks !== "number" || marks < 0) {
      return res.status(400).json({ message: "Invalid marks provided" });
    }

    // Step 5: Find the subject by id
    const subject = await Prisma.subject.findUnique({
      where: {
        id: subjectId,
      },
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Step 6: Check if the student is enrolled in the subject
    const enrollment = await Prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: student.id,
          subjectId: subject.id,
        },
      },
    });
    if (!enrollment) {
      return res.status(404).json({
        message: "Student is not enrolled in this subject",
      });
    }

    // Step 7: Update the marks in the enrollment table
    await Prisma.enrollment.update({
      where: {
        id: enrollment.id, // Find the enrollment record to update
      },
      data: {
        marks: marks,
      },
    });

    // Step 8: Send the response
    res.status(200).json({
      message: "Marks updated successfully",
      ...(req.token && { token: req.token }),
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error.message);
    res.status(500).send(error.message);
  }
};

// update subjects of a student
const update_subjects = async (req, res) => {
  try {
    // Step 1: Get data from body
    const { email, subject_names } = req.body;

    // Step 2: Validate the email
    await update_subject_schema.validateAsync({ email, subject_names });

    // Step 3: Check if the student exists
    const student = await Prisma.student.findUnique({
      where: {
        email: email,
        status: true,
      },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Step 4: Fetch existing subjects
    const existingSubjects = await Prisma.subject.findMany({
      where: {
        name: { in: subject_names },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Step 5: Find missing subjects (not in the database)
    const existingSubjectNames = existingSubjects.map((subj) => subj.name);
    const missingSubjects = subject_names.filter(
      (name) => !existingSubjectNames.includes(name)
    );

    // Step 6: Insert missing subjects
    if (missingSubjects.length > 0) {
      await Prisma.subject.createMany({
        data: missingSubjects.map((name) => ({ name })),
        skipDuplicates: true,
      });

      // Fetch newly created subjects
      const newlyCreatedSubjects = await Prisma.subject.findMany({
        where: {
          name: { in: missingSubjects },
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Combine existing and new subjects
      existingSubjects.push(...newlyCreatedSubjects);
    }

    // Step 7: Upsert enrollments (associate subjects with student)
    for (const subject of existingSubjects) {
      await Prisma.enrollment.upsert({
        where: {
          studentId_subjectId: {
            studentId: student.id,
            subjectId: subject.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          subjectId: subject.id,
          marks: 0,
        },
      });
    }

    // Step 8: Send success response
    res.status(200).json({
      message: "Subjects updated successfully",
      data: existingSubjects,
      ...(req.token && { token: req.token }),
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error.message);
    res.status(500).send(error.message);
  }
};

// delete subject by id
const delete_subject = async (req, res) => {
  try {
    // Step 1: Get the subject id and student email from body
    const { subjectId, email } = req.body;

    // Step 2: Validate the email and subjectId
    await validate_email.validateAsync({ email });
    if (typeof subjectId !== "number" || subjectId < 0) {
      return res.status(400).json({ message: "Invalid subjectId provided" });
    }

    // Step 3: check that subject is associated with the students
    const student = await Prisma.student.findUnique({
      where: {
        email: email,
        status: true,
      },
    });
    const enrollment = await Prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: student.id,
          subjectId: subjectId,
        },
      },
    });
    if (!enrollment) {
      return res.status(400).json({ message: "Association not found" });
    }

    // Step 4: Delete the subject for that student
    await Prisma.enrollment.delete({
      where: {
        studentId_subjectId: {
          studentId: student.id,
          subjectId: subjectId,
        },
      },
    });

    // Step 5: Send the response
    res.status(200).json({
      message: "Subject deleted Successfully",
      ...(req.token && { token: req.token }),
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error.message);
    res.status(500).send(error.message);
  }
};

// Get all students details with parents if the student linked with parent
const getDetailsOfParentLinkedStudents = async (req, res) => {
  try {
    // Step 1: Get details of all students who are linked to a parent
    const students = await Prisma.student.findMany({
      where: {
        parent: {
          isNot: null,
        },
      },
      omit: {
        password: true,
      },
      include: {
        parent: {
          omit: {
            parentId: true,
            id: true,
            studentId: true,
          },
          include: {
            parent: {
              omit: {
                password: true,
              },
            },
          },
        },
      },
    });

    // Step 2: Handle no students found
    if (!students || students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students linked to any parent found." });
    }

    // Step 3: Send the response
    const formatedStudents = students.map((students) => ({
      ...students,
      parent: students.parent.parent,
    }));
    res
      .status(200)
      .json({ message: "Successfully fetched", data: formatedStudents });
  } catch (error) {
    console.error("Error fetching students:", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all students details when they dont linked with parent
const getDetailsOfParentNotLinkedStudents = async (req, res) => {
  try {
    // Step 1: Fetch students who are NOT linked to a parent
    const students = await Prisma.student.findMany({
      where: {
        parent: null,
      },
      omit: {
        password: true,
      },
    });

    // Step 2: Handle case where no students are found
    if (!students || students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students without parents found." });
    }

    // Step 3: Send response
    res.status(200).json({ message: "Successfully fetched", data: students });
  } catch (error) {
    console.error("Error fetching students:", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  register,
  login,
  update_student,
  getStudentByEmail,
  getAllStudents,
  delete_students,
  update_marks,
  update_subjects,
  delete_subject,
  getDetailsOfParentLinkedStudents,
  getDetailsOfParentNotLinkedStudents,
};
