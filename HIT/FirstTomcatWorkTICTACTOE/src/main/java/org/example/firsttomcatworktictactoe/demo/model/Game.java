package org.example.firsttomcatworktictactoe.demo.model;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import java.util.Arrays;

public class Game {
	private final char[][] matrix;
	private char turn;
	private char whoWon = Type.EMPTY;

	public Game() {
		matrix = new char[3][3];
		Arrays.stream(matrix).forEach(row -> Arrays.fill(row, ' '));
		turn = Type.X;
	}

	public boolean play(char type, int i, int j) {
		if(type != Type.X && type != Type.O) return false;
		if(type == turn && whoWon == Type.EMPTY && matrix[i][j] == Type.EMPTY){
			matrix[i][j] = type;
			turn = turn == Type.X ? Type.O : Type.X;
			checkIfWon();
			return true;
		}
		return false;
	}

	public void checkIfWon(){
		for(int i = 0; i < 3; i++){
			if(matrix[i][0] == matrix[i][1] && matrix[i][1] == matrix[i][2] && matrix[i][0] != Type.EMPTY){
				whoWon = matrix[i][0] == Type.X ? Type.X: Type.O;
				return;
			}
			if(matrix[0][i] == matrix[1][i] && matrix[1][i] == matrix[2][i] && matrix[0][i] != Type.EMPTY){
				whoWon = matrix[0][i] == Type.X ? Type.X: Type.O;
				return;
			}
		}
		if(matrix[0][0] == matrix[1][1] && matrix[1][1] == matrix[2][2] && matrix[0][0] != Type.EMPTY){
			whoWon = matrix[0][0] == Type.X ? Type.X: Type.O;
			return;
		}
		if(matrix[0][2] == matrix[1][1] && matrix[1][1] == matrix[2][0] && matrix[0][2] != Type.EMPTY){
			whoWon = matrix[0][2] == Type.X ? Type.X: Type.O;
			return;
		}
	}

	@Override
	public String toString() {
		Gson gson = new Gson();
		JsonObject jsonObject = new JsonObject();
		jsonObject.addProperty("turn", turn);
		jsonObject.addProperty("whoWon", whoWon);
		jsonObject.add("matrix", gson.toJsonTree(matrix));
		return jsonObject.toString();
	}
}

