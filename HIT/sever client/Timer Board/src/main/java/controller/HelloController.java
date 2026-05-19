package controller;

import javafx.beans.binding.Bindings;
import javafx.beans.binding.BooleanBinding;
import javafx.fxml.FXML;
import javafx.scene.control.*;

import java.util.regex.Pattern;

public class HelloController {

    @FXML private TextField tfUsername, tfEmail;
    @FXML private PasswordField pfPassword, pfConfirm;
    @FXML private Label errUsername, errEmail, errPassword, errConfirm;
    @FXML private CheckBox cbAgree;
    @FXML private Button btnCreate;

    // Regex פשוטים
    private static final Pattern USER_RE  = Pattern.compile("^[A-Za-z0-9]{3,12}$");
    private static final Pattern EMAIL_RE = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    @FXML
    public void initialize() {
        // ולידציה חיה
        tfUsername.textProperty().addListener((o,old,v)-> validateUsername());
        tfEmail.textProperty().addListener((o,old,v)-> validateEmail());
        pfPassword.textProperty().addListener((o,old,v)-> validatePassword());
        pfConfirm.textProperty().addListener((o,old,v)-> validateConfirm());

        // Bindings לכפתור Create
        BooleanBinding usernameOk = Bindings.createBooleanBinding(this::isUsernameValid, tfUsername.textProperty());
        BooleanBinding emailOk    = Bindings.createBooleanBinding(this::isEmailValid, tfEmail.textProperty());
        BooleanBinding passOk     = Bindings.createBooleanBinding(this::isPasswordValid, pfPassword.textProperty());
        BooleanBinding confirmOk  = Bindings.createBooleanBinding(this::isConfirmValid,
                pfPassword.textProperty(), pfConfirm.textProperty());
        BooleanBinding agreeOk    = cbAgree.selectedProperty();

        btnCreate.disableProperty().bind(
                usernameOk.not().or(emailOk.not()).or(passOk.not()).or(confirmOk.not()).or(agreeOk.not())
        );
    }

    // ----- בדיקות -----
    private boolean isUsernameValid() {
        String u = tfUsername.getText();
        return u != null && USER_RE.matcher(u).matches();
    }
    private boolean isEmailValid() {
        String e = tfEmail.getText();
        return e != null && EMAIL_RE.matcher(e).matches();
    }
    private boolean isPasswordValid() {
        String p = pfPassword.getText();
        if (p == null || p.length() < 8) return false;
        boolean hasLetter = p.chars().anyMatch(Character::isLetter);
        boolean hasDigit  = p.chars().anyMatch(Character::isDigit);
        return hasLetter && hasDigit;
    }
    private boolean isConfirmValid() {
        String p = pfPassword.getText();
        String c = pfConfirm.getText();
        return p != null && p.equals(c) && isPasswordValid();
    }

    // ----- הודעות שגיאה -----
    private void validateUsername() { errUsername.setText(isUsernameValid() ? "" : "3–12 letters/digits"); }
    private void validateEmail()    { errEmail.setText(isEmailValid() ? ""   : "Invalid email"); }
    private void validatePassword() {
        errPassword.setText(isPasswordValid() ? "" : "Min 8, include letter & digit");
        validateConfirm();
    }
    private void validateConfirm()  { errConfirm.setText(isConfirmValid() ? "" : "Passwords must match"); }

    // ----- כפתורים -----
    @FXML
    private void onCreate() {
        new Alert(Alert.AlertType.INFORMATION, "Account created (demo).").showAndWait();
    }

    @FXML
    private void onReset() {
        tfUsername.clear();
        tfEmail.clear();
        pfPassword.clear();
        pfConfirm.clear();
        cbAgree.setSelected(false);
        errUsername.setText(""); errEmail.setText(""); errPassword.setText(""); errConfirm.setText("");
    }
}
