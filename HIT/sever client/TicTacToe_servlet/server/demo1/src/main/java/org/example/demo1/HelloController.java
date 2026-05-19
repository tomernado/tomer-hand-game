package org.example.demo1;

import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;

import java.util.concurrent.atomic.AtomicBoolean;

public class HelloController {
	public TextField GameIdTextField;
	public Button joinGameButton;
	public Button createGameButton;
	public Button cell00;
	public Button cell01;
	public Button cell02;
	public Button cell10;
	public Button cell11;
	public Button cell12;
	public Button cell20;
	public Button cell21;
	public Button cell22;
	public Button restart;
	public Label iamLabel;
	public Label turnLabel;
	public Label whoWonLabel;

	private Model model;

	private final AtomicBoolean go = new AtomicBoolean(true);
	private final Runnable renderOnFly = () -> {
			while (go.get()) {
				renderGame();
				try {
					Thread.sleep(1000);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}
	};

	@FXML
	public void initialize() {
		model = new Model();

		joinGameButton.setOnAction(e -> setJoinGameButton());
		createGameButton.setOnAction(e -> setCreateGameButton());
		restart.setOnAction(e -> setRestartButton());
		cell00.setOnAction(e -> onPlay(0, 0));
		cell01.setOnAction(e -> onPlay(0, 1));
		cell02.setOnAction(e -> onPlay(0, 2));
		cell10.setOnAction(e -> onPlay(1, 0));
		cell11.setOnAction(e -> onPlay(1, 1));
		cell12.setOnAction(e -> onPlay(1, 2));
		cell20.setOnAction(e -> onPlay(2, 0));
		cell21.setOnAction(e -> onPlay(2, 1));
		cell22.setOnAction(e -> onPlay(2, 2));

		Thread t = new Thread(renderOnFly);
		t.start();
	}

	public void onPlay(int i, int j){
		model.play(i,j);
		renderGame();
	}

	public void setCreateGameButton(){
		model.createNewGame((roomNumber,palyerToken, type)->{
			GameIdTextField.setText(roomNumber);
			iamLabel.setText(type+"");
			allBtns(true);
			renderGame();
		});
	}

	public void setJoinGameButton(){
		model.joinGame(GameIdTextField.getText(),(palyerToken, type)->{
			iamLabel.setText(type+"");
			allBtns(true);
			renderGame();
		});
	}

	public void setRestartButton(){
		model.restartGame(()->{
			allBtns(true);
			renderGame();
		});
	}

	public void renderGame(){
		model.rander((turn,matrix,howWon)->{
			turnLabel.setText(turn+"");
			whoWonLabel.setText(howWon+"");
			if(howWon != ' '){
				allBtns(true);
				return;
			}
			char cell00Char = matrix[0][0];
			cell00.setText(cell00Char + "");
			if(cell00Char == ' ') {
				cell00.setStyle("-fx-background-color: transparent;");
				cell00.setDisable(true);
			}
			char cell01Char = matrix[0][1];
			cell01.setText(cell01Char + "");
			if(cell01Char == ' ') {
				cell01.setStyle("-fx-background-color: transparent;");
				cell01.setDisable(true);
			}
			char cell02Char = matrix[0][2];
			cell02.setText(cell02Char + "");
			if(cell02Char == ' ') {
				cell02.setStyle("-fx-background-color: transparent;");
				cell10.setDisable(true);
			}
			char cell10Char = matrix[1][0];
			cell10.setText(cell10Char + "");
			if(cell10Char == ' ') {
				cell10.setStyle("-fx-background-color: transparent;");
				cell10.setDisable(true);
			}
			char cell11Char = matrix[1][1];
			cell11.setText(cell11Char + "");
			if(cell11Char == ' ') {
				cell11.setStyle("-fx-background-color: transparent;");
				cell10.setDisable(true);
			}
			char cell12Char = matrix[1][2];
			cell12.setText(cell12Char + "");
			if(cell12Char == ' ') {
				cell12.setStyle("-fx-background-color: transparent;");
				cell10.setDisable(true);
			}
			char cell20Char = matrix[2][0];
			cell20.setText(cell20Char + "");
			if(cell20Char == ' ') {
				cell20.setStyle("-fx-background-color: transparent;");
				cell20.setDisable(true);
			}
			char cell21Char = matrix[2][1];
			cell21.setText(cell21Char + "");
			if(cell21Char == ' ') {
				cell21.setStyle("-fx-background-color: transparent;");
				cell10.setDisable(true);
			}
			char cell22Char = matrix[2][2];
			cell22.setText(cell22Char + "");
			if(cell22Char == ' ') {
				cell22.setStyle("-fx-background-color: transparent;");
				cell10.setDisable(true);
			}
		});
	}

	private void allBtns(boolean ifClose) {
		cell00.setDisable(ifClose);
		cell01.setDisable(ifClose);
		cell02.setDisable(ifClose);
		cell10.setDisable(ifClose);
		cell11.setDisable(ifClose);
		cell12.setDisable(ifClose);
		cell20.setDisable(ifClose);
		cell21.setDisable(ifClose);
		cell22.setDisable(ifClose);
	}


}
