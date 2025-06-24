const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require("uuid");
const app = express();

const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// Load users from JSON file
const loadUsers = () => {
  const data = fs.readFileSync('users.json');
  return JSON.parse(data);
};

//Load posts from JSON file
const loadPosts = () => {
  if (!fs.existsSync("posts.json")) return [];
  const data = fs.readFileSync("posts.json", "utf-8");
  return JSON.parse(data);
};

//Save users to JSON file
const saveUsers = (users) => {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
};

// Save posts to JSON file
const savePosts = (posts) => {
  fs.writeFileSync("posts.json", JSON.stringify(posts, null, 2));
};

// Signup
app.post('/signup', (req, res) => {
  const { name, email, password, id } = req.body;
  const users = loadUsers();

  if (users.find(user => user.email === email)) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const newUser = {
    id,
    name,
    email,
    password,
    avatar: '',
    bio: ''
  };

  users.push(newUser);
  saveUsers(users);

  res.status(201).json({ message: 'Signup successful', user: newUser });
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({ message: 'Login successful', user });
});

//Verify user
app.get('/user/:email', (req, res) => {
  const {email} = req.params;
  const users = loadUsers();

  const userIndex = users.findIndex(user => user.email === email);

  if(userIndex == -1){
    return res.status(404).json({ message: 'No user found.' });
  }else{
    return res.status(200).json({ message: 'User found.', userIndex: userIndex});
  }
});

//Reset User Password.
app.patch('/reset-password', (req, res) => {
  const {userIndex, newPassword} = req.body;
  const users = loadUsers();

  users[userIndex].password = newPassword;
  saveUsers(users);

   return res.status(200).json({ message: 'Password updated successfully.' });
});

//Update User Info
app.patch('/user/:id',(req, res) => {
  const {id} = req.params;
  const updates = req.body;
  const users = loadUsers();

  const userIndex = users.findIndex((user) => user.id === id);

  const user = users[userIndex];

  if(updates.name !== undefined) user.name = updates.name;
  if(updates.avatar !== undefined) user.avatar = updates.avatar;
  if(updates.bio !== undefined) user.bio = updates.bio;

  users[userIndex] = user;
  saveUsers(users);

  return res.status(200).json({message: "Changes update Successfully"});
});

// Get All Users (Optional for testing)
app.get('/users', (req, res) => {
  const users = loadUsers();
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

//Create New Post
app.post("/create-post", (req, res) => {
  const { userId, text = "", image = "" } = req.body;

  if (!userId || (!image && !text)) {
    return res.status(400).json({ message: "userId and text are required" });
  }

  const posts = loadPosts();

  const newPost = {
    id: uuidv4(),
    userId,
    text,
    image,
    timestamp: new Date().toISOString(),
    likedBy: [],
    unlikedBy: [],
    comments: []
  };

  posts.push(newPost);
  savePosts(posts);

  return res.status(201).json({ message: "Post created", post: newPost });
});

//Like Unlike post
app.patch("/post-reaction/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { userId, action } = req.body;

    if (!id || !userId || !action) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const posts = loadPosts();
    const post = posts.find((p) => p.id === id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    switch (action) {
      case "like_add":
        if (!post.likedBy.includes(userId)) post.likedBy.push(userId);
        post.unlikedBy = post.unlikedBy.filter((uid) => uid !== userId);
        break;

      case "like_remove":
        post.likedBy = post.likedBy.filter((uid) => uid !== userId);
        break;

      case "unlike_add":
        if (!post.unlikedBy.includes(userId)) post.unlikedBy.push(userId);
        post.likedBy = post.likedBy.filter((uid) => uid !== userId);
        break;

      case "unlike_remove":
        post.unlikedBy = post.unlikedBy.filter((uid) => uid !== userId);
        break;

      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    savePosts(posts);
    return res.status(200).json({ message: "Post updated", post });
  } catch (error) {
    console.error("PATCH /post-reaction/:id failed:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

//Adding new Comment
app.post("/comment/:postId", (req, res) => {
  const {postId} = req.params;
  const {id, userId, text, timestamp} = req.body;
  const posts = loadPosts();

  if(!id || !userId || !text || !timestamp){
    return res.status(400).json({ message: "Invalid action" });
  }

  const post = posts.find(p => p.id === postId);
  const newComment = {
    id: id,
    userId: userId,
    text: text,
    timestamp: timestamp
  };

  post.comments.push(newComment);
  savePosts(posts);
  return res.status(201).json({ message: "Comment created"});
});

// Get all posts
app.get("/posts", (req, res) => {
  const posts = loadPosts();
  res.json(posts);
});