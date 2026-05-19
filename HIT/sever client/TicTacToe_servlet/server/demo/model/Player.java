package org.example.demo.model;

public class Player {

	private final String id;
	private final char type;

	public Player(String id, char type) {
		this.id = id;
		this.type = type;
	}

	public char getType() {
		return type;
	}

	public String getId() {
		return id;
	}
}
