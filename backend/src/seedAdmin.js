require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const connectDB = require("../../backend/config/db");
const Admin = require("./models/Admin");

async function run() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log("Superadmin already exists");
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);

  await Admin.create({
    name: "Super Admin",
    email,
    passwordHash: hash,
    role: "superadmin",
  });

  console.log("Superadmin Created:", email);
  process.exit(0);
}

run();
