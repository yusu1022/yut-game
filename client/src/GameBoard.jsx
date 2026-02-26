import { useEffect, useRef } from "react"

const islandImage = new Image()
islandImage.src = "/images/muindo.png"

export default function GameBoard({ room }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    draw(ctx)
  }, [room])

  
  const playerColors = [
      "#e31a1c",
      "#ff9900",
      "#ffdd00",
      "#2ca02c",
      "#1f77b4"
  ]


  function draw(ctx) {

    const canvasWidth = 1400
    const canvasHeight = 700

    const boardStart = 80
    const boardSize = 540
    const boardEnd = boardStart + boardSize

    const center = boardStart + boardSize / 2

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  

    // =============================
    // 보드 선
    // =============================
    ctx.strokeStyle = "#8b5a2b"
    ctx.lineWidth = 4

    ctx.strokeRect(boardStart, boardStart, boardSize, boardSize)

    ctx.beginPath()
    ctx.moveTo(boardStart, boardStart)
    ctx.lineTo(boardEnd, boardEnd)
    ctx.moveTo(boardEnd, boardStart)
    ctx.lineTo(boardStart, boardEnd)
    ctx.stroke()

    // =============================
    // 서버 position 기준 좌표 매핑
    // =============================

    const boardNodes = {}

    // =============================
    // 대표 고정 노드
    // =============================

    boardNodes[0]  = { x: boardEnd,   y: boardEnd }
    boardNodes[5]  = { x: boardEnd,   y: boardStart }
    boardNodes[10] = { x: boardStart, y: boardStart }
    boardNodes[15] = { x: boardStart, y: boardEnd }
    boardNodes[20] = { x: boardEnd,   y: boardEnd }
    boardNodes[231] = { x: center, y: center }
    boardNodes[232] = { x: center, y: center }

    // 1~4 (우하 → 우상)
    boardNodes[1] = { x: boardEnd, y: 500 }
    boardNodes[2] = { x: boardEnd, y: 400 }
    boardNodes[3] = { x: boardEnd, y: 300 }
    boardNodes[4] = { x: boardEnd, y: 200 }

    // 6~9 (상단 우→좌)
    boardNodes[6] = { x: 500, y: boardStart }
    boardNodes[7] = { x: 400, y: boardStart }
    boardNodes[8] = { x: 300, y: boardStart }
    boardNodes[9] = { x: 200, y: boardStart }

    // 11~14 (좌측 상→하)
    boardNodes[11] = { x: boardStart, y: 200 }
    boardNodes[12] = { x: boardStart, y: 300 }
    boardNodes[13] = { x: boardStart, y: 400 }
    boardNodes[14] = { x: boardStart, y: 500 }

    // 16~19 (하단 좌→우)
    boardNodes[16] = { x: 200, y: boardEnd }
    boardNodes[17] = { x: 300, y: boardEnd }
    boardNodes[18] = { x: 400, y: boardEnd }
    boardNodes[19] = { x: 500, y: boardEnd }

    // 오른쪽 지름길
    boardNodes[21]  = { x: center + 175, y: center - 175 }
    boardNodes[22]  = { x: center + 95, y: center - 95 }
    
    boardNodes[24]  = { x: center - 95, y: center + 95 }
    boardNodes[25]  = { x: center - 175, y: center + 175 }

    // 왼쪽 지름길
    boardNodes[26]  = { x: center - 175, y: center - 175 }
    boardNodes[27]  = { x: center - 95, y: center - 95 }
    
    boardNodes[29]  = { x: center + 95, y: center + 95 }
    boardNodes[30]  = { x: center + 175, y: center + 175 }

    // =============================
    // 노드 그리기
    // =============================

    function drawNode(x, y, r = 30, index = null) {

      // 🔥 무인도 칸이면 이미지로 그리기
      if (index === 10 && islandImage.complete) {

        ctx.save()

        // 원형 클리핑
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()

        ctx.drawImage(
          islandImage,
          x - r,
          y - r,
          r * 2,
          r * 2
        )

        ctx.restore()

        // 테두리 다시 그리기
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.lineWidth = 2
        ctx.strokeStyle = "#8b5a2b"
        ctx.stroke()

        return
      }

      // 🔥 일반 노드
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = "#fdf8ef"
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = "#8b5a2b"
      ctx.stroke()
    }

    Object.entries(boardNodes).forEach(([key, node]) => {

      const index = Number(key)

      // 대표 노드들
      const isMainNode =
        index === 0 ||
        index === 5 ||
        index === 10 ||
        index === 15 ||
        index === 20 ||
        index === 231 ||
        index === 232

      const radius = isMainNode ? 50 : 30

      drawNode(node.x, node.y, radius, index)
    })

    // ======================================
    // 🔥 보드 점수 테이블 (서버와 동일)
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

    // 특수칸 (UI용 단순 표시)
    const specialTileScores = {
      5: "×0",
      10: "×-2",
      15: "abs",
      231: "×3",
      232: "×3",
    }

    // ======================================
    // 🔥 보드 노드 점수 표시
    // ======================================

    ctx.font = "14px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    Object.entries(boardNodes).forEach(([key, node]) => {

      const index = Number(key)

      let scoreText = null

      if (baseTileScores[index] != null) {
        const val = baseTileScores[index]
        scoreText = val >= 0 ? `+${val}` : `${val}`
      }

      if (specialTileScores[index] != null) {
        scoreText = specialTileScores[index]
      }

      if (!scoreText) return

      let textX = node.x
      let textY = node.y

      // -----------------------------
      // 위치별 오프셋 적용
      // -----------------------------

      // 대표 노드
      if ([5,10,231,232].includes(index)) {
        textY -= 30
      }

      if ([0,15,20].includes(index)) {
        textY += 30
      }


      // 우측 노드
      else if ([1,2,3,4].includes(index)) {
        textX += 45
      }

      // 상단 노드
      else if ([6,7,8,9].includes(index)) {
        textY -= 40
      }

      // 좌측 노드
      else if ([11,12,13,14].includes(index)) {
        textX -= 45
      }

      // 하단 노드
      else if ([16,17,18,19].includes(index)) {
        textY += 40
      }

      // 대각선 (21,22,29,30)
      else if ([21,22,29,30].includes(index)) {
        textX -= 45
      }

      // 대각선 (26,27,24,25)
      else if ([26,27,24,25].includes(index)) {
        textX += 45
      }

      ctx.fillStyle = "#000"
      ctx.fillText(scoreText, textX, textY)
    })

    // =============================
    // 슬롯 함수
    // =============================

    function drawSlot(x, y, r = 22) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = "#8b8b8b"
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = "#292929"
      ctx.stroke()
    }

    function drawPiece(x, y, color, pieceIndex, r = 18) {
        // 원
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)

        ctx.fillStyle = color
        ctx.fill()

        // 테두리 통일
        ctx.lineWidth = 2
        ctx.strokeStyle = "rgb(38, 38, 38)020"
        ctx.stroke()

        // 🔥 내부 텍스트 (A, B, C...)
        const label = String.fromCharCode(65 + pieceIndex)

        ctx.fillStyle = "white"
        ctx.font = "bold 16px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(label, x, y)
    }

    
    // =============================
    // 출발 대기 슬롯
    // =============================

    const rightPadding = 77
    const bottomPadding = 252

    const rowGap = 55
    const colGap = 55

    const waitingStartX =
    canvasWidth - rightPadding - colGap

    const waitingStartY =
    canvasHeight - bottomPadding - rowGap * 4

    for (let p = 0; p < 5; p++) {
      for (let i = 0; i < 2; i++) {
        const x = waitingStartX + i * colGap
        const y = waitingStartY + p * rowGap
        drawSlot(x, y)
      }
    }


    // =============================
    // 참가자 목록 (출발 대기 왼쪽)
    // =============================

    const playerBoxWidth = 180
    const playerBoxHeight = 40
    const colorBoxWidth = 20
    const nameBoxWidth = 160
    const playerGap = 55
    const arrowWidth = 25

    const playerListStartX = waitingStartX - playerBoxWidth - 40

    const playerListStartY =
    waitingStartY - 22

    const arrowStartX =
    playerListStartX - arrowWidth - 10

    if (room) {
    room.players.forEach((player, index) => {

        const y = playerListStartY + index * playerGap

        // ▶ 현재 턴 표시
        if (room.phase !== "result" && room.turnIndex === index) {
        ctx.fillStyle = "#000"
        ctx.font = "22px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        ctx.fillText(
            "▶",
            arrowStartX + arrowWidth / 2,
            y + playerBoxHeight / 2
        )
        }

        // 색깔 박스
        ctx.fillStyle = playerColors[index]
        ctx.fillRect(playerListStartX, y, colorBoxWidth, playerBoxHeight)

        ctx.strokeStyle = "#333"
        ctx.strokeRect(playerListStartX, y, colorBoxWidth, playerBoxHeight)

        // 이름 박스
        ctx.fillStyle = "#fdf8ef"
        ctx.fillRect(
        playerListStartX + colorBoxWidth,
        y,
        nameBoxWidth,
        playerBoxHeight
        )

        ctx.strokeRect(
        playerListStartX + colorBoxWidth,
        y,
        nameBoxWidth,
        playerBoxHeight
        )

        // 이름 텍스트
        ctx.fillStyle = "#000"
        ctx.font = "16px sans-serif"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"

        ctx.fillText(
          player.nickname,
          Math.round(playerListStartX + colorBoxWidth + 10),
          Math.round(y + playerBoxHeight / 2)
        )

    })
    }


    // ======================================
    // 🔥 게임 종료 시 등수 계산 및 표시
    // ======================================

    if (room && room.phase === "result" && room.scores) {

      // 1️⃣ 점수 + 인덱스 묶기
      const scoreData = room.scores.map((score, index) => ({
        score,
        index
      }))

      // 2️⃣ 점수 내림차순 정렬
      scoreData.sort((a, b) => b.score - a.score)

      // 3️⃣ competition ranking 계산
      const ranks = new Array(room.players.length)

      let currentRank = 1
      let skipCount = 0

      for (let i = 0; i < scoreData.length; i++) {

        if (i > 0 && scoreData[i].score === scoreData[i - 1].score) {
          // 동점 → 같은 등수
          skipCount++
        } else {
          // 새 점수 → 등수 갱신
          currentRank = i + 1
          skipCount = 0
        }

        ranks[scoreData[i].index] = currentRank
      }

      // 4️⃣ 이모지 매핑
      const rankEmoji = {
        1: "🥇",
        2: "🥈",
        3: "🥉",
        5: "💀"
      }

      ctx.font = "22px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      room.players.forEach((player, index) => {

        const rank = ranks[index]
        const emoji = rankEmoji[rank] || ""

        if (!emoji) return

        const y = playerListStartY + index * playerGap

        ctx.fillText(
          emoji,
          arrowStartX + arrowWidth / 2,
          y + playerBoxHeight / 2
        )
      })
    }


    // ======================================
    // 🔥 게임 종료 점수 표시
    // ======================================

    if (room && room.phase === "result" && room.scores) {

      const scoreStartX =
        playerListStartX + colorBoxWidth + nameBoxWidth - 10

      ctx.font = "20px sans-serif"
      ctx.textAlign = "right"
      ctx.textBaseline = "middle"

      room.players.forEach((player, index) => {

        const y = playerListStartY + index * playerGap
        const score = room.scores[index]

        ctx.fillStyle = "#000"

        ctx.fillText(
          `${score}점`,
          scoreStartX,
          y + playerBoxHeight / 2
        )
      })
    }



    




    // =============================
    // 골인 슬롯 (8열 1행 - 가로 배치)
    // =============================

    const topPadding = 120
    const rightPaddingFinish = 80
    const finishGap = 80

    // 8번째 슬롯이 오른쪽에서 80px, 위에서 120px 떨어지도록 계산
    const finishStartX =
    canvasWidth - rightPaddingFinish - finishGap * 7

    const finishStartY =
    topPadding

    const finishSlots = []

    for (let i = 0; i < 8; i++) {
    finishSlots.push({
        x: finishStartX + i * finishGap,
        y: finishStartY
    })
    }

    finishSlots.forEach(slot => {
      drawSlot(slot.x, slot.y, 30)
    })

    // ======================================
    // 🔥 골인 슬롯 점수 텍스트
    // ======================================

    const finishScoreTable = [7, 5, 4, -1, 3, 2, 1, 0]

    ctx.fillStyle = "#000"
    ctx.font = "16px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    finishSlots.forEach((slot, index) => {

      const score = finishScoreTable[index]

      let text = ""

      if (score >= 0) {
        text = `+${score}`
      } else {
        text = `${score}`   // 음수는 자동으로 - 붙음
      }

      ctx.fillText(
        text,
        slot.x,
        slot.y + 45
      )
    })


    // =============================
    // 말 그리기
    // =============================

    if (!room) return

    // ======================================
    // 🔥 두 말 완주 보너스 계산 (UI 표시용)
    // ======================================

    let firstBonusName = null
    let secondBonusName = null

    if (room.finishOrder && room.players) {

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

          const secondFinishAt = secondFinishMap[playerIndex][1]

          twoFinishList.push({
            playerIndex: parseInt(playerIndex),
            secondFinishAt
          })
        }
      }

      twoFinishList.sort((a, b) => a.secondFinishAt - b.secondFinishAt)

      if (twoFinishList[0]) {
        firstBonusName =
          room.players[twoFinishList[0].playerIndex].nickname
      }

      if (twoFinishList[1]) {
        secondBonusName =
          room.players[twoFinishList[1].playerIndex].nickname
      }
    }

    // ======================================
    // 🔥 보너스 표시 텍스트
    // ======================================

    ctx.fillStyle = "#000"
    ctx.font = "22px sans-serif"
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"

    const bonusTextY = finishStartY - 55
    const bonusTextX = 730

    ctx.fillText(
      `1등 보너스 (+5) : ${firstBonusName ?? ""}`,
      bonusTextX,
      bonusTextY
    )

    ctx.fillText(
      `2등 보너스 (+3) : ${secondBonusName ?? ""}`,
      bonusTextX + 320,
      bonusTextY
    )





    room.players.forEach((player, pIndex) => {

      player.pieces.forEach((piece, pieceIndex) => {

        const color = playerColors[pIndex]

        // 출발 대기
        if (piece.position === -1) {
          const x = waitingStartX + pieceIndex * colGap
          const y = waitingStartY + pIndex * rowGap
          drawPiece(x, y, color, pieceIndex)
        }

        // 골인
        else if (piece.finished) {
            const entry = room.finishOrder.find(
                f => f.playerIndex === pIndex && f.pieceIndex === pieceIndex
            )

            if (entry) {
                const slot = finishSlots[entry.order - 1]
                if (slot) {
                drawPiece(slot.x, slot.y, color, pieceIndex)
                }
            }
            }

        // 보드 위
        else {

        const node = boardNodes[piece.position]

        if (node) {

            // 🔥 같은 위치에 있는 말들 찾기
            const sameTilePieces = player.pieces.filter(p =>
            !p.finished &&
            p.position === piece.position
            )

            let offsetX = 0

            // 🔥 2개 이상 겹쳐 있을 때만 분리
            if (sameTilePieces.length >= 2) {

            // 이 말이 같은 타일에서 몇 번째인지
            const indexInGroup = sameTilePieces.indexOf(piece)

            offsetX = indexInGroup === 0 ? -10 : 10
            }

            drawPiece(node.x + offsetX, node.y, color, pieceIndex)
        }
        }

      })

    })

  }

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={700}
      style={{
        display: "block",
        margin: "20px auto",

        // 🔥 여기부터 추가
        backgroundImage: "url('/images/canvas.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    />
  )
}