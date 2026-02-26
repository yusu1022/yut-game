const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const path = require("path")

const app = express()
app.use(cors())

const server = http.createServer(app)

// 🔥 Vite build 파일 서빙
app.use(express.static(
  path.join(__dirname, "../client/dist")
))

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "../client/dist/index.html")
  )
})

const rooms = {}

const board = {
  // 🔹 바깥 테두리0:  { next: 1, prev: null },
0:  { next: 1, prev: null },
1:  { next: 2, prev: 20 },
2:  { next: 3, prev: 1 },
3:  { next: 4, prev: 2 },
4:  { next: 5, prev: 3 },
5:  { next: 6, prev: 4, shortcut: 21 },

6:  { next: 7, prev: 5 },
7:  { next: 8, prev: 6 },
8:  { next: 9, prev: 7 },
9:  { next: 10, prev: 8 },
10: { next: 11, prev: 9, shortcut: 26 },

11: { next: 12, prev: 10 },
12: { next: 13, prev: 11 },
13: { next: 14, prev: 12 },
14: { next: 15, prev: 13 },
15: { next: 16, prev: 14 },

16: { next: 17, prev: 15 },
17: { next: 18, prev: 16 },
18: { next: 19, prev: 17 },
19: { next: 20, prev: 18 },
20: { next: null, prev: 19 },

// 왼쪽 루트
21:  { next: 22, prev: 5 },
22:  { next: 231, prev: 21 },
231: { next: 24, prev: 22, shortcut: 29 },
24:  { next: 25, prev: 231 },
25:  { next: 15, prev: 24 },

// 오른쪽 루트
26:  { next: 27, prev: 10 },
27:  { next: 232, prev: 26 },
232: { next: 29, prev: 22 },
29:  { next: 30, prev: 232 },
30:  { next: 20, prev: 29 }
}

const tileMap = {
  231: 23,
  232: 23
}

function getTileId(pos) {
  if (pos == null) return null
  return tileMap[pos] ?? pos
}

// ======================================
// 🔥  일반칸 기본 점수 (수기로 입력)
// ======================================

const baseTileScores = {

  0: -5,

  1: 2,
  2: 0,
  3: 0,
  4: 1,
  
  6: 0,
  7: 3,
  8: 2,
  9: -3,
  
  11: 0,
  12: 1,
  13: -1,
  14: -2,
  
  16: 0,
  17: 2,
  18: -7,
  19: -6,
  
  20: -5,

  21: 0,
  22: 0,
  
  24: -2,
  25: -1,
  
  26: 4,
  27: 3,
  
  29: 0,
  30: 1,

}

// ======================================
// 🔥  특수칸 효과 정의
// ======================================

const specialTileEffects = {

  5:  { type: "zero" },              // 무조건 0점
  10: { type: "multiply", value: -2 },
  15: { type: "abs" },
  23: { type: "multiply", value: 3 },  // 231,232 → 23으로 매핑됨

}

// ======================================
// 🔥 3. tileEffectMap 자동 생성
// ======================================

const tileEffectMap = {}

// 1️⃣ 일반칸 → add 연산으로 변환
for (const key in baseTileScores) {
  tileEffectMap[key] = {
    type: "add",
    value: baseTileScores[key]
  }
}

// 2️⃣ 특수칸 → 덮어쓰기
for (const key in specialTileEffects) {
  tileEffectMap[key] = specialTileEffects[key]
}



// 빽도, 도, 개, 걸, 윷, 모 확률
const yutProbabilities = [0.0384, 0.1152, 0.3456, 0.3456, 0.1296, 0.0256]

// 윷0.6 모0.4 가정

// 모 0.4*0.4*0.4*0.4    = 0.0256
// 빽 0.6*0.4*0.4*0.4*1 = 0.0384
// 도 0.6*0.4*0.4*0.4*3 = 0.1152
// 개 0.6*0.6*0.4*0.4*6 = 0.3456
// 걸 0.6*0.6*0.6*0.4*4 = 0.3456
// 윷 0.6*0.6*0.6*0.6    = 0.1296

function getWeightedRandom() {
  const r = Math.random()
  let sum = 0

  for (let i = 0; i < yutProbabilities.length; i++) {
    sum += yutProbabilities[i]
    if (r < sum) return i
  }

  return 0
}

function move(position, steps) {
  let current = position

  // 🔥 앞으로 이동
  if (steps > 0) {
    for (let i = 0; i < steps; i++) {

      if (!board[current]) 
        return { pos: current, finished: false }

      if (i === 0 && board[current].shortcut) {
        current = board[current].shortcut
      } else {
        current = board[current].next
      }

      if (current == null) {
        if (i === steps - 1) {
          return { pos: null, finished: true }
        } else {
          return { pos: position, finished: false }
        }
      }
    }
  }

  // 🔥 뒤로 이동 (빽도)
  if (steps < 0) {
    for (let i = 0; i < Math.abs(steps); i++) {

      if (!board[current]) 
        return { pos: current, finished: false }

      current = board[current].prev

      if (current == null) {
        return { pos: position, finished: false }
      }
    }
  }

  return { pos: current, finished: false }
}

function canMove(piece, steps) {
  if (piece.finished) return false

  // 출발 전 빽도 불가
  if (piece.position === -1 && steps < 0)
    return false

  let startPos = piece.position

  if (startPos === -1)
    startPos = 0

  const result = move(startPos, steps)

  // 제자리면 이동 불가
  if (!result.finished && result.pos === piece.position)
    return false

  return true
}

function getUsableMoveIndexes(piece, moveStack) {
  const usable = []

  for (let i = 0; i < moveStack.length; i++) {
    const moveValue = moveStack[i]
    const steps = (moveValue === 0) ? -1 : moveValue

    if (canMove(piece, steps)) {
      usable.push(i)
    }
  }

  return usable
}

const io = new Server(server, {
  cors: {
    origin: "*"
  }
})

io.on("connection", (socket) => {
  console.log("유저 연결:", socket.id)

  socket.on("joinRoom", ({ nickname, roomId }) => {
    socket.join(roomId)

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        turnIndex: 0,
        phase: "waiting",
        moveStack: [],
        finishCount: 0,
        finishOrder: [],
        scores: [],
        scoreCalculated: false,
        canThrow: true
      }
    }


    rooms[roomId].players.push({
      socketId: socket.id,
      nickname,
      pieces: [
        { position: -1, finished: false },
        { position: -1, finished: false }
      ],
      islandPending: false   // 🔥 추가
    })

    io.to(roomId).emit("roomUpdate", rooms[roomId])
  })



  socket.on("startGame", (roomId) => {
    const room = rooms[roomId]
    if (!room) return

    if (room.players.length >= 2) {
      
      room.turnIndex = 0
      room.moveStack = []
      room.phase = "throwing"
      room.canThrow = true

      room.finishCount = 0
      room.finishOrder = []

      room.scores = new Array(room.players.length).fill(0)
      room.scoreCalculated = false

      console.log("=== startGame 이후 상태 ===")
      console.log("scores:", room.scores)
      console.log("scoreCalculated:", room.scoreCalculated)

      // 🔥 말 초기화
      room.players.forEach(player => {
        player.pieces = [
          { position: -1, finished: false },
          { position: -1, finished: false }
        ]
        player.islandPending = false   // 🔥 추가
      })

      io.to(roomId).emit("roomUpdate", room)
    }
  })

  

  socket.on("throwYut", (roomId) => {
    const room = rooms[roomId]
    if (!room) return
    if (room.phase !== "throwing") return
    if (!room.canThrow) return

    const player = room.players[room.turnIndex]
    if (player.socketId !== socket.id) return
    if (player.pieces.every(p => p.finished)) return

    // 🔥 이번 던지기 이후 추가 입력 차단
    room.canThrow = false

    const result = getWeightedRandom()
    room.moveStack.push(result)

    io.to(roomId).emit("yutThrown", { result })

    const isExtra = (result === 4 || result === 5)

    if (!isExtra) {
      room.phase = "moving"
    }

    io.to(roomId).emit("roomUpdate", room)
  })
  
  socket.on("readyForNextThrow", (roomId) => {
    const room = rooms[roomId]
    if (!room) return
    if (room.phase !== "throwing") return

    const player = room.players[room.turnIndex]
    if (player.socketId !== socket.id) return   // 🔥 추가

    room.canThrow = true

    io.to(roomId).emit("roomUpdate", room)
  })


  socket.on("skipIslandTurn", (roomId) => {
    const room = rooms[roomId]
    if (!room) return
    if (room.phase !== "throwing") return

    const player = room.players[room.turnIndex]
    if (player.socketId !== socket.id) return

    if (!player.islandPending) return

    player.islandPending = false

    room.turnIndex =
      (room.turnIndex + 1) % room.players.length

    room.canThrow = true

    io.to(roomId).emit("roomUpdate", room)
  })


  socket.on("selectPiece", ({ roomId, pieceIndex }) => {
    const room = rooms[roomId]
    if (!room) return
    if (room.phase !== "moving") return

    const player = room.players[room.turnIndex]
    if (player.socketId !== socket.id) return

    const piece = player.pieces[pieceIndex]
    if (!piece || piece.finished) return

    const usable = getUsableMoveIndexes(piece, room.moveStack)

    room.selectedPiece = pieceIndex
    room.usableMoves = usable

    // 🔥 모든 말이 이동 불가인지 계산
    const anyMovable = player.pieces.some(p =>
      getUsableMoveIndexes(p, room.moveStack).length > 0
    )

    room.canPassTurn = !anyMovable

    io.to(roomId).emit("roomUpdate", room)
  })



  
  socket.on("movePiece", ({ roomId, pieceIndex, stackIndex }) => {
    const room = rooms[roomId]
    if (!room) return
    if (room.phase !== "moving") return

    const player = room.players[room.turnIndex]
    if (player.socketId !== socket.id) return

    const moveValue = room.moveStack[stackIndex]
    if (moveValue == null) return
    if (!room.usableMoves?.includes(stackIndex)) return

    const selectedPiece = player.pieces[pieceIndex]
    if (!selectedPiece || selectedPiece.finished) return

    const steps = (moveValue === 0) ? -1 : moveValue
    if (!canMove(selectedPiece, steps)) return

    // =====================================================
    // 🔥 1️⃣ 업기: tileId 기준 그룹 생성
    // =====================================================

    const currentPos = selectedPiece.position
    let group

    if (currentPos === -1) {
      group = [selectedPiece]
    } else {
      const currentTile = getTileId(currentPos)

      group = player.pieces.filter(p =>
        !p.finished &&
        p.position !== -1 &&
        getTileId(p.position) === currentTile
      )
    }

    let startPos = currentPos === -1 ? 0 : currentPos
    const result = move(startPos, steps)

    // =====================================================
    // 🔥 2️⃣ 묶음 전체 이동
    // =====================================================

    group.forEach(p => {

      if (result.finished && !p.finished) {

        p.position = null
        p.finished = true

        room.finishCount += 1

        room.finishOrder.push({
          playerIndex: room.turnIndex,
          pieceIndex: player.pieces.indexOf(p),
          order: room.finishCount
        })

      } else if (!result.finished) {

        p.position = result.pos

      }

    })


    // =====================================================
    // 🔥 3️⃣ 잡기 로직 (tileId 기반)
    // =====================================================

    let didCapture = false

    if (!result.finished) {

      const myTile = getTileId(result.pos)

      room.players.forEach((otherPlayer, pIndex) => {

        if (pIndex === room.turnIndex) return

        otherPlayer.pieces.forEach(otherPiece => {

          if (
            !otherPiece.finished &&
            otherPiece.position !== -1 &&
            getTileId(otherPiece.position) === myTile
          ) {

            // 🔥 상대 묶음 전체 잡기 (tileId 기준)
            const enemyGroup = otherPlayer.pieces.filter(p =>
              !p.finished &&
              p.position !== -1 &&
              getTileId(p.position) === myTile
            )

            enemyGroup.forEach(p => {
              p.position = -1
              p.finished = false
            })

            didCapture = true
          }

        })
      })
    }

    // =====================================================
    // 🔥 무인도 도착 처리 (즉시 턴 종료)
    // =====================================================

    if (!result.finished && result.pos === 10) {

      player.islandPending = true

      // 남은 이동권 전부 제거
      room.moveStack = []

      // 선택 상태 초기화
      room.selectedPiece = null
      room.usableMoves = null
      room.canPassTurn = false

      // 턴 넘기기
      room.phase = "throwing"
      room.turnIndex =
        (room.turnIndex + 1) % room.players.length

      room.canThrow = true   // 🔥 반드시 추가

      io.to(roomId).emit("roomUpdate", room)
      return
    }

    

    // =====================================================
    // 🔥 4️⃣ 잡기 보상
    // =====================================================

    if (didCapture && moveValue <= 3) {
      room.phase = "throwing"
      room.canThrow = true   
    }

    // =====================================================
    // 🔥 5️⃣ 이동권 제거
    // =====================================================

    room.moveStack.splice(stackIndex, 1)

    room.selectedPiece = null
    room.usableMoves = null
    room.canPassTurn = false


    // 🔥 새 게임 종료 조건
    if (room.finishCount >= 7 && !room.scoreCalculated) {

      room.phase = "scoreCalculation"

      calculateScores(room)

      io.to(roomId).emit("roomUpdate", room)
      return
    }

    // =====================================================
    // 🔥 7️⃣ 턴 처리
    // =====================================================

    const allFinished = player.pieces.every(p => p.finished)

    // 1️⃣ 모든 말이 골인한 경우 → 즉시 턴 종료
    if (allFinished) {

      room.moveStack = []
      room.phase = "throwing"
      room.turnIndex =
        (room.turnIndex + 1) % room.players.length
      room.canThrow = true   // 🔥 반드시 추가

    }

    // 2️⃣ 일반 상황: 이동권 다 쓴 경우
    else if (room.phase === "moving" && room.moveStack.length === 0) {

      room.phase = "throwing"
      room.turnIndex =
        (room.turnIndex + 1) % room.players.length

      room.canThrow = true

    }




    io.to(roomId).emit("roomUpdate", room)
  })



  socket.on("passTurn", (roomId) => {
    const room = rooms[roomId]
    if (!room) return
    if (room.phase !== "moving" && room.phase !== "throwing") return

    const player = room.players[room.turnIndex]
    if (player.socketId !== socket.id) return

    const allFinished = player.pieces.every(p => p.finished)

    if (room.phase === "moving" && !room.canPassTurn && !allFinished)
      return

    if (room.phase === "throwing" && !allFinished)
      return

    room.moveStack = []
    room.usableMoves = null
    room.selectedPiece = null
    room.canPassTurn = false

    room.phase = "throwing"
    room.turnIndex =
      (room.turnIndex + 1) % room.players.length

    room.canThrow = true

    io.to(roomId).emit("roomUpdate", room)
  })


  socket.on("disconnect", () => {
    console.log("유저 연결 종료:", socket.id)

    for (const roomId in rooms) {
      const room = rooms[roomId]

      room.players = room.players.filter(
        user => user.socketId !== socket.id
      )

      // 방이 비었으면 삭제
      if (room.players.length === 0) {
        delete rooms[roomId]
      } else {
        io.to(roomId).emit("roomUpdate", room)
      }
    }
  })

})



function collectBoardOperations(player) {

  const operations = []

  player.pieces.forEach(function(piece) {

    if (!piece.finished) {

      // 🔥 출발 대기 → add 0 처리
      if (piece.position === -1) {

        operations.push({
          tileId: -1,
          type: "add",
          value: 0
        })

        return
      }

      const tileId = getTileId(piece.position)
      const effect = tileEffectMap[tileId]

      if (effect) {
        operations.push({
          tileId: tileId,
          type: effect.type,
          value: effect.value
        })
      }

    }

  })

  return operations
}

function calculateScores(room) {

  if (room.scoreCalculated) return
  room.scoreCalculated = true

  console.log("=== 점수 계산 시작 ===")

  const finishScoreTable = [7, 5, 4, -1, 3, 2, 1, 0]

  // 플레이어별 기본점수 초기화
  const baseScores = Array(room.players.length).fill(0)

  // ==============================
  // 1️⃣ 골인 순서 점수
  // ==============================

  room.finishOrder.forEach((entry, index) => {
    const playerIndex = entry.playerIndex
    if (finishScoreTable[index] != null) {
      baseScores[playerIndex] += finishScoreTable[index]
    }
  })

  // ==============================
  // 2️⃣ 두 말 완주 보너스
  // ==============================

  const secondFinishMap = {}

  room.finishOrder.forEach((entry, index) => {
    const playerIndex = entry.playerIndex
    if (!secondFinishMap[playerIndex]) {
      secondFinishMap[playerIndex] = []
    }
    secondFinishMap[playerIndex].push(index + 1)
  })

  const twoFinishList = []

  for (const playerIndex in secondFinishMap) {
    if (secondFinishMap[playerIndex].length >= 2) {
      twoFinishList.push({
        playerIndex: parseInt(playerIndex),
        secondFinishAt: secondFinishMap[playerIndex][1]
      })
    }
  }

  twoFinishList.sort((a, b) => a.secondFinishAt - b.secondFinishAt)

  if (twoFinishList[0]) {
    baseScores[twoFinishList[0].playerIndex] += 5
  }

  if (twoFinishList[1]) {
    baseScores[twoFinishList[1].playerIndex] += 3
  }

  // ==============================
  // 3️⃣ 보드 연산 포함 최종 계산
  // ==============================

  room.players.forEach((player, playerIndex) => {

    const operations = collectBoardOperations(player)

    const hasZero = operations.some(op => op.type === "zero")
    if (hasZero) {
      room.scores[playerIndex] = 0
      return
    }

    const addOps = operations.filter(op => op.type === "add")
    const multiplyOps = operations.filter(op => op.type === "multiply")
    const hasAbs = operations.some(op => op.type === "abs")

    let score = baseScores[playerIndex]

    // add 먼저
    addOps.forEach(op => {
      score += op.value
    })

    // 🔥 multiply만 있고 score가 0이면 1 생성
    if (score === 0 && addOps.length === 0 && multiplyOps.length > 0) {
      score = 1
    }

    // multiply 적용
    multiplyOps.forEach(op => {
      score *= op.value
    })

    // abs 적용
    if (hasAbs) {
      score = Math.abs(score)
    }

    room.scores[playerIndex] = score

  })

  console.log("최종 점수:", room.scores)

  room.phase = "result"
}


const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log("서버 실행 중:", PORT)
})