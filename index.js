const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const fs = require("fs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// Load users from JSON file
const loadUsers = () => {
  const data = fs.readFileSync("users.json");
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
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
};

// Save posts to JSON file
const savePosts = (posts) => {
  fs.writeFileSync("posts.json", JSON.stringify(posts, null, 2));
};

// Signup
app.post("/signup", (req, res) => {
  const { name, email, password, id } = req.body;
  const users = loadUsers();

  if (users.find((user) => user.email === email)) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const newUser = {
    id,
    name,
    email,
    password,
    avatar: "",
    bio: "",
    followers: [],
    followings: [],
    postCount: 0
  };

  users.push(newUser);
  saveUsers(users);

  res.status(201).json({ message: "Signup successful", user: newUser });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ message: "Login successful", user });
});

//Verify user
app.get("/user/:email", (req, res) => {
  const { email } = req.params;
  const users = loadUsers();

  const userIndex = users.findIndex((user) => user.email === email);

  if (userIndex == -1) {
    return res.status(404).json({ message: "No user found." });
  } else {
    return res
      .status(200)
      .json({ message: "User found.", userIndex: userIndex });
  }
});

//Reset User Password.
app.patch("/reset-password", (req, res) => {
  const { userIndex, newPassword } = req.body;
  const users = loadUsers();

  users[userIndex].password = newPassword;
  saveUsers(users);

  return res.status(200).json({ message: "Password updated successfully." });
});

//Update User Info
app.patch("/user/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const users = loadUsers();

  const userIndex = users.findIndex((user) => user.id === id);

  const user = users[userIndex];

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.avatar !== undefined) user.avatar = updates.avatar;
  if (updates.bio !== undefined) user.bio = updates.bio;

  users[userIndex] = user;
  saveUsers(users);

  return res.status(200).json({ message: "Changes update Successfully" });
});

// Get All Users (Optional for testing)
app.get("/users", (req, res) => {
  const users = loadUsers();
  res.json(users);
});

//get suggested users
app.get("/suggested-users/:userId", (req, res) => {
  const {userId} = req.params;
  const users = loadUsers();

  const currentUser = users.find(user => user.id == userId);

  const userFollowings = currentUser.followings || [];

  let suggestedUsers = [];

  if(userFollowings.length > 0){
    suggestedUsers = users.filter(user => user.id != userId)
    .sort((a, b) => b.followers.length - a.followers.length)
    .slice(0, 10)
  }else{
        suggestedUsers = users.filter(user => user.id != userId && !userFollowings.includes(userId))
    .sort((a, b) => b.followers.length - a.followers.length)
    .slice(0, 10)
  }

  res.json(suggestedUsers);
});

//get specific user
app.get("/specific-user/:userId", (req, res) => {
  const {userId} = req.params;
  const users = loadUsers();

  const user = users.find(u => u.id == userId);
    if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);

});

//update user followers and followings
app.post("/connections", (req, res) => {
  const {userId, currentUserId} = req.body;
  const users = loadUsers();

  const followUser = users.find(u => u.id == userId);
  const followingUser = users.find(u => u.id == currentUserId);

  if(!followUser && !followingUser){
    return res.status(404).json({ message: "User not found" });
  }

  const isAlreadyFollow = followingUser.followings.includes(userId);

  if(isAlreadyFollow){
    followUser.followers = followUser.followers.filter(id => id != currentUserId);
    followingUser.followings = followingUser.followings.filter(id => id != userId);
  }else{
    followUser.followers.push(currentUserId);
    followingUser.followings.push(userId);
  }

  saveUsers(users);

    return res.status(200).json({
    message: isAlreadyFollow ? "Unfollowed successfully" : "Followed successfully",
  });
});

//Create New Post
app.post("/create-post", (req, res) => {
  const { userId, text = "", images = [] } = req.body;

  if (!userId || (!text.trim() && (!Array.isArray(images) || images.length === 0))) {
    return res.status(400).json({ message: "userId and either text or images are required" });
  }

  const posts = loadPosts();
  const users = loadUsers();

  const user = users.find(u => u.id == userId);

  const newPost = {
    id: uuidv4(),
    userId,
    text,
    images,
    timestamp: new Date().toISOString(),
    likedBy: [],
    unlikedBy: [],
    comments: [],
  };

  user.postCount++;

  posts.push(newPost);
  savePosts(posts);
  saveUsers(users);

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
    io.emit("likeUpdate", {
      postId: id,
      likedBy: post.likedBy,
      unlikedBy: post.unlikedBy,
    });

    return res.status(200).json({ message: "Post updated", post });
  } catch (error) {
    console.error("PATCH /post-reaction/:id failed:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

//Adding new Comment
app.post("/comment/:postId", (req, res) => {
  const { postId } = req.params;
  const { id, userId, text, timestamp } = req.body;
  const posts = loadPosts();

  if (!id || !userId || !text || !timestamp) {
    return res.status(400).json({ message: "Invalid action" });
  }

  const post = posts.find((p) => p.id == postId);
  const newComment = {
    id,
    userId,
    text,
    timestamp,
  };

  post.comments.push(newComment);
  savePosts(posts);

  io.emit("commentUpdate", {
    postId,
    comment: newComment,
  });

  return res.status(201).json({ message: "Comment created" });
});

//Deleting User Account
app.delete("/delete/:userId", (req, res) => {
  const { userId } = req.params;
  const users = loadUsers();
  const posts = loadPosts();

  if (!userId) {
    return res.status(400).json({ message: "Invalid action" });
  }

  const updateUsers = users.filter((u) => u.id != userId);
  const updatePosts = posts.filter((p) => p.userId != userId);

  savePosts(updatePosts);
  saveUsers(updateUsers);

  return res.status(200).json({ message: "Deletion Successful" });
});

// Get all posts
app.get("/posts", (req, res) => {
  const posts = loadPosts();
  res.json(posts);
});

// Get posts based on user followings
app.get("/following-posts/:userId", (req, res) =>{
  const {userId} = req.params;
  const users = loadUsers();
  const posts = loadPosts()

  const user = users.find(u => u.id === userId);

   if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const followingIds = user.followings || [];

  const followingsPosts = posts.filter(p => followingIds.includes(p.userId) || p.userId == userId);

  res.json(followingsPosts);
});

//Get posts according to popularity
app.get("/popular-posts", (req, res) => {
  const posts = loadPosts();
  const users = loadUsers();

let popularPosts = posts
  .map(post => {
    const postAuthor = users.find(u => u.id === post.userId);
    const followerCount = postAuthor.followers.length || 0;

    return {
      ...post,
      popularity:
        (post.likedBy.length || 0) +
        (post.comments.length || 0) +
        followerCount
    };
  })
  .sort((a, b) => b.popularity - a.popularity)
  .slice(0, 10);

  res.json(popularPosts);

});

//Get user's own posts
app.get("/own-post/:userId", (req, res) => {
  const {userId} = req.params;
  const posts = loadPosts();

  const ownPosts = posts.filter(post => post.userId == userId);

  res.json(ownPosts);
});

//update post
app.patch("edit-post", (req, res) => {
  const {postId} = req.params;
  const postUpdates = req.body;

  const posts = loadPosts();

  const postIndex = posts.findIndex(p => p.id == postId);
    if (postIndex === -1) {
    return res.status(404).json({ message: "Post not found" });
  }

  if(postUpdates.text) posts[postIndex].text = postUpdates.text;
  if(postUpdates.images.length > 0) posts[postIndex].images = [...posts[postIndex].images, postUpdates.images];

  savePosts(posts);

 res.json({ message: "Post updated successfully"});
})

server.listen(PORT, () => {
  console.log(`Server + Socket.IO running on http://localhost:${PORT}`);
});

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
