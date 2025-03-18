const {
  create_holiday_schema,
  assign_holiday_schema,
  date_validation_schema,
  delete_holiday_schema,
} = require("../schema/holiday.schema");
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const createHoliday = async (req, res) => {
  try {
    // Step 1: Get data from body
    let { name, start_date, end_date } = req.body;

    start_date = new Date(start_date);
    end_date = end_date ? new Date(end_date) : undefined;

    // Step 2: Validate the data
    await create_holiday_schema.validateAsync({ name, start_date, end_date });

    // Step 3: Check if holiday already exists with the same name or overlapping dates
    const existingHoliday = await prisma.holiday.findFirst({
      where: {
        OR: [
          { start_date: start_date },
          end_date
            ? { AND: [{ start_date: start_date }, { end_date: end_date }] }
            : undefined,
          {
            AND: [
              { start_date: { lte: start_date } },
              { end_date: { gte: start_date } },
            ],
          },
          end_date
            ? {
                AND: [
                  { start_date: { lte: end_date } },
                  { end_date: { gte: end_date } },
                ],
              }
            : undefined,
        ].filter(Boolean),
      },
    });
    if (existingHoliday) {
      return res.status(409).json({
        message:
          "Holiday already exists or conflicts with an existing holiday!",
      });
    }

    // Step 4: Store the data
    const newHoliday = await prisma.holiday.create({
      data: { name, start_date, end_date },
    });

    if (!newHoliday) {
      return res.status(400).json({ message: "Failed to create the holiday" });
    }
    console.log(newHoliday);

    const formattedResult = {
      ...newHoliday,
      start_date: newHoliday.start_date.toISOString().split("T")[0],
    };

    // Step 5: Send the response to the user
    res.status(201).json({
      message: "Successfully created holiday!",
      data: formattedResult,
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return res.status(409).json({ message: "Duplicate holiday entry" });
        case "P2003":
          return res
            .status(400)
            .json({ message: "Foreign key constraint failed" });
        case "P2025":
          return res.status(404).json({ message: "Record not found" });
        default:
          return res
            .status(500)
            .json({ message: "Database error", error: error.message });
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res
        .status(500)
        .json({ message: "Unknown database error", error: error.message });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }

    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

const assignHolidayToStudent = async (req, res) => {
  try {
    // Step 1: Get data from body
    const { studentIds, holidayId } = req.body;

    // Step 2: Validate the data
    await assign_holiday_schema.validateAsync({ studentIds, holidayId });

    // Step 3: Check if students exist
    const students = await prisma.student.findMany({
      where: {
        id: {
          in: studentIds,
        },
        status: true,
      },
      select: {
        id: true,
      },
    });

    // Extract found student IDs
    const foundStudentIds = students.map((s) => s.id);

    // Step 4: Identify invalid student IDs
    const invalidStudentIds = studentIds.filter(
      (id) => !foundStudentIds.includes(id)
    );
    if (invalidStudentIds.length > 0) {
      return res.status(400).json({
        message: "Some student IDs are invalid",
        invalidIds: invalidStudentIds,
      });
    }

    // Step 5: Check if holiday exists
    const holiday = await prisma.holiday.findUnique({
      where: {
        id: holidayId,
      },
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found!" });
    }

    // Step 6: Check if the students already have the holiday assigned
    const existingAssignments = await prisma.studentHoliday.findMany({
      where: {
        studentId: { in: foundStudentIds },
        holidayId: holidayId,
      },
      select: {
        studentId: true,
      },
    });

    // Extract already assigned student IDs
    const alreadyAssignedIds = existingAssignments.map((a) => a.studentId);

    // Filter students who are not yet assigned
    const newStudentIds = foundStudentIds.filter(
      (id) => !alreadyAssignedIds.includes(id)
    );

    if (newStudentIds.length === 0) {
      return res.status(409).json({
        message: "All students are already assigned to this holiday",
      });
    }

    // Step 7: Assign holiday to students
    await prisma.studentHoliday.createMany({
      data: newStudentIds.map((studentId) => ({
        studentId,
        holidayId,
      })),
      skipDuplicates: true,
    });

    // Step 8: Send the response
    res.status(201).json({
      message: "Successfully assigned holiday to students",
      assignedStudents: newStudentIds,
    });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return res.status(409).json({ message: "Duplicate holiday entry" });
        case "P2003":
          return res
            .status(400)
            .json({ message: "Foreign key constraint failed" });
        case "P2025":
          return res.status(404).json({ message: "Record not found" });
        default:
          return res
            .status(500)
            .json({ message: "Database error", error: error.message });
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res
        .status(500)
        .json({ message: "Unknown database error", error: error.message });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

const getStudentsWithNoHolidayByDateRange = async (req, res) => {
  try {
    let { start_date, end_date } = req.body;
    start_date = new Date(start_date);
    end_date = end_date ? new Date(end_date) : undefined;
    await date_validation_schema.validateAsync({ start_date, end_date });

    const students = await prisma.student.findMany({
      where: {
        status: true,
        NOT: {
          holidays: {
            some: {
              holiday: {
                OR: [
                  {
                    start_date: { lte: end_date },
                    end_date: { gte: start_date },
                  },
                  {
                    start_date: { lte: end_date },
                    end_date: null,
                  },
                ],
              },
            },
          },
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        holidays: {
          include: {
            holiday: true,
          },
        },
      },
    });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found without holidays" });
    }

    const formattedResult = students.map((student) => ({
      ...student,
      holidays: student.holidays.map((holiday) => ({
        ...holiday.holiday,
        start_date: holiday.holiday.start_date.toISOString().split("T")[0],
        end_date: holiday.holiday.end_date
          ? holiday.holiday.end_date.toISOString().split("T")[0]
          : null,
      })),
    }));

    res.status(200).json({
      message: "Successfully retrieved students with no holidays",
      formattedResult,
    });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return res.status(409).json({ message: "Duplicate holiday entry" });
        case "P2003":
          return res
            .status(400)
            .json({ message: "Foreign key constraint failed" });
        case "P2025":
          return res.status(404).json({ message: "Record not found" });
        default:
          return res
            .status(500)
            .json({ message: "Database error", error: error.message });
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res
        .status(500)
        .json({ message: "Unknown database error", error: error.message });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

const getStudentsWithHolidayByDateRange = async (req, res) => {
  try {
    let { start_date, end_date } = req.body;
    start_date = new Date(start_date);
    end_date = end_date ? new Date(end_date) : undefined;
    await date_validation_schema.validateAsync({ start_date, end_date });

    const students = await prisma.student.findMany({
      where: {
        status: true,
        holidays: {
          some: {
            holiday: {
              OR: [
                {
                  start_date: start_date,
                },
                ...(end_date
                  ? [
                      {
                        OR: [
                          { start_date: { gte: start_date, lte: end_date } },
                          { end_date: { gte: start_date, lte: end_date } },
                          {
                            AND: [
                              { start_date: { lte: start_date } },
                              { end_date: { gte: end_date } },
                            ],
                          },
                        ],
                      },
                    ]
                  : []),
              ],
            },
          },
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        holidays: {
          where: {
            holiday: {
              OR: [
                {
                  start_date: start_date,
                },
                ...(end_date
                  ? [
                      {
                        OR: [
                          { start_date: { gte: start_date, lte: end_date } },
                          { end_date: { gte: start_date, lte: end_date } },
                          {
                            AND: [
                              { start_date: { lte: start_date } },
                              { end_date: { gte: end_date } },
                            ],
                          },
                        ],
                      },
                    ]
                  : []),
              ],
            },
          },
          select: {
            holiday: {
              select: {
                id: true,
                name: true,
                start_date: true,
                end_date: true,
              },
            },
          },
        },
      },
    });

    // Step 2: Verify result
    if (!students) {
      return res.status(400).json({ message: "Failed to fetch the students" });
    }

    // Step 3: Send the resoonse
    const formated_list = students.map((student) => ({
      ...student,
      holidays: student.holidays.map((holiday) => ({
        ...holiday.holiday,
        start_date: holiday.holiday.start_date.toISOString().split("T")[0],
        end_date: holiday.holiday.end_date
          ? holiday.holiday.end_date.toISOString().split("T")[0]
          : null,
      })),
    }));
    res.status(200).json({
      message: "Successfully retrived the students",
      students: formated_list,
    });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return res.status(409).json({ message: "Duplicate holiday entry" });
        case "P2003":
          return res
            .status(400)
            .json({ message: "Foreign key constraint failed" });
        case "P2025":
          return res.status(404).json({ message: "Record not found" });
        default:
          return res
            .status(500)
            .json({ message: "Database error", error: error.message });
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res
        .status(500)
        .json({ message: "Unknown database error", error: error.message });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }
    console.log(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

// using prisma query
const getHolidayByDate = async (req, res) => {
  try {
    // Step 1: Get data from the body
    let { start_date, end_date } = req.body;

    start_date = new Date(start_date);
    end_date = end_date ? new Date(end_date) : undefined;

    // Step 2: Validate the data
    await date_validation_schema.validateAsync({ start_date, end_date });

    // Step 3: Retrive the holiday list based on the start date and end date
    const holiday_list = await prisma.holiday.findMany({
      where: {
        OR: [
          {
            start_date: start_date,
          },
          ...(end_date
            ? [
                {
                  OR: [
                    { start_date: { gte: start_date, lte: end_date } },
                    { end_date: { gte: start_date, lte: end_date } },
                    {
                      AND: [
                        { start_date: { lte: start_date } },
                        { end_date: { gte: end_date } },
                      ],
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
        students: {
          omit: {
            holidayId: true,
            id: true,
            studentId: true,
          },
          include: {
            student: {
              omit: {
                password: true,
              },
            },
          },
        },
      },
    });

    // Step 4: Send the response to the user
    const formated_list = holiday_list.map((holiday) => ({
      ...holiday,
      start_date: holiday.start_date.toISOString().split("T")[0],
      end_date: holiday.end_date?.toISOString().split("T")[0],
      students: holiday.students.map((student) => ({
        ...student.student,
      })),
    }));
    res.status(200).json({
      message: "Successfully fetched the list!",
      length: formated_list.length,
      holiday_list: formated_list,
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return res.status(409).json({ message: "Duplicate holiday entry" });
        case "P2003":
          return res
            .status(400)
            .json({ message: "Foreign key constraint failed" });
        case "P2025":
          return res.status(404).json({ message: "Record not found" });
        default:
          return res
            .status(500)
            .json({ message: "Database error", error: error.message });
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res
        .status(500)
        .json({ message: "Unknown database error", error: error.message });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// using raw sql
const getHolidayByDateUsingRawSQL = async (req, res) => {
  try {
    // Step 1: Get data from the body
    const { start_date, end_date } = req.body;

    // Step 2: Validate the data
    await date_validation_schema.validateAsync({ start_date, end_date });

    // Step 3: Retrive the holiday list based on the start date and end date
    const holiday_list = await prisma.$queryRaw`
      SELECT h.id as holiday_id, h.name as holiday_name, h.start_date as start_date, h.end_date as end_date, s.id as student_id, s.first_name, s.last_name, s.email, s.status
      FROM Holiday as h
      LEFT JOIN StudentHoliday as sh ON sh.holidayId = h.id
      LEFT JOIN Student as s ON s.id = sh.studentId
      WHERE start_date = ${start_date}
      OR (
        ${end_date} IS NOT NULL
        AND (
          start_date BETWEEN ${start_date} AND ${end_date}
          OR end_date BETWEEN ${start_date} AND ${end_date}
          OR (start_date <= ${start_date} AND end_date >= ${end_date})
        )
      )
      ORDER BY h.start_date
    `;

    // Step 4: Verify the result
    if (!holiday_list.length) {
      return res
        .status(400)
        .json({ message: "Failed to retrive the holiday list!" });
    }

    // Step 5: Send the response to the user
    const formattedResult = holiday_list.reduce((acc, row) => {
      let holiday = acc.find((h) => h.id === row.holiday_id);

      if (!holiday) {
        holiday = {
          id: row.holiday_id,
          name: row.holiday_name,
          start_date: row.start_date.toISOString().split("T")[0],
          end_date: row.end_date?.toISOString().split("T")[0],
          students: [],
        };
        acc.push(holiday);
      }

      // Add student details if they exist
      if (row.student_id) {
        holiday.students.push({
          id: row.student_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          status: row.status,
        });
      }

      return acc;
    }, []);
    res.status(200).json({
      message: "Successfully fetched the list!",
      length: formattedResult.length,
      holiday_list: formattedResult,
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return res.status(409).json({ message: "Duplicate holiday entry" });
        case "P2003":
          return res
            .status(400)
            .json({ message: "Foreign key constraint failed" });
        case "P2025":
          return res.status(404).json({ message: "Record not found" });
        default:
          return res
            .status(500)
            .json({ message: "Database error", error: error.message });
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res
        .status(500)
        .json({ message: "Unknown database error", error: error.message });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getStudentsWithNoHolidayByDateRangeUsingRawSQL = async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    await date_validation_schema.validateAsync({ start_date, end_date });

    // Fetch raw student and holiday data
    const rawData = await prisma.$queryRaw`
        SELECT 
            s.id AS student_id, 
            s.first_name, 
            s.last_name, 
            s.email,
            sh.id AS student_holiday_id,
            sh.holidayId,
            h.id AS holiday_id,
            h.name AS holiday_name,
            h.start_date AS holiday_start_date,
            h.end_date AS holiday_end_date
        FROM Student s
        LEFT JOIN StudentHoliday sh ON s.id = sh.studentId
        LEFT JOIN Holiday h ON sh.holidayId = h.id
        WHERE s.status = true
          AND NOT EXISTS (
              SELECT 1 
              FROM StudentHoliday sh2
              JOIN Holiday h2 ON sh2.holidayId = h2.id
              WHERE sh2.studentId = s.id
                AND (
                    (h2.start_date <= ${end_date} AND h2.end_date >= ${start_date}) 
                    OR 
                    (h2.end_date IS NULL AND h2.start_date <= ${start_date})
                )
          )
        ORDER BY s.id;
    `;

    // Process raw data to group holidays under each student
    const studentMap = new Map();

    rawData.forEach((row) => {
      if (!studentMap.has(row.student_id)) {
        studentMap.set(row.student_id, {
          id: row.student_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          holidays: [],
        });
      }

      if (row.holiday_id) {
        studentMap.get(row.student_id).holidays.push({
          id: row.student_holiday_id,
          studentId: row.student_id,
          holidayId: row.holiday_id,
          holiday: {
            id: row.holiday_id,
            name: row.holiday_name,
            start_date: row.holiday_start_date.toISOString().split("T")[0],
            end_date: row.holiday_end_date?.toISOString().split("T")[0],
          },
        });
      }
    });

    const students = Array.from(studentMap.values());

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found without holidays" });
    }

    res.status(200).json({
      message: "Successfully retrieved students with no holidays",
      students,
    });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return res.status(409).json({ message: "Duplicate holiday entry" });
        case "P2003":
          return res
            .status(400)
            .json({ message: "Foreign key constraint failed" });
        case "P2025":
          return res.status(404).json({ message: "Record not found" });
        default:
          return res
            .status(500)
            .json({ message: "Database error", error: error.message });
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res
        .status(500)
        .json({ message: "Unknown database error", error: error.message });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteHoliday = async (req, res) => {
  try {
    // Step 1: Get data from body
    const { holidayId } = req.body;

    // Step 2: Validate data
    await delete_holiday_schema.validateAsync({ holidayId });

    // Step 3: Get Holiday from database
    const holiday = await prisma.holiday.findUnique({
      where: { id: holidayId },
      include: { students: true }, // Check for associations before deletion
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found!" });
    }

    // Step 4: Delete associations (if any)
    if (holiday.students.length > 0) {
      await prisma.studentHoliday.deleteMany({
        where: { holidayId: holidayId },
      });
    }

    // Step 5: Delete the holiday
    await prisma.holiday.delete({
      where: { id: holidayId },
    });

    // Step 6: Send response
    res.status(200).json({ message: "Holiday deleted successfully!" });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((err) => err.message),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return res.status(409).json({ message: "Duplicate holiday entry" });
        case "P2003":
          return res
            .status(400)
            .json({ message: "Foreign key constraint failed" });
        case "P2025":
          return res.status(404).json({ message: "Record not found" });
        default:
          return res
            .status(500)
            .json({ message: "Database error", error: error.message });
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res
        .status(500)
        .json({ message: "Unknown database error", error: error.message });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res
        .status(400)
        .json({ message: "Validation error", error: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
  createHoliday,
  assignHolidayToStudent,
  getStudentsWithNoHolidayByDateRange,
  getStudentsWithHolidayByDateRange,
  getHolidayByDate,
  deleteHoliday,
  getHolidayByDateUsingRawSQL,
  getStudentsWithNoHolidayByDateRangeUsingRawSQL,
};
