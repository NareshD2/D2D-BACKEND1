const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Use promise-compatible version
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Create an instance of express
const app = express();

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());

app.use(session({
  secret: '987654321', // Replace with a strong secret key
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true } // Set secure to true for HTTPS
}));

function isAuthenticated(req, res, next) {
  if (req.session.id) {
    return next();
  } else {
    return res.status(401).json({ message: 'Unauthorized access' });
  }
}

// MySQL connection setup
const db = mysql.createPool({
  host: 'localhost',
  user: 'root', // Change to your MySQL user
  password: 'Supriya@987', // Change to your MySQL password
  database: 'drive_to_destiny' // Change to your database name
});

// API route to handle registration
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Simple validation
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }

  try {
    // Check if the email already exists in the database
    const [checkEmailResult] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    // If the email exists, return a 409 Conflict response
    if (checkEmailResult.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // If the email doesn't exist, insert the new user into the database
    await db.query('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)', [name, email, phone, password]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error processing registration:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});

// Login API for Admin
app.post('/api/Adminlogin', async (req, res) => {
  const { email, password } = req.body;

  // Simple validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please fill in both fields' });
  }

  try {
    // Query to check if the user exists
    const [results] = await db.query('SELECT * FROM admins WHERE email = ? AND password = ?', [email, password]);

    if (results.length > 0) {
      // User found
      return res.status(200).json({ message: 'Login successful' });
    } else {
      // User not found
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Error querying database:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});

// Login API for Customer
app.post('/api/Customerlogin', async (req, res) => {
  const { email, password } = req.body;

  // Simple validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please fill in both fields' });
  }

  try {
    // Query to check if the user exists
    const [results] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

    if (results.length > 0) {
      // User found
      return res.status(200).json({ message: 'Login successful' });
    } else {
      // User not found
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Error querying database:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});

// Login API for Mentor
app.post('/api/Mentorlogin', async (req, res) => {
  const { email, password } = req.body;

  // Simple validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please fill in both fields' });
  }

  try {
    // Query to check if the user exists
    const [results] = await db.query('SELECT * FROM mentors WHERE email = ? AND password = ?', [email, password]);

    if (results.length > 0) {
      // User found
      return res.status(200).json({ message: 'Login successful' });
    } else {
      // User not found
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Error querying database:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});

// Get goals for authenticated user
app.get('/api/set-goal', isAuthenticated, async (req, res) => {
  try {
    const [results] = await db.query('SELECT id, goal_name AS goalName FROM goals');
    res.json(results);
  } catch (err) {
    console.error('Error fetching goals:', err);
    res.status(500).send('An error occurred');
  }
});

// Get courses
app.get('/courses', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT cid, course_name, icon, link FROM courses'); // Adjust your query if needed
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get course content by course ID
app.get('/api/:cid', async (req, res) => {
  const { cid } = req.params;
  // Extract cid from URL parameters
  const query = `SELECT title, youtubelink FROM course_${cid}`; // Build the query dynamically

  try {
    const [results] = await db.query(query);
    res.json(results); // Send the results as JSON
  } catch (err) {
    console.error('Error executing query:', err); // Log the error
    return res.status(500).json({ error: 'Internal server error' }); // Return error response
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
