const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/user");
const Role = require("../models/role");

// Register new user
const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validation
    if (!username || !password || !email) {
      return res.status(400).json({ error: "Username, password, and email are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    // Check if this is the first user (will be admin)
    const userCount = await User.countDocuments();
    let userRole = null;

    if (userCount === 0) {
      // First user becomes admin
      const adminRole = await Role.findOne({ name: "admin" });
      if (adminRole) {
        userRole = adminRole._id;
      }
    }

    // Create new user
    const newUser = new User({
      userId: uuidv4(),
      username,
      password,
      email,
      roleId: userRole,
      isActive: true
    });

    await newUser.save();

    // Generate token
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.email,
        roleId: newUser.roleId
      },
      token
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username }).populate("roleId");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    if (user.deletedAt) {
      return res.status(403).json({ error: "Account has been deleted" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        roleId: user.roleId
      },
      token
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(403).json({ error: "Cannot refresh token" });
    }

    const newToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({ token: newToken });
  } catch (e) {
    res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = {
  register,
  login,  
  refreshToken
};