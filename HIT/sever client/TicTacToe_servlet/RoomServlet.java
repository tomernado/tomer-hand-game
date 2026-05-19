package org.example.demo;

import java.io.*;
import javax.servlet.http.*;
import javax.servlet.annotation.*;

@WebServlet(name = "room", value = "/room/*")
public class RoomServlet extends HttpServlet {

	public void init() {}

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
		} else {
			response.sendError(HttpServletResponse.SC_NOT_FOUND);
		}
	}

	public void getRoom(HttpServletRequest request, HttpServletResponse response) throws IOException {

	}

	public void joinRoon(HttpServletRequest request, HttpServletResponse response) throws IOException {

	}

	public void destroy() {
	}
}