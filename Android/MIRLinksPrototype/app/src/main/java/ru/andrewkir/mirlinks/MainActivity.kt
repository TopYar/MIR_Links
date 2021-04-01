package ru.andrewkir.mirlinks

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.preference.PreferenceManager
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentActivity
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import kotlinx.android.synthetic.main.activity_main.*
import ru.andrewkir.mirlinks.Activities.CreateNewLinkActivity
import ru.andrewkir.mirlinks.Activities.ExistingLinksActivity
import ru.andrewkir.mirlinks.Activities.LoginActivity
import ru.andrewkir.mirlinks.Activities.QRScannerActivity
import ru.andrewkir.mirlinks.Api.ApiClient

var accountNumber = ""
var authToken = ""
var name = ""

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        getCredentials()
        if (accountNumber == "" || authToken == "") {
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
            finish()
        } else {

            setTitleNumber()

            makeStatusBarTransparent()

            createNewLinkButton.setOnClickListener {
                val intent = Intent(this, CreateNewLinkActivity::class.java)
                startActivity(intent)
            }

            sendMoneyButton.setOnClickListener {
                val intent = Intent(this, QRScannerActivity::class.java)
                startActivity(intent)
            }

            lookThroughExistingButton.setOnClickListener {
                val intent = Intent(this, ExistingLinksActivity::class.java)
                startActivity(intent)
            }

            swiperefresh.setOnRefreshListener {
                getBalance()
            }

            val sharedPref = PreferenceManager.getDefaultSharedPreferences(this)
            logoutButton.setOnClickListener {
                with(sharedPref.edit()) {
                    putString("authToken", "")
                    putString("accountNumber", "")
                    putString("name", "")
                    apply()
                    recreate()
                }
            }
            getBalance()
        }
    }

    private fun Activity.makeStatusBarTransparent() {
        window.apply {
            clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
            addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            statusBarColor = Color.TRANSPARENT
        }
    }


    private fun getBalance() {
        val apiService = ApiClient.instance
        apiService.getBalance(authToken, accountNumber)
            .observeOn(AndroidSchedulers.mainThread())
            .subscribeOn(Schedulers.io())
            .subscribe({ res ->
                balanceField.text = res.get("balance").toString()
                swiperefresh.isRefreshing = false
            }, { error ->
                Toast.makeText(
                    applicationContext,
                    "Ошибка в получении баланса - " + error.message,
                    Toast.LENGTH_SHORT
                ).show()
                swiperefresh.isRefreshing = false
            })
    }

    private fun setTitleNumber() {
        if (accountNumber.isNotEmpty() && accountNumber.length == 20) {
            accountNumberFieldCreate.text =
                "${accountNumber.subSequence(0, 4)} ${accountNumber.subSequence(
                    4,
                    8
                )} ${accountNumber.subSequence(8, 12)} ${accountNumber.subSequence(
                    12,
                    16
                )} ${accountNumber.subSequence(16, 20)}"
        } else {
            accountNumberFieldCreate.text = accountNumber
        }
    }

    private fun getCredentials() {
        val sharedPref = PreferenceManager.getDefaultSharedPreferences(this)
        accountNumber = sharedPref.getString("accountNumber", "")!!
        authToken = sharedPref.getString("authToken", "")!!
    }
}
