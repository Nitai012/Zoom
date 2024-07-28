if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

const express = require("express")
const cors = require("cors")
const app = express()
const server = require("http").Server(app)
const io = require("socket.io")(server)
const { v4: uuidV4 } = require("uuid")
const bcrypt = require("bcrypt")
const { ExpressPeerServer } = require("peer")
const passport = require("passport")
const initializePassport = require("./passport-config")
const { exec } = require("child_process")
const flash = require("express-flash")
const session = require("express-session")
const { User } = require("./models")

initializePassport(passport)

const peerServer = ExpressPeerServer(server, { debug: true })
const validRoomIds = []
const rooms = {} // Dictionary to store roomId and hashed password

app.use(cors())
app.set("view engine", "ejs")
app.use("/peerjs", peerServer)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
)
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static("public"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(flash())

app.get("/register", (req, res) => res.render("register.ejs"))

app.post("/register", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    await User.create({ username: req.body.username, password: hashedPassword })
    res.redirect("/login")
  } catch (error) {
    console.error(error)
    res.redirect("/register")
  }
})

app.get("/login", (req, res) =>
  res.render("login.ejs", { message: req.flash("error") })
)

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
)

app.get("/", checkAuth, (req, res) =>
  res.render("home.ejs", { username: req.user.username })
)

app.get("/room", checkAuth, (req, res) =>
  res.render("home.ejs", { username: req.user.username, creatingRoom: true })
)

app.post("/room", checkAuth, async (req, res) => {
  try {
    const { password } = req.body
    const roomId = uuidV4()
    validRoomIds.push(roomId)

    if (password) {
      rooms[roomId] = await bcrypt.hash(password, 10) // Store hashed password
    } else {
      rooms[roomId] = null // No password for this room
    }

    res.redirect(`/room/${roomId}`)
  } catch (error) {
    console.error("Error creating room:", error)
    res.status(500).send("Internal Server Error")
  }
})

app.post("/join-room", checkAuth, async (req, res) => {
  try {
    const { roomId, password } = req.body

    if (!validRoomIds.includes(roomId)) {
      return res.status(403).send("Forbidden: Invalid Room ID")
    }

    const hashedPassword = rooms[roomId]

    if (hashedPassword === null) {
      // Room doesn't have a password
      res.redirect(`/room/${roomId}`)
    } else {
      // Room has a password, check if it's correct
      const isPasswordValid = await bcrypt.compare(password, hashedPassword)
      if (isPasswordValid) {
        res.redirect(`/room/${roomId}`)
      } else {
        res.status(403).send("Forbidden: Incorrect Password")
      }
    }
  } catch (error) {
    console.error("Error joining room:", error)
    res.status(500).send("Internal Server Error")
  }
})

app.get("/room/:roomid", checkAuth, async (req, res) => {
  try {
    const roomId = req.params.roomid
    if (!validRoomIds.includes(roomId)) {
      return res.status(403).send("Forbidden: Invalid Room ID")
    }
    res.render("room", { roomId, userId: req.user.id })
  } catch (error) {
    console.error("Error accessing room:", error)
    res.status(500).send("Internal Server Error")
  }
})

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    try {
      addToRoom(userId, roomId)
      console.log(`User ${userId} joined Room ${roomId}`)
      socket.join(roomId)
      socket.broadcast.to(roomId).emit("user-connected", userId)

      socket.on("disconnect", () => {
        try {
          removeFromRoom(userId, roomId)
          console.log(`User ${userId} disconnected from Room ${roomId}`)
          socket.broadcast.to(roomId).emit("user-disconnected", userId)
        } catch (error) {
          console.error("Error disconnecting user from room:", error)
        }
      })
    } catch (error) {
      console.error("Error joining room:", error)
    }
  })
})

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect("/login")
}

async function addToRoom(userId, roomId) {
  try {
    const user = await User.findByPk(userId)
    if (user) {
      user.roomId = roomId
      await user.save()
      console.log(`User ${userId} added to room ${roomId}`)
    } else {
      console.log(`User ${userId} not found`)
    }
  } catch (error) {
    console.error("Error adding user to room:", error)
  }
}

async function removeFromRoom(userId, roomId) {
  try {
    const user = await User.findByPk(userId)
    if (user) {
      user.roomId = null
      await user.save()
      console.log(`User ${userId} removed from room`)
    } else {
      console.log(`User ${userId} not found`)
    }
  } catch (error) {
    console.error("Error removing user from room:", error)
  }
}

async function isInRoom(userId) {
  try {
    const user = await User.findByPk(userId)
    if (user && user.roomId != null) {
      console.log(`User ${userId} found in room`)
      return true
    } else {
      console.log(`User ${userId} not found or not in room`)
      return false
    }
  } catch (error) {
    console.error("Error checking user room status:", error)
    return false
  }
}

server.listen(3000, () => {
  console.log("Server is running on port 3000")
})
