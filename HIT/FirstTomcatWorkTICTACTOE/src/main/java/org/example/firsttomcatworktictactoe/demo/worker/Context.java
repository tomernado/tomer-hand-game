package org.example.firsttomcatworktictactoe.demo.worker;

import org.example.demo.worker.RoomWorker;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

@WebListener
public class Context implements ServletContextListener {
	public static final String AUTH = "org/example/firsttomcatworktictactoe/demo/worker";
	private RoomWorker roomWorker;

	@Override
	public void contextInitialized(ServletContextEvent servletContextEvent) {
		roomWorker = new RoomWorker();
		servletContextEvent.getServletContext().setAttribute(AUTH, this);
	}

	@Override
	public void contextDestroyed(ServletContextEvent servletContextEvent) {
		roomWorker = null;
		servletContextEvent.getServletContext().removeAttribute(AUTH);
	}

	public RoomWorker getRoomWorker() {
		return roomWorker;
	}

}

