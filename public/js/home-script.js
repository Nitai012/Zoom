document
  .getElementById("create-room-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault()
    const password = document.getElementById("password").value || null // Use null if empty

    const response = await fetch("/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (response.ok) {
      window.location.href = response.url
    } else {
      alert("Error creating room")
    }
  })

document
  .getElementById("join-room-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault()
    const roomId = document.getElementById("roomId").value
    const password = document.getElementById("joinPassword").value || null // Use null if empty

    const response = await fetch("/room/" + roomId + "?password=" + password, {
      method: "GET",
    })

    if (response.ok) {
      window.location.href = response.url
    } else {
      alert("Error joining room")
    }
  })
