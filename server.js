  // load env variables
  if(process.env.NODE_ENV !== "production") {
    require("dotenv").config()
  }
  
  const express = require("express")
  const app = express()
  const server = require("http").Server(app)
  const io = require("socket.io")(server)
  const { v4: uuidV4 } = require("uuid")
  const bcrypt = require("bcrypt")
  const { ExpressPeerServer } = require("peer");
  const passport = require("passport")
  const initializePassport = require("./passport-config")
  const { exec } = require("child_process")
  const flash = require("express-flash")
  const session = require("express-session")
  const e = require("express")
  const exp = require("constants")

  initializePassport(passport, 
    username => { return users.find(user => user.username === username)},
    id => { return users.find(user => user.id === id)}
  )
  // Set up PeerJS server
  const peerServer = ExpressPeerServer(server, {
    debug: true,
  });


  const users = []

  app.set("view engine", "ejs")
  // Use the PeerJS server
  app.use("/peerjs", peerServer);
  
  app.use(session({
    secret:process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }))
  app.use(passport.initialize())
  app.use(passport.session())
  
  app.use(express.static("public"))
  app.use(express.json())
  app.use(express.urlencoded({extended: false}))
  app.use(flash())



  app.get("/register", (req, res) => {
    res.render("register.ejs")
})

  app.post("/register", async (req, res) => {
    try{
      
      // hash password with random salt (no need to save salt it concats it to the password)
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
  
      const user = {id: Date.now(), username: req.body.username, password: hashedPassword}
      users.push(user)
      console.log(users)
      res.redirect("/login")
    }
    catch {
      res.redirect("/register")
    }
  
})

  app.get("/login", (req, res) => {
    res.render("login.ejs", { message: req.flash("error") })
})

  app.post("/login", passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  }))

  
  app.get("/", checkAuth, (req, res) => {
    const roomId = uuidV4()
    res.redirect(`/${roomId}`)
  })

  app.get("/:room", checkAuth, (req, res) => {
    const { room } = req.params
    res.render("room", { roomId: room })
  })
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId, userId) => {
      console.log(`User ${userId} joined Room ${roomId}`)
      socket.join(roomId)
      socket.broadcast.to(roomId).emit("user-connected", userId)
      socket.on("disconnect", () => {
        console.log("user disconnecting")
        socket.broadcast.to(roomId).emit("user-disconnected", userId)
      })
    })
  })


  function checkAuth(req, res, next){
    if(req.isAuthenticated()){
      return next()
    }
    res.redirect("/login")
  }


  server.listen(3000, () => {
    console.log("Server is running on port 3000")
  })



