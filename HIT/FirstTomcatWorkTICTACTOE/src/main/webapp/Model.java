package org.example.app;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;

public class Model {
	private static final String URL_SERVER = "http://localhost:8080/";

	private char[][] board;
	private char turn;
	private char iam;
	private String gameId;
	private String playerId;

	public Model() {

	}


	public void play(int i, int j) {

	}

	public void createNewGame(CreateNewGameCallback onResult) {
		try {
			// Create URL object
			URL url = new URL(URL_SERVER+"room/getRoom");
			HttpURLConnection conn = (HttpURLConnection) url.openConnection();

			// Set request method
			conn.setRequestMethod("GET");

			// Set headers
			conn.setRequestProperty("Accept", "application/json");

			// Read response
			int status = conn.getResponseCode();
			System.out.println("Response Code: " + status);

			try (BufferedReader br = new BufferedReader(
					new InputStreamReader(conn.getInputStream()))) {
				String line;
				StringBuilder response = new StringBuilder();
				while ((line = br.readLine()) != null) {
					response.append(line).append("\n");
				}
				System.out.println("Response Body:\n" + response);
				Gson gson = new Gson();
				JsonObject jsonObject = gson.fromJson(response.toString(), JsonObject.class);
				String roomNumber = jsonObject.get("roomNumber").getAsString();
				String playerId = jsonObject.get("playerToken").getAsString();
				char type = jsonObject.get("type").getAsCharacter();
				onResult.onResult(roomNumber, playerId, type);
			}

			conn.disconnect();

		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void restartGame(RestartGameCallback onResult) {

	}

	public void joinGame(String RoomNumber, JoinGameCallback onResult) {

	}

	public void rander(RanderCallback onResult) {

	}

	public interface CreateNewGameCallback{
		void onResult(String roomNumber, String playerId, char type);
	}

	public interface RestartGameCallback{
		void onResult();
	}

	public interface JoinGameCallback {
		void onResult(String palyerToken, char type);
	}

	public interface RanderCallback{
		void onResult(char turn, char[][] board, char howWon);
	}
}
