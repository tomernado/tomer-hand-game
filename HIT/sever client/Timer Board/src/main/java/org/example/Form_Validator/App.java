package org.example.Form_Validator;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.stage.Stage;

public class App extends Application {
    @Override
    public void start(Stage stage) {
        try {
            // ה־FXML באמת יושב פה (שימו לב לנתיב עם /org/example/Form_Validator)
            var url = App.class.getResource("/org/example/Form_Validator/hello-view.fxml");
            System.out.println("FXML URL = " + url); // חייב להיות not-null

            Parent root = new FXMLLoader(url).load();
            Scene scene = new Scene(root, 520, 360);
            stage.setTitle("Form Validator");
            stage.setScene(scene);
            stage.show();
        } catch (Exception ex) {
            ex.printStackTrace();
            new Alert(Alert.AlertType.ERROR, ex.toString()).showAndWait();
        }
    }

    public static void main(String[] args) { launch(args); }
}
