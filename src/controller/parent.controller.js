const {
  parent_register_schema,
  parent_login_schema,
  parent_update_schema,
} = require("../schema/parent.schema");
const { PrismaClient } = require("@prisma/client");
const { hashPassword, verifyPassword } = require("../utils/password");
const { generateToken } = require("../utils/token");

const Prisma = new PrismaClient();

// Register Parent
const parent_register = async (req, res) => {
  try {
    // Step 1: Get data from user
    const { first_name, last_name, email, password } = req.body;

    // Step 2: Validate the data
    await parent_register_schema.validateAsync({
      first_name,
      last_name,
      email,
      password,
    });

    // Step 3: Check if user already exists or not
    const isExists = await Prisma.parent.findUnique({
      where: {
        email: email,
      },
    });
    if (isExists) {
      return res.status(409).json({ message: "User already exists!" });
    }

    // Step 4: Hash the password
    const hashedPassword = hashPassword(password);

    // Step 5: Store the users data
    const response = await Prisma.parent.create({
      data: {
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: hashedPassword,
      },
      omit: {
        password: true,
      },
    });

    // Step 6: Send the response to the user
    res
      .status(201)
      .json({ message: "Parent registered successfully!", data: response });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Login Parent
const parent_login = async (req, res) => {
  try {
    // Step 1: Get the data from the user
    const { email, password } = req.body;

    // Step 2: Validate the data
    await parent_login_schema.validateAsync({ email, password });

    // Step 3: Check that user is exists or not
    const parent = await Prisma.parent.findUnique({
      where: {
        email: email,
      },
    });
    if (!parent) {
      return res.status(400).json({ message: "Invalid credential" });
    }

    // Step 4: Verify the password
    const isVerified = verifyPassword(password, parent.password);
    if (!isVerified) {
      return res.status(400).json({ message: "Invalid credential" });
    }

    // Step 5: Create a token
    const payload = {
      id: parent.id,
    };
    const token = generateToken(payload);

    // Step 6: Send the token to the user
    res.status(200).json({ message: "Login successfull", token: token });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Link with student
const link_student = async (req, res) => {
  try {
    // Step 1: Check the authorization for parent
    const parent = await Prisma.parent.findUnique({
      where: { id: req.id },
    });
    if (!parent) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    // Step 2: Get data from body
    const { studentId } = req.body;

    // Step 3: Validate the data
    if (typeof studentId !== "number" || studentId < 0) {
      return res.status(400).json({ message: "Invalid student ID provided" });
    }

    // Step 4: Check if the student exists
    const student = await Prisma.student.findUnique({
      where: { id: studentId, status: true },
    });

    if (!student || !student.status) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Step 5: Check if parentId or studentId is already present in any association
    const existingAssociation = await Prisma.parent_student.findFirst({
      where: {
        OR: [
          { parentId: parent.id },
          { studentId: student.id },
          { parentId: parent.id, studentId: student.id },
        ],
      },
    });

    if (existingAssociation) {
      return res.status(409).json({
        message: "Parent or student is already associated!",
      });
    }

    // Step 6: Associate them
    await Prisma.parent_student.create({
      data: {
        parentId: parent.id,
        studentId: student.id,
      },
    });

    // Step 7: Send the response to the user
    res.status(201).json({ message: "Parent and student are now associated" });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Get parent details using email
const parent_details = async (req, res) => {
  try {
    // Step 1: Get the parent details using req.id
    const parent = await Prisma.parent.findUnique({
      where: {
        id: req.id,
      },
      omit: {
        password: true,
      },
      include: {
        student: {
          include: {
            student: {
              omit: {
                password: true,
                id: true,
              },
            },
          },
        },
      },
    });

    // Step 2: Check parent exists or not
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Step 3: Send the result
    parent.student = parent.student.student;
    res.status(200).json({ message: "Successfully retrived", data: parent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// update parent details
const update_parent_details = async (req, res) => {
  try {
    // Step 1: Check parent is exists or not
    const parent = await Prisma.parent.findUnique({
      where: {
        id: req.id,
      },
    });
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Step 2: Get the data from body
    const { first_name, last_name, email } = req.body;

    // Step 3: Validate the data
    await parent_update_schema.validateAsync({ first_name, last_name, email });

    // Step 4: Check if the data is already exists or not
    if (
      parent.email === email ||
      parent.first_name === first_name ||
      parent.last_name === last_name
    ) {
      return res.status(400).json({ message: "Given data is already present" });
    }

    // Step 5: If there is new email then check first that email is already exists or not
    const isExists = await Prisma.parent.findFirst({
      where: {
        email: email,
      },
    });
    if (isExists) {
      return res.status(400).json({ message: "Email is already taken" });
    }

    // Step 6: update the data
    const data = {
      first_name: first_name,
      last_name: last_name,
      email: email,
    };
    const updated_data = await Prisma.parent.update({
      where: {
        id: parent.id,
      },
      data: data,
      omit: {
        password: true,
      },
    });

    // Step 7: Send the response to the user
    res
      .status(200)
      .json({ message: "Data updated successfully!", data: updated_data });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
  parent_register,
  parent_login,
  link_student,
  parent_details,
  update_parent_details,
};
