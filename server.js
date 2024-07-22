const express = require("express")
const app = express()
const server = require("http").Server(app)
const io = require("socket.io")(server)
const { v4: uuidV4 } = require("uuid")

app.set("view engine", "ejs")
app.use(express.static("public"))

app.get("/", (req, res) => {
  const roomId = uuidV4()
  res.redirect(`/${roomId}`)
})

app.get("/:room", (req, res) => {
  const { room } = req.params
  res.render("room", { roomId: room })
})
io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    console.log(`User ${userId} joined Room ${roomId}`)
    socket.join(roomId)
    socket.broadcast.to(roomId).emit("user-connected", userId)
    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userId)
    })
  })
})

server.listen(3000, () => {
  console.log("Server is running on port 3000")
})
