package org.example.demo.servlet;

import com.google.gson.JsonObject;
import org.example.demo.Context;
import org.example.demo.model.Player;
import org.example.demo.model.Room;
import org.example.demo.worker.RoomWorker;

import java.io.*;
import java.util.Arrays;
import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.http.*;
import javax.servlet.annotation.*;

@WebServlet(name = "room", value = "/room/*")
public class RoomServlet extends HttpServlet {

	private RoomWorker roomWorker;

	public void init() {
		roomWorker =  ((Context)super.getServletContext().getAttribute(Context.AUTH)).getRoomWorker();
	}

	@Override
	public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
		String path = request.getRequestURI();
		if(path == null || !path.contains("/room")) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}
		path = path.substring(path.indexOf("/room") + 5);
		if (path.equals("/getRoom")) {
			getRoom(request, response);
		} else if (path.startsWith("/joinRoon")) {
			joinRoon(request, response);
		} else if(path.equals("/endGame")){
			endGame(request, response);
		}else {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
		}
	}



	private void endGame(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
			roomWorker.closeRoom(roomNumber);
			response.setStatus(HttpServletResponse.SC_OK);
		} else {
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED,"not so fast mo jo jo jo");
		}
	}

	public void getRoom(HttpServletRequest request, HttpServletResponse response) throws IOException {
		String roomNumber = roomWorker.createRoom();
		Room room = roomWorker.getRoom(roomNumber);
		Player player1 = room.getPlayers()[0];
		String playerToken = player1.getId();
		char playerType = player1.getType();

		JsonObject object = new JsonObject();
		object.addProperty("roomNumber", roomNumber);
		object.addProperty("playerToken", playerToken);
		object.addProperty("type", playerType);

		response.setContentType("application/json");
		response.getWriter().write(object.toString());
		response.setStatus(HttpServletResponse.SC_OK);
	}

	public void joinRoon(HttpServletRequest request, HttpServletResponse response) throws IOException {
		String roomNumber = request.getParameter("roomNumber");
		if(roomNumber == null) {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST,"missing roomNumber");
			return;
		}
		Room room = roomWorker.getRoom(roomNumber);
		if(room == null) {
			response.sendError(HttpServletResponse.SC_NOT_FOUND,"room not found");
			return;
		}
		if(roomWorker.joinRoom(roomNumber)){
			String playerToken = room.getPlayers()[1].getId();
			char playerType = room.getPlayers()[1].getType();
			JsonObject object = new JsonObject();
			object.addProperty("playerToken", playerToken);
			object.addProperty("type", playerType);
			response.setContentType("application/json");
			response.getWriter().write(object.toString());
			response.setStatus(HttpServletResponse.SC_OK);
		} else {
			response.sendError(HttpServletResponse.SC_BAD_REQUEST,"room is full");
		}
	}

	public void destroy() {
		roomWorker = null;
	}
}