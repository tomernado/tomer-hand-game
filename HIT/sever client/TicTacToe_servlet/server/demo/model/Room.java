package org.example.demo.model;

import java.util.UUID;

public class Room {

	private final String roomToken;
	private final Player[] players;
	private Game game;

	public Room() {
		roomToken = UUID.randomUUID().toString();
		players = new Player[2];
		game = new Game();
	}

	public Game getGame() {
		return game;
	}

	public void newGame(){
		game = new Game();
	}

	public String getRoomToken() {
		return roomToken;
	}

	public void addPlayer1(Player player) {
		players[0] = player;
	}

	public void addPlayer2(Player player) {
		players[1] = player;
	}

	public Player[] getPlayers() {
		return players;
	}
}
