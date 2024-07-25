function startNewRoom() {
    window.location.href = '/room';
  }

  function joinRoom(event) {
    event.preventDefault();
    const roomId = document.getElementById('roomId').value;
    window.location.href = `/room/${roomId}`;
  }
