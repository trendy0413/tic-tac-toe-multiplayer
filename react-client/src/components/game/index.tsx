import { listenerCount } from "process";
import React, { useContext, useEffect, useState, useRef } from "react";
import styled from "styled-components";
import gameContext from "../../gameContext";
import gameService from "../../services/gameService";
import socketService from "../../services/socketService";

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
`;

const RowContainer = styled.div`
  width: 100%;
  display: flex;
`;

interface ICellProps {
  borderTop?: boolean;
  borderRight?: boolean;
  borderLeft?: boolean;
  borderBottom?: boolean;
}

const Cell = styled.div<ICellProps>`
  width: 13em;
  height: 9em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  cursor: pointer;
  border-top: ${({ borderTop }) => borderTop && "3px solid #8e44ad"};
  border-left: ${({ borderLeft }) => borderLeft && "3px solid #8e44ad"};
  border-bottom: ${({ borderBottom }) => borderBottom && "3px solid #8e44ad"};
  border-right: ${({ borderRight }) => borderRight && "3px solid #8e44ad"};
  transition: all 270ms ease-in-out;

  &:hover {
    background-color: #8d44ad28;
  }
`;

const PlayStopper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 99;
  cursor: default;
`;

const X = styled.span`
  font-size: 100px;
  color: #8e44ad;
  &::after {
    content: "X";
  }
`;

const O = styled.span`
  font-size: 100px;
  color: #8e44ad;
  &::after {
    content: "O";
  }
`;

const ExitBtn = styled.button`
  outline: none;
  background-color: #8e44ad;
  color: #fff;
  font-size: 17px;
  border: 2px solid transparent;
  border-radius: 5px;
  padding: 4px 18px;
  transition: all 230ms ease-in-out;
  margin-top: 1em;
  cursor: pointer;

  &:hover {
    background-color: transparent;
    border: 2px solid #8e44ad;
    color: #8e44ad;
  }
`;
export type IPlayMatrix = Array<Array<string | null>>;
export interface IStartGame {
  start: boolean;
  symbol: "x" | "o";
}

export function Game() {
  // var timeoutID: NodeJS.Timeout;
  let cnt = 0;
  let falseList: Array<boolean> = [];
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [matrix, setMatrix] = useState<IPlayMatrix>([
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]);
  const [wins, setWins] = useState<Array<Boolean>>([]);
  const {
    isInRoom,
    setInRoom,
    playerSymbol,
    setPlayerSymbol,
    setPlayerTurn,
    isPlayerTurn,
    setGameStarted,
    isGameStarted,
    isPlayerInitTurn,
    setPlayerInitTurn,
  } = useContext(gameContext);
  
  const initGame = () => {
    setMatrix([
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]);
    setGameStarted(true);
  }

  const checkGameState = (matrix: IPlayMatrix) => {
    for (let i = 0; i < matrix.length; i++) {
      let row = [];
      for (let j = 0; j < matrix[i].length; j++) {
        row.push(matrix[i][j]);
      }

      if (row.every((value) => value && value === playerSymbol)) {
        return [true, false];
      } else if (row.every((value) => value && value !== playerSymbol)) {
        return [false, true];
      }
    }

    for (let i = 0; i < matrix.length; i++) {
      let column = [];
      for (let j = 0; j < matrix[i].length; j++) {
        column.push(matrix[j][i]);
      }

      if (column.every((value) => value && value === playerSymbol)) {
        return [true, false];
      } else if (column.every((value) => value && value !== playerSymbol)) {
        return [false, true];
      }
    }

    if (matrix[1][1]) {
      if (matrix[0][0] === matrix[1][1] && matrix[2][2] === matrix[1][1]) {
        if (matrix[1][1] === playerSymbol) return [true, false];
        else return [false, true];
      }

      if (matrix[2][0] === matrix[1][1] && matrix[0][2] === matrix[1][1]) {
        if (matrix[1][1] === playerSymbol) return [true, false];
        else return [false, true];
      }
    }

    //Check for a tie
    if (matrix.every((m) => m.every((v) => v !== null))) {
      return [true, true];
    }

    return [false, false];
  };

  const updateGameMatrix = (column: number, row: number, symbol: "x" | "o") => {
    const newMatrix = [...matrix];
    let playerTurn: boolean = false;
    timeoutRef.current = setTimeout((msg) => {
      if(socketService.socket) {
        let newWins = [...wins, true];
        console.log(newWins.filter(w => w === true));
        if(newWins.filter(w => w === true).length >= 10 || (newWins.length >= 3 && newWins.slice(newWins.length-3).every(w => w===true))) {
          gameService.gameWin(socketService.socket, "Total Lose!");
          alert("Total Win!");
          newWins = [];
          playerTurn = !isPlayerTurn;
        } else {
          gameService.gameWin(socketService.socket, "You Lost!");
          alert("You Won!");
          playerTurn = !isPlayerTurn;
        }
        setWins(newWins);
        initGame();
      }
    }, 15000, '15 secconds passed and You Won!')
    if (newMatrix[row][column] === null || newMatrix[row][column] === "null") {
      newMatrix[row][column] = symbol;
      setMatrix(newMatrix);
    }

    if (socketService.socket) {
      gameService.updateGame(socketService.socket, newMatrix);
      const [currentPlayerWon, otherPlayerWon] = checkGameState(newMatrix);
      if (currentPlayerWon && otherPlayerWon) {
        cancel();
        gameService.gameWin(socketService.socket, "The Game is a TIE!");
        alert("The Game is a TIE!");
      } else if (currentPlayerWon && !otherPlayerWon) {
        cancel();
        let newWins = [...wins, true];
        console.log(newWins.filter(w => w === true));
        if(newWins.filter(w => w === true).length >= 10 || (newWins.length >= 3 && newWins.slice(newWins.length-3).every(w => w===true))) {
          gameService.gameWin(socketService.socket, "Total Lose!");
          alert("Total Win!");
          newWins = [];
          playerTurn = !isPlayerTurn;
        } else {
          gameService.gameWin(socketService.socket, "You Lost!");
          alert("You Won!");
          playerTurn = !isPlayerTurn;
        }
        setWins(newWins);
        initGame();
      }
      setPlayerTurn(playerTurn);
    }
  };
  const cancel = () => {
    clearTimeout(timeoutRef.current as NodeJS.Timeout);
  }
  const handleGameUpdate = () => {
    if (socketService.socket)
      gameService.onGameUpdate(socketService.socket, (newMatrix) => {
        setMatrix(newMatrix);
        checkGameState(newMatrix);
        setPlayerTurn(true);
        cancel();
      });
  };

  const handleGameStart = () => {
    if (socketService.socket)
      gameService.onStartGame(socketService.socket, (options) => {
        setGameStarted(true);
        setPlayerSymbol(options.symbol);
        if (options.start) {
          setPlayerTurn(true);
        }
        else {
          setPlayerTurn(false);
        }
      });
  };
  
  const setWinsFunc = () => {
    setWins((prevWins) => ([...prevWins, false]));
  }

  const handleGameWin = () => {
    if (socketService.socket) {
      gameService.onGameWin(socketService.socket, (message) => {
        console.log("Here", message);
        setWinsFunc();
        if(message === 'Total Lose!') setWins([]);
        alert(message);
        initGame();
        setPlayerTurn(!isPlayerTurn);
      });
    }
  };

  useEffect(() => {
    handleGameUpdate();
    handleGameStart();
    handleGameWin();
    return () => {
      socketService.socket?.off('on_game_win')
      socketService.socket?.off('on_game_update')
      socketService.socket?.off('start_game')
    }
  }, []);

  return (
    <>
    <GameContainer>
      {!isGameStarted && (
        <h2>Waiting for Other Player to Join to Start the Game!</h2>
      )}
      {(!isGameStarted || !isPlayerTurn) && <PlayStopper />}
      WIN: {wins.filter(w => (w === true)).length}<br />
      LOSE: {wins.filter(w => (w === false)).length}
      {matrix.map((row, rowIdx) => {
        return (
          <RowContainer>
            {row.map((column, columnIdx) => (
              <Cell
                borderRight={columnIdx < 2}
                borderLeft={columnIdx > 0}
                borderBottom={rowIdx < 2}
                borderTop={rowIdx > 0}
                onClick={() =>
                  updateGameMatrix(columnIdx, rowIdx, playerSymbol)
                }
              >
                {column && column !== "null" ? (
                  column === "x" ? (
                    <X />
                  ) : (
                    <O />
                  )
                ) : null}
              </Cell>
            ))}
          </RowContainer>
        );
      })}
    </GameContainer>
    <ExitBtn onClick={() => {window.location.reload();}}>
      exit
    </ExitBtn>
    </>
  );
}
