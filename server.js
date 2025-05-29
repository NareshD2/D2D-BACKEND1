const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); 
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const router = require("./userRoutes");

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());


app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true 
}));
app.use('/',router);


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









// Add to your server.js

app.post('/feedbacks', (req, res) => {
  const { student_id, sendor_id,sendortype,feedback } = req.body;
  console.log("Received data:", req.body); 
  const sql = 'INSERT INTO feedbacks (student_id, sendor_id,sendortype,feedback) VALUES (?, ?, ?,?)';
  db.query(sql, [student_id, sendor_id,sendortype,feedback], (err, result) => {
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

app.post('/api/set-goal', async (req, res) => {
  const { userId, gid, targetDate, objective } = req.body;
  try {
   const [existing] = await db.query('SELECT * FROM user_goal_registration WHERE uid = ? AND gid = ?',[userId, gid]);
   if (existing.length > 0) {return res.status(400).json({ message: 'Goal already exists' });}
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

app.post("/api/Addgoals", async (req, res) => {
  try {
    const { goal } = req.body;

    if (!goal) {
      return res.status(400).json({ error: "Goal name is required" });
    }

    // Check if goal already exists
    const checkQuery = "SELECT * FROM goals WHERE goal_name = ?";
    const [results] = await db.execute(checkQuery, [goal]);

    if (results.length > 0) {
      return res.json({ exists: true });
    }

    // Insert new goal
    const insertQuery = "INSERT INTO goals (goal_name) VALUES (?)";
    await db.execute(insertQuery, [goal]);

    return res.json({ exists: false });

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


app.get('/getassignments', async(req, res) => {
  
  try{
  const [rows] = await db.query('SELECT assignment_id, title, due_date FROM assignments');
  
      res.json(rows);

    } catch (err) {
      console.error(err);
    res.status(500).send('Server Error');
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

app.post('/assignments', async (req, res) => {
  const { courseId, title, dueDate, references } = req.body;
  await db.query(
      `INSERT INTO assignments (course_id, title, due_date, reference_m) 
       VALUES (?, ?, ?, ?)`, [courseId, title, dueDate, references]
  );
  res.json({ message: 'Assignment created successfully' });
});

app.get('/courses1/:goal_name', async (req, res) => {
  const goal_name = req.params.goal_name;
  try {
    
    const [rows] = await db.query('SELECT gc1.cid, gc1.course_name, gc1.icon, gc1.link FROM courses AS gc1 JOIN goal_courses AS gc2 ON gc1.cid = gc2.cid JOIN goals AS g ON gc2.goal_id = g.id WHERE g.goal_name = ?', [goal_name]);
    //const [progress]=await db.query('select course_progress');
    res.json(rows);
   
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});


app.post('/submit', async (req, res) => {
  const { assignmentId, studentId, uploadLink, studentName } = req.body;
  await db.query(
      `INSERT INTO submissions (assignment_id, student_id, student_name, upload_link) 
       VALUES (?, ?, ?, ?)`, [assignmentId, studentId, studentName, uploadLink]
  );
  res.json({ message: 'Assignment submitted successfully' });
});

app.get('/submittedassignments',async (req,res)=>{
  const {uid}=req.query;
  if(!uid){
    return res.status(400).json({error:'user id required'});
    }
  const [results]=await db.query(`select assignment_id from submissions where student_id=?`,[uid]);
  res.json(results);
  console.log(results);
});
// Fetch all submissions for mentor view
app.get('/submissions', async (req, res) => {
  try {
    /*const [submissions] = await db.query(`
      SELECT s.assignment_id, s.student_id, s.student_name, s.upload_link, a.title, a.due_date
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.assignment_id
      ORDER BY a.due_date DESC
    `);*/
    const [submissions]=await db.query('select * from submissions');
    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve submissions' });
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






app.post('/MentorPosts', (req, res) => {
  const { title, description, companyLink } = req.body; // Extracting values from req.body

  // Check if title and description are provided (companyLink is optional)
  if (!title || !description) {
    return res.status(400).send("Job title and description are required.");
  }

  const sql = `
    INSERT INTO job_alerts (jobTitle, jobDescription, companyLink, datePosted)
    VALUES (?, ?, ?, NOW())
  `;

  db.query(sql, [title, description, companyLink], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Error posting job alert.");
    }
    res.status(201).json("Job1 alert posted successfully.");
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

/*app.get('/user-feedback/:userId', async (req, res) => {
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
});*/

app.get('/user-feedback/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const feedbacksQuery = `
      SELECT f.feedback, f.created_at, 
        CASE 
          WHEN f.sendortype = 'mentor' THEN m.name 
          WHEN f.sendortype = 'admin' THEN a.name 
          ELSE NULL 
        END AS sender_name
      FROM feedbacks f
      LEFT JOIN mentors m ON f.sendortype = 'mentor' AND f.sendor_id = m.id
      LEFT JOIN admins a ON f.sendortype = 'admin' AND f.sendor_id = a.id
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

app.get('/api/goals/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    /*const [goals] = await db.query(
    'SELECT  g.goal_name FROM user_goal_registration ugr JOIN goals g ON ugr.gid = g.id WHERE ugr.uid = ?',
      [userId]);*/
    //const [goals]=await db.query(`select g.goal_name,avg(uc.course_progress) as goal_progress from user_course_progress uc join goal_courses gc on uc.cid=gc.cid join goals g on g.id=gc.goal_id where uc.uid = ? group by g.goal_name`,[userId]); 
    const [goals] = await db.query(`
  SELECT 
    g.goal_name,
    round(COALESCE(AVG(COALESCE(uc.course_progress, 0)), 0),2) AS goal_progress
  FROM 
    user_goal_registration ugr
  JOIN 
    goals g ON g.id = ugr.gid
  JOIN 
    goal_courses gc ON g.id = gc.goal_id
  LEFT JOIN 
    user_course_progress uc ON uc.cid = gc.cid AND uc.uid = ?
  WHERE 
    ugr.uid = ?
  GROUP BY 
    g.goal_name
`, [userId, userId]);

     
    
    res.json({ goals });

  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({ error: 'Failed to retrieve goals' });
  }
});

// Save user progress

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
