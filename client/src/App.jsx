import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import GameBoard from "./GameBoard"

const socket = io()

const yutNames = ["빽도", "도", "개", "걸", "윷", "모"]


const panelBox = {
  border: "2px solid #1f3b4d",
  padding: 12,
  background: "#fdf8ef",
  minHeight: 60,
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8
}

const yutBoxStyle = {
  width: 300,
  height: 300,
  border: "3px solid #1f3b4d",
  background: "#f6f1e7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20
}


function App() {
  const [nickname, setNickname] = useState("")
  const [roomId, setRoomId] = useState("")
  const [room, setRoom] = useState(null)
  const [joined, setJoined] = useState(false)
  const [isYutAnimating, setIsYutAnimating] = useState(false)
  const [currentYutVideo, setCurrentYutVideo] = useState(null)
  const [videoReady, setVideoReady] = useState(false)


  useEffect(() => {
    socket.on("yutThrown", ({ result }) => {

      const videoPath = getVideoByResult(result)

      setVideoReady(false) 

      setCurrentYutVideo(videoPath)
      setIsYutAnimating(true)

    })

    return () => {
      socket.off("yutThrown")
    }
  }, [])

  useEffect(() => {
    socket.on("roomUpdate", (roomData) => {
      setRoom(roomData)
    })
  }, [])

  useEffect(() => {

    const videoList = [
      "/videos/backdo.mp4",
      "/videos/do.mp4",
      "/videos/gae.mp4",
      "/videos/girl.mp4",
      "/videos/yut.mp4",
      "/videos/mo.mp4"
    ]

    videoList.forEach(src => {
      const video = document.createElement("video")
      video.src = src
      video.preload = "auto"
    })

  }, [])


  const joinRoom = () => {
    if (!nickname || !roomId) return
    socket.emit("joinRoom", { nickname, roomId })
    setJoined(true)
  }

  function getVideoByResult(result) {
    switch (result) {
      case 0: return "/videos/backdo.mp4"
      case 1: return "/videos/do.mp4"
      case 2: return "/videos/gae.mp4"
      case 3: return "/videos/girl.mp4"
      case 4: return "/videos/yut.mp4"
      case 5: return "/videos/mo.mp4"
      default: return null
    }
  }

  if (!joined) {
    return (
      <div style={{ padding: 40 }}>
        <h2>윷놀이 방 입장</h2>

        <input
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="방 비밀번호"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <br /><br />

        <button onClick={joinRoom}>입장하기</button>
      </div>
    )
  }

  // 🔥 현재 턴 및 무인도 스킵 여부 계산
  const isMyTurn =
    room?.players?.[room?.turnIndex]?.socketId === socket.id

  const currentPlayer = room?.players?.[room?.turnIndex]

  const shouldSkip =
    isMyTurn &&
    currentPlayer?.islandPending &&
    currentPlayer?.pieces?.some(p => p.position === 10)

  


  return (
    <div style={{ padding: 40 }}>
      <h2> 방 비밀번호 : {roomId}</h2>

      <div
        style={{
          position: "relative",
          width: 1400,
          height: 700,
          margin: "0 auto"
        }}
      >
        <GameBoard room={room} />
        



        {/* 던진 결과 */}
        
        <div
          style={{
            position: "absolute",
            right: 420,
            top: 570,
            width: 242, //257-15
            height: 60,
            border: "4px solid #762d00",
            
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",   // 🔥 변경
            paddingLeft: 15,                // 🔥 추가 (벽에 너무 붙지 않게)
            fontSize: 22
          }}
        >
          결과 :{" "}
          {room?.moveStack?.map((m, index) => {

            const isLast = index === room.moveStack.length - 1

            // 🔥 마지막 결과이고, 지금 애니메이션 중이면 숨김
            if (isLast && isYutAnimating) return null

            return yutNames[m] + " "
          })}
        </div>
        




        {/* 4종 버튼 : 게임시작, 윷던지기, 무인도넘기기, 골인해서넘기기 */}

        <div
          style={{
            position: "absolute",
            right: 420,
            top: 490,
            width: 257,
            height: 60,
            border: "4px solid #762d00",
            
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10
          }}
        >

          {room?.phase === "waiting" &&
            room?.players?.length >= 2 && (
              <button onClick={() => socket.emit("startGame", roomId)}>
                게임 시작
              </button>
          )}

          {isMyTurn &&
            room?.phase === "throwing" &&
            room?.canThrow &&
            !isYutAnimating &&
            !room.players[room.turnIndex].pieces.every(p => p.finished) &&
            !shouldSkip && (
              <button
                onClick={() => {
                  socket.emit("throwYut", roomId)
                }}
              >
                윷 던지기
              </button>
          )}

          {isMyTurn && shouldSkip && (
            <button onClick={() => socket.emit("skipIslandTurn", roomId)}>
              무인도 : 턴 넘기기
            </button>
          )}

          {isMyTurn &&
            room?.phase === "throwing" &&
            room.players[room.turnIndex].pieces.every(p => p.finished) && (
              <button onClick={() => socket.emit("passTurn", roomId)}>
                모두 골인 : 턴 넘기기
              </button>
          )}

        </div>




        {/* 말 선택 */}

        {!isYutAnimating &&
         room?.phase === "moving" &&
          room.players[room.turnIndex]?.socketId === socket.id && (
            <div
              style={{
                position: "absolute",
                right: 60,
                top: 490,
                width: 290,
                height: 60,
                border: "4px solid #762d00",
                
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10
              }}
            >
              {room.players[room.turnIndex].pieces.map((piece, i) => (
                <button
                  key={i}
                  disabled={piece.finished}
                  onClick={() =>
                    socket.emit("selectPiece", {
                      roomId,
                      pieceIndex: i
                    })
                  }
                  style={{
                    backgroundColor:
                      room.selectedPiece === i ? "#d88e1f" : ""
                  }}
                >
                  말 {String.fromCharCode(65 + i)}
                </button>
              ))}
            </div>
        )}




        {/* 이동 선택 */}

        {!isYutAnimating &&
        room?.phase === "moving" &&
          room.selectedPiece != null &&
          room.players[room.turnIndex]?.socketId === socket.id && (
            <div
              style={{
                position: "absolute",
                right: 60,
                top: 570,
                width: 290,
                height: 60,
                border: "4px solid #762d00",
                
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10
              }}
            >
              {room.usableMoves?.map(idx => (
                <button
                  key={idx}
                  onClick={() =>
                    socket.emit("movePiece", {
                      roomId,
                      pieceIndex: room.selectedPiece,
                      stackIndex: idx
                    })
                  }
                >
                  {yutNames[room.moveStack[idx]]}
                </button>
              ))}

              {room.canPassTurn && (
                <button onClick={() => socket.emit("passTurn", roomId)}>
                  이동 불가 : 턴 넘기기
                </button>
              )}
            </div>
        )}





        {/* 윷 던지기 애니메이션 */}

        <div
          style={{
            position: "absolute",
            right: 420,
            top: 206,
            width: 264,
            height: 264,
            background: "#f6f1e7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            overflow: "hidden"
          }}
        >
          {/* 🔥 기본 이미지 항상 깔아둠 */}
          <img
            src="/images/basic.png"
            alt="윷 기본 이미지"
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />

          {/* 🔥 애니메이션 중일 때만 video */}
          {isYutAnimating && currentYutVideo && (
            <video
              key={currentYutVideo}
              src={currentYutVideo}
              autoPlay
              preload="auto"
              onLoadedData={() => setVideoReady(true)}   // 🔥 핵심
              onEnded={() => {
                setIsYutAnimating(false)
                setCurrentYutVideo(null)
                setVideoReady(false)
              }}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: videoReady ? 1 : 0   // 🔥 준비 전까지 숨김
              }}
            />
          )}
        </div>





      </div>
    </div>
  )  
}

export default App