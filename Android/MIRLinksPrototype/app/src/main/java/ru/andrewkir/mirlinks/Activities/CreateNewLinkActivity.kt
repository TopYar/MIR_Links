package ru.andrewkir.mirlinks.Activities

import android.app.Activity
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.DatePicker
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson
import com.google.gson.JsonParser
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import kotlinx.android.synthetic.main.activity_create_new_link_view.*
import ru.andrewkir.mirlinks.DataClasses.InfoRoot
import ru.andrewkir.mirlinks.DataClasses.LinkInfo
import ru.andrewkir.mirlinks.DataClasses.PAM
import ru.andrewkir.mirlinks.R
import ru.andrewkir.mirlinks.accountNumber
import ru.andrewkir.mirlinks.Api.ApiClient
import ru.andrewkir.mirlinks.authToken
import ru.andrewkir.mirlinks.name
import java.text.SimpleDateFormat
import java.util.*


class CreateNewLinkActivity : AppCompatActivity(), DatePickerDialog.OnDateSetListener {

    var dateTime: Calendar = Calendar.getInstance()
    var idempotencyKey = ""
    var tmpLink: InfoRoot<LinkInfo>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_new_link_view)

        makeStatusBarTransparent()
        window.decorView.systemUiVisibility =
            window.decorView.systemUiVisibility and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv() //set status text  light

        radioMulti.isChecked = true
        radioInf.isChecked = true

        radioDate.setOnClickListener {
            if (radioDate.isChecked) {
                pickDateTime()
            }
        }

        radioInf.setOnClickListener {
            if (radioInf.isChecked) {
                radioDate.text = "Выбрать дату"
                dateTime.clear()
            }
        }

        createLinkButton.setOnClickListener {
            if (linkNameEditText.text.isBlank()) {
                Toast.makeText(this, "Введите название ссылки", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (publicCheckBox.isActivated && sumLimit.text.isBlank()) {
                Toast.makeText(this, "Введите сумму для сбора", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            createNewLink()
        }

        if (accountNumber.isNotEmpty() && accountNumber.length == 20) {
            accountNumberFieldCreate.setText(
                "${accountNumber.subSequence(0, 4)} ${accountNumber.subSequence(
                    4,
                    8
                )} ${accountNumber.subSequence(8, 12)} ${accountNumber.subSequence(
                    12,
                    16
                )} ${accountNumber.subSequence(16, 20)}"
            )
        }

        publicCheckBox.setOnCheckedChangeListener { _, isChecked ->
            sumLimit.isEnabled = isChecked
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

    private fun createNewLink() {
        val apiService = ApiClient.instance
        var newLink = InfoRoot(
            info = LinkInfo(
                PAM = PAM(
                    name = name,
                    accountNumber = accountNumber
                ),
                linkType = if (radioSingle.isChecked) "one-time" else "perpetual",
                message = if (additionalMessage.text.toString()
                        .isEmpty()
                ) null else additionalMessage.text.toString(),
                specifiedSum = sumDefaultField.text.toString().toDoubleOrNull(),
                expiryDate = if (radioDate.isChecked) SimpleDateFormat("yyyy-MM-dd HH:mm:ss zz").format(
                    dateTime.time
                ) else null,
                linkName = linkNameEditText.text.toString(),
                sumLimit = if (publicCheckBox.isChecked) sumLimit.text.toString()
                    .toDouble() else null
            )
        )
        if (tmpLink != newLink) {
            idempotencyKey = getRandomString(30)
        }
        tmpLink = newLink

        Gson().toJson(newLink)
        JsonParser().parse(Gson().toJson(newLink))
        Log.d("RES", Gson().toJson(newLink))

        apiService.createNewLink(
            authToken,
            accountNumber,
            idempotencyKey,
            JsonParser().parse(Gson().toJson(newLink)).asJsonObject
        )
            .observeOn(AndroidSchedulers.mainThread())
            .subscribeOn(Schedulers.io())
            .subscribe({ res ->
                val clipboard: ClipboardManager =
                    getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText(
                    "link",
                    "https://yar.cx/links/" + res.get("info").asJsonObject.get("linkId").asString.replace(
                        "\"",
                        ""
                    )
                )
                Toast.makeText(this, "Ссылка скопирована в буфер обмена", Toast.LENGTH_SHORT).show()
                clipboard.setPrimaryClip(clip)
                finish()
            }, { error ->
                Toast.makeText(applicationContext, error.message, Toast.LENGTH_SHORT).show()
            })
    }

    override fun onDateSet(p0: DatePicker?, p1: Int, p2: Int, p3: Int) {
        Toast.makeText(this, p1, Toast.LENGTH_SHORT).show()
    }

    private fun getRandomString(length: Int): String {
        val allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz0123456789"
        return (1..length)
            .map { allowedChars.random() }
            .joinToString("")
    }

    private fun pickDateTime() {
        val currentDateTime = Calendar.getInstance()
        val startYear = currentDateTime.get(Calendar.YEAR)
        val startMonth = currentDateTime.get(Calendar.MONTH)
        val startDay = currentDateTime.get(Calendar.DAY_OF_MONTH)
        val startHour = currentDateTime.get(Calendar.HOUR_OF_DAY)
        val startMinute = currentDateTime.get(Calendar.MINUTE)

        val datePicker =
            DatePickerDialog(this, DatePickerDialog.OnDateSetListener { _, year, month, day ->
                val timePicker =
                    TimePickerDialog(this, TimePickerDialog.OnTimeSetListener { _, hour, minute ->
                        dateTime = Calendar.getInstance()
                        dateTime.set(year, month, day, hour, minute)
                        val format = SimpleDateFormat("'до 'yyyy.MM.dd 'в' HH:mm")
                        radioDate.text = format.format(dateTime.time)


                        if (dateTime.timeInMillis < Calendar.getInstance().timeInMillis) {
                            Toast.makeText(this, "Ошибка в дате", Toast.LENGTH_SHORT).show()
                            radioInf.performClick()
                        }
                    }, startHour, startMinute, false)
                timePicker.setOnCancelListener {
                    radioInf.isChecked = true
                }
                timePicker.show()
            }, startYear, startMonth, startDay)
        datePicker.setOnCancelListener {
            radioInf.isChecked = true
        }
        datePicker.show()
    }
}
