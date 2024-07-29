const ROOM_ID = "<%= roomId %>"
const USER_ID = "<%= userId %>"
const socket = io("/")
const videoGrid = document.getElementById("video-grid")
const myPeer = new Peer(USER_ID, {
  host: '/',
  port: 3000,
  path: "/peerjs",
  secure: false, // set to true if using HTTPS
})

myPeer.on("open", (id) => {
  console.log("Peer opened with ID:", id)
  socket.emit("join-room", ROOM_ID, id)
})

const myVideo = document.createElement("video")
myVideo.muted = true

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    console.log("Media stream obtained:", stream)
    addVideoStream(myVideo, stream)

    myPeer.on("call", (call) => {
      console.log("Answering call from", call.peer)
      call.answer(stream)
      const video = document.createElement("video")
      call.on("stream", (userVideoStream) => {
        console.log("Receiving stream from", call.peer)
        addVideoStream(video, userVideoStream)
      })
      call.on("close", () => {
        console.log("Call closed by", call.peer)
        video.remove()
      })
    })

    socket.on("user-connected", (userId) => {
      console.log(`User ${userId} connected`)
      setTimeout(() => {
        connectToNewUser(userId, stream)
      }, 1000) // Delay to ensure the new user has fully connected
    })
  })
  .catch((error) => {
    console.error("Error accessing media devices:", error)
  })

socket.on("user-disconnected", (userId) => {
  console.log(`User ${userId} disconnected`)
  if (peers[userId]) peers[userId].close()
})

function connectToNewUser(userId, stream) {
  console.log("Connecting to new user:", userId)
  const call = myPeer.call(userId, stream)
  const video = document.createElement("video")
  call.on("stream", (userVideoStream) => {
    console.log("Receiving stream from", userId)
    addVideoStream(video, userVideoStream)
  })
  call.on("close", () => {
    console.log("Call closed by", userId)
    video.remove()
  })
  call.on("error", (error) => {
    console.error("Call error:", error)
  })

  peers[userId] = call
}

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener("loadedmetadata", () => {
    video.play()
  })
  videoGrid.append(video)
  console.log("Video stream added:", video)
}
