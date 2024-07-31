if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

const express = require("express")
//const cors = require("cors")
const app = express()
const server = require("http").Server(app)
const io = require("socket.io")(server)
const { v4: uuidV4 } = require("uuid")
const bcrypt = require("bcrypt")
const { PeerServer } = require("peer")
const passport = require("passport")
const initializePassport = require("./passport-config")
const { exec } = require("child_process")
const flash = require("express-flash")
const session = require("express-session")
const { User } = require("./models")
const { Rooms } = require("./models")

initializePassport(passport)

const peerServer = PeerServer({
  port: 3001,
  path: "/peerjs",
})

// TODO:
// remove valid room ids when nobody is in it
// use database instead of list

// const validRoomIds = []
const rooms = {} // Dictionary to store roomId and hashed password

//app.use(cors())
app.set("view engine", "ejs")
//app.use("/peerjs", peerServer)
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

app.post("/room", checkAuth, async (req, res) => {
  try {
    if (await isInRoom(req.user.username)) {
      return res.redirect("/")
    }
    const { password } = req.body
    const roomId = uuidV4()
    await Rooms.create({ roomId: roomId, password: password, NumberOfUsers: 0 })
    console.log(`User ${req.user.username} started Room ${roomId}`)

    if (password) {
      rooms[roomId] = await bcrypt.hash(password, 10) // Store hashed password
    } else {
      rooms[roomId] = null // No password for this room
    }

    res.redirect(
      `/room/${roomId}?password=${encodeURIComponent(password || "")}`
    )
  } catch (error) {
    console.error("Error creating room:", error)
    res.status(500).send("Internal Server Error")
  }
})

app.get("/room/:roomid", checkAuth, async (req, res) => {
  try {
    if (await isInRoom(req.user.username)) {
      return res.redirect("/")
    }
    const roomId = req.params.roomid
    const { password } = req.query
    const room = await Rooms.findOne({ where: { roomId: roomId } })
    if (!room) {
      return res.status(403).send("Forbidden: Wrong ID or Password")
    }
    // room is valid
    const hashedPassword = rooms[roomId]
    if (hashedPassword) {
      // there is a password
      isPasswordValid = false
      if (password) {
        isPasswordValid = await bcrypt.compare(password, hashedPassword)
      }
      if (!isPasswordValid) {
        return res.status(403).send("Forbidden: Wrong ID or Password")
      }
    }
    res.render("room", { roomId: roomId, userId: req.user.username })
  } catch (error) {
    console.error("Error accessing room:", error)
    res.status(500).send("Internal Server Error")
  }
})

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    try {
      addToRoom(userId, roomId)
      // ++ to roomId database entry or add database entry if not in database
      console.log(`User ${userId} joined Room ${roomId}`)
      socket.join(roomId)
      socket.broadcast.to(roomId).emit("user-connected", userId)

      socket.on("disconnect", () => {
        try {
          removeFromRoom(userId, roomId)
          // -- to roomId database entry or delete database entry if going to be 0
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
      const room = await Rooms.findOne({ where: { roomId: roomId } })
      if (room) {
        room.NumberOfUsers++
        console.log(`Room ${roomId} has ${room.NumberOfUsers} users`)
        await room.save()
      }
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
      const room = await Rooms.findOne({ where: { roomId: roomId } })
      if (room) {
        room.NumberOfUsers--
        console.log(`Room ${roomId} has ${room.NumberOfUsers} users`)
        await room.save()
        await Rooms.destroy({ where: { roomId: roomId, NumberOfUsers: 0 } })
      }
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
