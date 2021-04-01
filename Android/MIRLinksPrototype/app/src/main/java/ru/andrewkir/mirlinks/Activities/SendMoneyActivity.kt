package ru.andrewkir.mirlinks.Activities

import android.app.Activity
import android.graphics.Color
import android.net.Uri
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import kotlinx.android.synthetic.main.activity_send_money.*
import ru.andrewkir.mirlinks.R
import ru.andrewkir.mirlinks.accountNumber
import ru.andrewkir.mirlinks.Api.ApiClient
import ru.andrewkir.mirlinks.authToken

class SendMoneyActivity : AppCompatActivity() {

    var receiveAccountNumber = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_send_money)

        makeStatusBarTransparent()
        window.decorView.systemUiVisibility =
            window.decorView.systemUiVisibility and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv() //set status text  light

        val data: Uri? = this.intent.data
        var linkId = ""
        if (data != null && data.isHierarchical) {
            val uri = this.intent.dataString

            linkId = uri.toString().split('/').last()

            getLinkInfo(linkId)

        }
        val apiService = ApiClient.instance
        var idempotencyKey = getRandomString(30)

        sendMoneyButton.setOnClickListener {
            if(receiveAccountNumber != accountNumber) {
                var sum = sumField.text.toString().toDoubleOrNull()
                if (receiveAccountNumber != "" && sum != null)
                    apiService.sendMoney(
                        authHeader = authToken,
                        linkId = linkId,
                        accountNumberHeader = accountNumber,
                        receiveAccountNumber = receiveAccountNumber,
                        idempotencyKey = idempotencyKey,
                        sum = sum
                    )
                        .observeOn(AndroidSchedulers.mainThread())
                        .subscribeOn(Schedulers.io())
                        .subscribe({ _ ->
                            Toast.makeText(
                                applicationContext,
                                "Успешно",
                                Toast.LENGTH_SHORT
                            )
                                .show()
                            finish()
                        }, { error ->
                            Toast.makeText(applicationContext, error.message, Toast.LENGTH_SHORT)
                                .show()
                        })
            } else {
                Toast.makeText(this, "Вы не можете совершить перевод самому себе", Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun getLinkInfo(linkId: String) {
        val apiService = ApiClient.instance
        apiService.getLinkInfo(authToken, linkId)
            .observeOn(AndroidSchedulers.mainThread())
            .subscribeOn(Schedulers.io())
            .subscribe({ resInf ->
                PamName.setText(resInf.info.PAM.name)
                if (resInf.info.PAM.accountNumber.length == 20) {
                    receiveAccountNumber = resInf.info.PAM.accountNumber
                    accountNumberField.setText(
                        "${resInf.info.PAM.accountNumber.subSequence(
                            0,
                            4
                        )} ${resInf.info.PAM.accountNumber.subSequence(
                            4,
                            8
                        )} ${resInf.info.PAM.accountNumber.subSequence(
                            8,
                            12
                        )} ${resInf.info.PAM.accountNumber.subSequence(
                            12,
                            16
                        )} ${resInf.info.PAM.accountNumber.subSequence(16, 20)}"
                    )
                }
                if (resInf.info.specifiedSum != null && resInf.info.specifiedSum!! > 0) {
                    sumField.setText(resInf.info.specifiedSum.toString())
                    sumField.isEnabled = false
                } else {
                    sumField.setText("")
                    sumField.isEnabled = true
                }

                if (!resInf.info.message.isNullOrEmpty()) {
                    pamMessage.setText(resInf.info.message)
                }
            }, { error ->
                error.printStackTrace()
                Toast.makeText(applicationContext, error.message, Toast.LENGTH_SHORT).show()
            })
    }

    fun getRandomString(length: Int): String {
        val allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
        return (1..length)
            .map { allowedChars.random() }
            .joinToString("")
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
