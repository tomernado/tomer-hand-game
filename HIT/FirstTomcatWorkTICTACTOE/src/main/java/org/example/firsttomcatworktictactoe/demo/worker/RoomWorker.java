package org.example.firsttomcatworktictactoe.demo.worker;
import org.example.firsttomcatworktictactoe.demo.model.Player;
import org.example.firsttomcatworktictactoe.demo.model.Room;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class RoomWorker {

	private final List<Room> rooms = new ArrayList<>();

	public String createRoom() {
		Room room = new Room();
		Player player1 = new Player(UUID.randomUUID().toString(), 'X');
		room.addPlayer1(player1);
		rooms.add(room);
		return room.getRoomToken();
	}

	public boolean joinRoom(String roomId) {
		Room room = rooms.stream().filter(r -> r.getRoomToken().equals(roomId)).findFirst().orElse(null);
		if (room != null && room.getPlayers()[1] == null) {
			Player player2 = new Player(UUID.randomUUID().toString(), 'O');
			room.addPlayer2(player2);
			return true;
		}
		return false;
	}

	public Room getRoom(String roomId) {
		return rooms.stream().filter(r -> r.getRoomToken().equals(roomId)).findFirst().orElse(null);
	}

	public void closeRoom(String roomId) {
		rooms.removeIf(room -> room.getRoomToken().equals(roomId));
	}
}
