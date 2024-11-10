const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); 
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true 
}));



/*app.use(session({
  secret: '987654321', 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    httpOnly: true,
    maxAge: 30 * 60 * 1000 
  }
}));*/
const verifyJWT = (req, res, next) => {
  const token=req.headers['authorization'];
  if(token){
    token=token.split(' ')[1];
    jwt.verify(token,"jwtSecret",(err,valid) =>{
      if(err){
        res.send({result:"please add token with header"});
      }
        next();
    });

  }else{
        res.send({result:"please add token with header"});
  }

};

const db = mysql.createPool({
  host: 'localhost',
  user: 'root', 
  password: 'Supriya@987', 
  database: 'drive_to_destiny' 
});
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }

  try {
    const [checkEmailResult] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (checkEmailResult.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    await db.query('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)', [name, email, phone, password]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error processing registration:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});


app.post('/api/Customerlogin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please fill in both fields' });
  }

  try {
    let [results] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

    if (results.length > 0) {
      //req.session.user = results; 
      //const id = results[0].id;
      jwt.sign({results},"jwtSecret",{expiresIn: "2h"},(err,token) =>{
          if(err){
          res.send({result:"somethin went wrong please try again"});}
          res.send({ results,auth: token});
        });
      
    } else {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Error querying database:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/Mentorlogin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please fill in both fields' });
  }

  try {
    let [results] = await db.query('SELECT * FROM mentors WHERE email = ? AND password = ?', [email, password]);

    if (results.length > 0) {
      //req.session.user = results; 
      //const id = results[0].id;
      jwt.sign({results},"jwtSecret",{expiresIn: "2h"},(err,token) =>{
          if(err){
          res.send({result:"somethin went wrong please try again"});}
          res.send({ results,auth: token});
        });
      
    } else {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Error querying database:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});
// Add to your server.js

app.post('/feedback', (req, res) => {
  const { student_id, mentor_id, feedback } = req.body;
  const sql = 'INSERT INTO feedbacks (student_id, mentor_id, feedback) VALUES (?, ?, ?)';
  db.query(sql, [student_id, mentor_id, feedback], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error saving feedback");
    }
    res.status(200).send("Feedback saved successfully");
  });
});

app.post('/notification', (req, res) => {
  const { student_id, mentor_id, message } = req.body;
  const sql = 'INSERT INTO notifications (student_id, mentor_id, message) VALUES (?, ?, ?)';
  db.query(sql, [student_id, mentor_id, message], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error sending notification");
    }
    res.status(200).send("Notification sent successfully");
  });
});


app.post('/api/set-goal',async (req, res) => {
  
  const {userId, gid, targetDate, objective} = req.body;
  console.log(gid);
  console.log(objective);
  console.log(targetDate);
  console.log(userId);

  try {
    await db.query(
      'INSERT INTO user_goal_registration (gid, uid, targetdate, objective) VALUES (?, ?, ?, ?)',
      [gid, userId, targetDate, objective]
    );
    res.status(200).json({ message: 'Goal registered successfully' });
  } catch (error) {
    console.error('Error registering goal:', error);
    res.status(500).json({ message: 'Error registering goal' });
  }
});
app.get('/api/set-goal', async (req, res) => {
  
  try {
    const [results] = await db.query('SELECT id, goal_name AS goalName FROM goals');
    res.json(results);
  } catch (err) {
    console.error('Error fetching goals:', err);

    res.status(500).send('An error occurred');
  }
});

app.get('/courses', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT cid, course_name, icon, link FROM courses');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
app.get('/courses1/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    
    const [rows] = await db.query('SELECT gc2.cid,gc2.course_name,gc2.icon,gc2.link FROM user_goal_registration AS ugr JOIN goal_courses AS gc1 ON ugr.gid = gc1.goal_id JOIN courses AS gc2 ON gc1.cid = gc2.cid WHERE ugr.uid = ?',[userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
app.get('/api/goals/:userId', async (req, res) => {
  const userId = req.params.userId;
console.log(userId);
  try {
    const [goals] = await db.query(
    'SELECT  g.goal_name FROM user_goal_registration ugr JOIN goals g ON ugr.gid = g.id WHERE ugr.uid = ?',
      [userId]);
      console.log(goals);
    
    res.json({ goals });

  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({ error: 'Failed to retrieve goals' });
  }
});

app.get('/api/:cid', async (req, res) => {
  const { cid } = req.params; 
  const query = `SELECT title, youtubelink FROM course_${cid}`;

  try {
    const [results] = await db.query(query);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No videos found for this category.' });
    }

    res.json(results);
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/users', async(req, res) => {
  try{
  const [sql] = await db.query("SELECT id, name, email, phone FROM users");

  
    res.json(sql);
  }catch (err){
    console.error(err);
    res.status(500).send("Error fetching details.");
  }
});

app.post('/MentorPosts', (req, res) => {
  const { title, description, companyLink } = req.body; // Extracting values from req.body

  // Check if title and description are provided (companyLink is optional)
  if (!title || !description) {
    return res.status(400).send("Job title and description are required.");
  }

  const sql = `
    INSERT INTO job_alerts (jobTitle, jobDescription, companyName, companyLink, datePosted)
    VALUES (?, ?, ?, ?, NOW())
  `;

  db.query(sql, [title, description, 'IBM', companyLink], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Error posting job alert.");
    }
    res.send("Job alert posted successfully.");
  });
});

app.get('/Userjobalerts', async (req, res) => {
  try {
    // Create a connection or use your existing connection
    const [results] = await db.query("SELECT * FROM job_alerts");
    
    // Send the results back to the client
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching job alerts.");
  }
});

app.get('/user-feedback/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const feedbacksQuery =`
      SELECT f.feedback, f.created_at, m.name as mentor_name 
      FROM feedbacks f 
      JOIN mentors m ON f.mentor_id = m.id
      WHERE f.student_id = ? 
      ORDER BY f.created_at DESC
    `;

    const [feedbacks] = await db.query(feedbacksQuery, [userId]);
    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).send("Error fetching feedbacks");
  }
});
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
