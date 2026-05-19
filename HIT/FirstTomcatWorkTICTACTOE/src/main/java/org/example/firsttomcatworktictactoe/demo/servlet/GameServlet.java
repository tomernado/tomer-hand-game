package org.example.firsttomcatworktictactoe.demo.servlet;

import org.example.demo.Context;
import org.example.demo.model.Player;
import org.example.demo.model.Room;
import org.example.demo.worker.RoomWorker;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Arrays;

@WebServlet(name = "game", value = "/game/*")
public class GameServlet extends HttpServlet {

	private RoomWorker roomWorker;

	public void init() {
		roomWorker =  ((Context)super.getServletContext().getAttribute(Context.AUTH)).getRoomWorker();
	}

	public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		String path = request.getRequestURI();
		if(path == null || !path.contains("/game")) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}
		path = path.substring(path.indexOf("/game") + 5);
		 if(path.equals("/state")) {
			 state(request, response);
		 } else if(path.equals("/turn")){
			 turn(request, response);
		 } else if(path.equals("/newGame")){
			 newGame(request, response);
		 } else {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
		}
	}

	private void newGame(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		String roomNumber = request.getParameter("roomNumber");
		String playerToken = request.getParameter("playerToken");
		if(roomNumber == null || playerToken == null) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST,"missing roomNumber");
			return;
		}
		Room room = roomWorker.getRoom(roomNumber);
		if(room == null) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND,"room not found");
			return;
		}
		if(Arrays.stream(room.getPlayers()).anyMatch(p -> p.getId().equals(playerToken))){
			room.newGame();
			response.setStatus(HttpServletResponse.SC_OK);
		} else {
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED,"not so fast mo jo jo jo");
		}

	}

	private void turn(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		//i=1&j=2&palyerToken=123&roomNumber=123
		String roomNumber = request.getParameter("roomNumber");
		String playerToken = request.getParameter("playerToken");
		String iString = request.getParameter("i");
		String jString = request.getParameter("j");
		if(roomNumber == null || playerToken == null || iString == null || jString == null) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST,"missing roomNumber");
			return;
		}
		Room room = roomWorker.getRoom(roomNumber);
		if(room == null) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND,"room not found");
			return;
		}
		Player player = Arrays.stream(room.getPlayers()).filter(p -> p.getId().equals(playerToken)).findFirst().orElse(null);
		if(player == null) {
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED,"player not found");
			return;
		} else {
			int i;
			int j;
			try {
				i = Integer.parseInt(iString);
				j = Integer.parseInt(jString);
			} catch (NumberFormatException e) {
				response.sendError(HttpServletResponse.SC_BAD_REQUEST,"invalid i or j");
				return;
			}
			boolean ifSecede = room.getGame().play(player.getType(), i, j);
			if(ifSecede){
				response.setStatus(HttpServletResponse.SC_OK);
			} else {
				response.setStatus(HttpServletResponse.SC_ACCEPTED);
			}

		}
	}

	private void state(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		String roomNumber = request.getParameter("roomNumber");
		String playerToken = request.getParameter("playerToken");
		if(roomNumber == null || playerToken == null) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST,"missing roomNumber");
			return;
		}
		Room room = roomWorker.getRoom(roomNumber);
		if(room == null) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND,"room not found");
			return;
		}
		if(Arrays.stream(room.getPlayers()).anyMatch(p -> p.getId().equals(playerToken))){
			response.getWriter().write(room.getGame().toString());
			response.setStatus(HttpServletResponse.SC_OK);
		} else {
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED,"not so fast mo jo jo jo");
		}
	}

	public void destroy() {
		roomWorker = null;
	}
}
