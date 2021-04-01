package ru.andrewkir.mirlinks.Activities

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.preference.PreferenceManager
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import com.google.gson.JsonParser
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import kotlinx.android.synthetic.main.activity_login.*
import org.json.JSONObject
import ru.andrewkir.mirlinks.MainActivity
import ru.andrewkir.mirlinks.R
import ru.andrewkir.mirlinks.Api.ApiAuth

class LoginActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        makeStatusBarTransparent()

        loginButton.setOnClickListener {
            if (username.text.isNotEmpty() && password.text.isNotEmpty()) {
                toggleInputsAndButtons(false)
                val apiService = ApiAuth.instance
                var loginData = JSONObject()
                loginData.put("username", username.text.toString())
                loginData.put("password", password.text.toString())
                apiService.login(JsonParser().parse(loginData.toString()).asJsonObject)
                    .observeOn(AndroidSchedulers.mainThread())
                    .subscribeOn(Schedulers.io())
                    .subscribe({ res ->
                        toggleInputsAndButtons(true)
                        val sharedPref = PreferenceManager.getDefaultSharedPreferences(this)
                        with(sharedPref.edit()) {
                            putString("authToken", res.authToken)
                            putString("accountNumber", res.accountNumber)
                            putString("name", res.name)
                            apply()
                            startMain()
                            finish()
                        }
                    }, { error ->
                        toggleInputsAndButtons(true)
                        when (error.message) {
                            "HTTP 404 Not Found" ->
                                Toast.makeText(applicationContext, "Данный логин не существует", Toast.LENGTH_SHORT).show()
                            "HTTP 401 Unauthorized" ->
                                Toast.makeText(applicationContext, "Введен неверный пароль", Toast.LENGTH_SHORT).show()
                            else -> Toast.makeText(applicationContext, error.message, Toast.LENGTH_SHORT).show()
                        }
                    })
            } else {
                Toast.makeText(this, "Введите логин и пароль", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun toggleInputsAndButtons(toggle: Boolean) {
        progressBar.visibility = if (!toggle) View.VISIBLE else View.GONE
        username.isEnabled = toggle
        password.isEnabled = toggle
    }

    private fun startMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
    }

    fun Activity.makeStatusBarTransparent() {
        window.apply {
            clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
            addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            statusBarColor = Color.TRANSPARENT
        }
    }
}